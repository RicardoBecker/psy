/**
 * Rehearsal PERMANENTE de schema evolution contra PostgreSQL 16 real e
 * descartável (CR-03.2). Diferente de checkin-fields-migration.e2e.spec.ts
 * (que valida uma migration específica e histórica), este teste é genérico:
 * lê a pasta prisma/migrations dinamicamente, então continua protegendo
 * contra migrations destrutivas à medida que novas forem adicionadas — não
 * precisa ser atualizado a cada nova migration.
 *
 * Estratégia: aplica todas as migrations menos a mais recente, popula uma
 * fixture sintética cobrindo cada entidade principal do domínio (usuário,
 * psicólogo com perfil, tutor/menor, check-in, diário, vínculo
 * psicólogo-paciente, registro de consentimento), aplica a migration mais
 * recente por cima, e verifica que nada foi perdido nem quebrou.
 *
 * Requer um Postgres alcançável — ver src/test-utils/disposable-postgres.ts.
 */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { dbUrl, runSqlFile, createDatabase, dropDatabase } from '../test-utils/disposable-postgres';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');

function listMigrations(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => fs.statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
    .sort(); // nomes de pasta são prefixados por timestamp — ordem alfabética == cronológica
}

async function countRows(client: Client, table: string): Promise<number> {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
  return rows[0].count;
}

const TABLES = [
  'users',
  'emotional_checkins',
  'journal_entries',
  'psychologist_profiles',
  'patient_psychologist_links',
  'guardian_relationships',
  'consent_records',
];

const suffix = Date.now();
const POPULATED_DB = `cr032_populated_${suffix}`;
const EMPTY_DB = `cr032_empty_${suffix}`;

describe('Integridade de todas as migrations com banco populado (CR-03.2)', () => {
  jest.setTimeout(30_000);

  const migrations = listMigrations();

  afterAll(async () => {
    await dropDatabase(POPULATED_DB);
    await dropDatabase(EMPTY_DB);
  });

  it('existe mais de uma migration para este teste fazer sentido', () => {
    expect(migrations.length).toBeGreaterThan(1);
  });

  it('aplica todas as migrations em sequência do zero em banco vazio, sem erro', async () => {
    await createDatabase(EMPTY_DB);
    for (const migration of migrations) {
      const sqlFile = path.join(MIGRATIONS_DIR, migration, 'migration.sql');
      expect(() => runSqlFile(EMPTY_DB, sqlFile)).not.toThrow();
    }
  });

  it('preserva todos os dados e relacionamentos ao aplicar a migration mais recente sobre um banco populado', async () => {
    const priorMigrations = migrations.slice(0, -1);
    const latestMigration = migrations[migrations.length - 1];

    await createDatabase(POPULATED_DB);
    for (const migration of priorMigrations) {
      runSqlFile(POPULATED_DB, path.join(MIGRATIONS_DIR, migration, 'migration.sql'));
    }

    const client = new Client({ connectionString: dbUrl(POPULATED_DB) });
    await client.connect();

    try {
      // 🧪 Fixture sintética — dados fictícios, sem qualquer informação real
      await client.query(`
        INSERT INTO "users" (id, name, email, password_hash, role, "ageGroup", is_active) VALUES
          ('fixture-patient', 'Paciente Fixture', 'patient-fixture@example.com', 'x', 'PATIENT', 'ADULT', true),
          ('fixture-psychologist', 'Psicólogo Fixture', 'psych-fixture@example.com', 'x', 'PSYCHOLOGIST', 'ADULT', true),
          ('fixture-guardian', 'Tutor Fixture', 'guardian-fixture@example.com', 'x', 'GUARDIAN', 'ADULT', true),
          ('fixture-minor', 'Menor Fixture', 'minor-fixture@example.com', 'x', 'PATIENT', 'CHILD', true)
      `);

      await client.query(
        `INSERT INTO "emotional_checkins" (id, user_id, mood, energy, stress) VALUES ('fixture-checkin', 'fixture-patient', 7, 6, 4)`,
      );

      await client.query(
        `INSERT INTO "journal_entries" (id, user_id, title, content, updated_at) VALUES ('fixture-journal', 'fixture-patient', 'Título fixture', 'Conteúdo fixture', now())`,
      );

      await client.query(
        `INSERT INTO "psychologist_profiles" (id, user_id, specialties, verified) VALUES ('fixture-profile', 'fixture-psychologist', ARRAY['Ansiedade'], true)`,
      );

      await client.query(
        `INSERT INTO "patient_psychologist_links" (id, patient_id, psychologist_id, consent_status) VALUES ('fixture-link', 'fixture-patient', 'fixture-psychologist', 'APPROVED')`,
      );

      await client.query(
        `INSERT INTO "guardian_relationships" (id, minor_user_id, guardian_user_id, relationship_type, consent_status) VALUES ('fixture-relationship', 'fixture-minor', 'fixture-guardian', 'parent', 'APPROVED')`,
      );

      await client.query(
        `INSERT INTO "consent_records" (id, user_id, guardian_user_id, consent_type, status) VALUES ('fixture-consent', 'fixture-minor', 'fixture-guardian', 'data_processing', 'ACTIVE')`,
      );

      const countsBefore: Record<string, number> = {};
      for (const table of TABLES) countsBefore[table] = await countRows(client, table);

      // aplica a migration mais recente por cima do banco já populado
      runSqlFile(POPULATED_DB, path.join(MIGRATIONS_DIR, latestMigration, 'migration.sql'));

      const countsAfter: Record<string, number> = {};
      for (const table of TABLES) countsAfter[table] = await countRows(client, table);

      expect(countsAfter).toEqual(countsBefore);
      // nenhuma tabela ficou vazia por engano (garante que a fixture "pegou")
      for (const table of TABLES) expect(countsAfter[table]).toBeGreaterThan(0);

      // relacionamentos (joins) continuam resolvendo — nenhuma FK quebrou
      const journalJoin = await client.query(
        `SELECT j.id FROM journal_entries j JOIN users u ON u.id = j.user_id WHERE j.id = 'fixture-journal'`,
      );
      expect(journalJoin.rows).toHaveLength(1);

      const profileJoin = await client.query(
        `SELECT p.id FROM psychologist_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = 'fixture-profile'`,
      );
      expect(profileJoin.rows).toHaveLength(1);

      const linkJoin = await client.query(
        `SELECT l.id FROM patient_psychologist_links l
           JOIN users pa ON pa.id = l.patient_id
           JOIN users ps ON ps.id = l.psychologist_id
         WHERE l.id = 'fixture-link'`,
      );
      expect(linkJoin.rows).toHaveLength(1);

      const relationshipJoin = await client.query(
        `SELECT r.id FROM guardian_relationships r
           JOIN users m ON m.id = r.minor_user_id
           JOIN users g ON g.id = r.guardian_user_id
         WHERE r.id = 'fixture-relationship'`,
      );
      expect(relationshipJoin.rows).toHaveLength(1);

      const consentJoin = await client.query(
        `SELECT c.id FROM consent_records c
           JOIN users u ON u.id = c.user_id
           JOIN users g ON g.id = c.guardian_user_id
         WHERE c.id = 'fixture-consent'`,
      );
      expect(consentJoin.rows).toHaveLength(1);

      // check-in migrado corretamente (mesmo mapeamento validado em CR-03.1)
      const checkinRow = await client.query(
        `SELECT "moodScore", "energyLevel", "anxietyLevel" FROM emotional_checkins WHERE id = 'fixture-checkin'`,
      );
      expect(checkinRow.rows[0]).toEqual({ moodScore: 7, energyLevel: 6, anxietyLevel: 4 });

      // nenhum campo obrigatório ficou nulo após a migration
      const nullCheck = await client.query(
        `SELECT COUNT(*)::int AS count FROM emotional_checkins
          WHERE "moodScore" IS NULL OR "energyLevel" IS NULL OR "anxietyLevel" IS NULL`,
      );
      expect(nullCheck.rows[0].count).toBe(0);
    } finally {
      await client.end();
    }
  });
});
