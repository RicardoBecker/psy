/**
 * Rehearsal da migration 20260407142459_update_emotional_checkin_fields
 * contra um PostgreSQL 16 descartável (CR-03.1). Requer um Postgres
 * alcançável — por padrão o mesmo usado por devOps/docker-compose.yml
 * (postgres/postgres@localhost:5432). Sobrescreva com
 * TEST_DATABASE_ADMIN_URL se precisar apontar para outro host.
 *
 * Prova, com dados reais no banco (não só leitura estática do SQL):
 *   - a migration roda do zero em banco vazio;
 *   - a migration roda sobre a migration anterior com registros existentes;
 *   - nenhuma linha é perdida no processo;
 *   - os valores são copiados conforme o mapeamento aprovado
 *     (mood→moodScore, energy→energyLevel, stress→anxietyLevel).
 */
import { Client } from 'pg';
import * as path from 'path';
import { dbUrl, runSqlFile, createDatabase, dropDatabase } from '../test-utils/disposable-postgres';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');
const INIT_SQL = path.join(MIGRATIONS_DIR, '20260402131453_init', 'migration.sql');
const RBAC_SQL = path.join(MIGRATIONS_DIR, '20260406152705_add_rbac_and_profiles', 'migration.sql');
const TARGET_SQL = path.join(
  MIGRATIONS_DIR,
  '20260407142459_update_emotional_checkin_fields',
  'migration.sql',
);

const suffix = Date.now();
const POPULATED_DB = `cr031_populated_${suffix}`;
const EMPTY_DB = `cr031_empty_${suffix}`;

describe('Migration 20260407142459_update_emotional_checkin_fields (CR-03.1)', () => {
  jest.setTimeout(30_000);

  afterAll(async () => {
    await dropDatabase(POPULATED_DB);
    await dropDatabase(EMPTY_DB);
  });

  it('runs cleanly from scratch on an empty database', async () => {
    await createDatabase(EMPTY_DB);
    runSqlFile(EMPTY_DB, INIT_SQL);
    runSqlFile(EMPTY_DB, RBAC_SQL);

    expect(() => runSqlFile(EMPTY_DB, TARGET_SQL)).not.toThrow();
  });

  it('preserves existing check-in rows and maps values when run over populated data', async () => {
    await createDatabase(POPULATED_DB);
    runSqlFile(POPULATED_DB, INIT_SQL);
    runSqlFile(POPULATED_DB, RBAC_SQL);

    const client = new Client({ connectionString: dbUrl(POPULATED_DB) });
    await client.connect();

    try {
      await client.query(
        `INSERT INTO "users" (id, name, email, password_hash) VALUES ('u1', 'Fixture User', 'fixture@example.com', 'x')`,
      );

      const fixtureRows = [
        { id: 'c1', mood: 8, energy: 6, stress: 3 },
        { id: 'c2', mood: 2, energy: 9, stress: 10 },
        { id: 'c3', mood: 5, energy: 5, stress: 5 },
      ];

      for (const row of fixtureRows) {
        await client.query(
          `INSERT INTO "emotional_checkins" (id, user_id, mood, energy, stress) VALUES ($1, 'u1', $2, $3, $4)`,
          [row.id, row.mood, row.energy, row.stress],
        );
      }

      // roda a migration alvo sobre o banco já populado com o schema antigo
      runSqlFile(POPULATED_DB, TARGET_SQL);

      const { rows } = await client.query(
        `SELECT id, "moodScore", "energyLevel", "anxietyLevel" FROM "emotional_checkins" ORDER BY id`,
      );

      expect(rows).toHaveLength(fixtureRows.length);
      for (const [i, expected] of fixtureRows.entries()) {
        expect(rows[i].id).toBe(expected.id);
        expect(rows[i].moodScore).toBe(expected.mood);
        expect(rows[i].energyLevel).toBe(expected.energy);
        expect(rows[i].anxietyLevel).toBe(expected.stress); // stress → anxietyLevel
      }

      // colunas antigas realmente sumiram
      const columns = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'emotional_checkins'`,
      );
      const columnNames = columns.rows.map((r) => r.column_name);
      expect(columnNames).not.toEqual(expect.arrayContaining(['mood', 'energy', 'stress']));
      expect(columnNames).toEqual(
        expect.arrayContaining(['moodScore', 'energyLevel', 'anxietyLevel']),
      );
    } finally {
      await client.end();
    }
  });
});
