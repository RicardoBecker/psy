/**
 * KAN-156 (P2, re-review PR #19): prova de concorrência REAL contra
 * PostgreSQL — o finding explícito era que os testes anteriores (mocks
 * isolados de `$transaction`) provavam só que a chamada foi feita, nunca
 * que a operação é segura sob execução concorrente de verdade. Este
 * arquivo roda duas (e depois cinco) chamadas genuinamente simultâneas de
 * `PasswordResetService.createTokenForUser` para o MESMO usuário, sem
 * nenhum mock, contra um PostgreSQL 16 descartável — mesmo padrão de
 * `src/test-utils/disposable-postgres.ts` já usado pelos rehearsals de
 * migration (CR-03.1/CR-03.2).
 *
 * Cenário de aceite do finding: "duas transações simultâneas, quando não
 * existe token anterior, podem executar deleteMany = 0 e depois inserir
 * hashes distintos [...] resultando em duas linhas válidas". Este teste
 * prova que isso não acontece mais: no máximo UMA linha sobrevive, e no
 * máximo UM dos tokens brutos gerados é consumível.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { dbUrl, runSqlFile, createDatabase, dropDatabase } from '../../test-utils/disposable-postgres';
import { PasswordResetService } from './password-reset.service';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../prisma/migrations');

function listMigrations(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => fs.statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
    .sort();
}

const DB_NAME = `kan156_concurrency_${Date.now()}`;

describe('PasswordResetService.createTokenForUser — concorrência real contra PostgreSQL (KAN-156, P2)', () => {
  jest.setTimeout(30_000);

  let prisma: PrismaClient;
  let service: PasswordResetService;
  let userId: string;

  beforeAll(async () => {
    await createDatabase(DB_NAME);
    for (const migration of listMigrations()) {
      runSqlFile(DB_NAME, path.join(MIGRATIONS_DIR, migration, 'migration.sql'));
    }

    prisma = new PrismaClient({ datasources: { db: { url: dbUrl(DB_NAME) } } });
    await prisma.$connect();
    service = new PasswordResetService(prisma as any);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await dropDatabase(DB_NAME);
  });

  beforeEach(async () => {
    userId = `user-${Math.random().toString(36).slice(2)}`;
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Fixture Concorrência',
        email: `${userId}@example.com`,
        passwordHash: 'x',
      },
    });
  });

  it('duas solicitações genuinamente concorrentes, sem token prévio, resultam em UMA única linha no banco', async () => {
    const [tokenA, tokenB] = await Promise.all([
      service.createTokenForUser(userId),
      service.createTokenForUser(userId),
    ]);

    expect(tokenA).not.toEqual(tokenB);

    const rows = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
  });

  it('das duas requisições concorrentes, só o token que efetivamente ficou gravado é consumível — o outro é rejeitado', async () => {
    const [tokenA, tokenB] = await Promise.all([
      service.createTokenForUser(userId),
      service.createTokenForUser(userId),
    ]);

    // Consome os dois tokens brutos gerados pelas chamadas concorrentes.
    // No máximo um bate com a linha que sobreviveu no banco — o outro,
    // cujo hash foi sobrescrito pelo upsert que "ganhou" a corrida, não
    // encontra nenhuma linha (updateMany afeta 0) e é rejeitado.
    const resultA = await service.consumeTokenAndUpdatePassword(tokenA, 'nova-senha-hash-A');
    const resultB = await service.consumeTokenAndUpdatePassword(tokenB, 'nova-senha-hash-B');

    // Exatamente um dos dois foi aceito (o que corresponde à linha que
    // sobreviveu no banco); o outro, cujo hash foi sobrescrito pelo
    // upsert concorrente, não bate com nenhuma linha e é rejeitado.
    const results = [resultA, resultB];
    const accepted = results.filter((r) => r !== null);
    const rejected = results.filter((r) => r === null);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  // Reforça a prova acima com cardinalidade maior — 5 chamadas concorrentes
  // para o mesmo usuário devem convergir para a mesma garantia (nunca mais
  // de uma linha), não só no caso trivial de duas.
  it('cinco solicitações concorrentes para o mesmo usuário também convergem para UMA única linha', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 5 }, () => service.createTokenForUser(userId)),
    );

    expect(new Set(tokens).size).toBe(5); // todos os tokens brutos gerados são distintos

    const rows = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);

    const consumptions = await Promise.all(
      tokens.map((t) => service.consumeTokenAndUpdatePassword(t, `hash-${t.slice(0, 8)}`)),
    );
    const accepted = consumptions.filter((r) => r !== null);
    expect(accepted).toHaveLength(1);
  });

  it('uma nova solicitação concorrente quando JÁ existe um token anterior também preserva a garantia de uma única linha', async () => {
    await service.createTokenForUser(userId); // token prévio, já existente

    const [tokenA, tokenB] = await Promise.all([
      service.createTokenForUser(userId),
      service.createTokenForUser(userId),
    ]);

    const rows = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);

    const [resultA, resultB] = await Promise.all([
      service.consumeTokenAndUpdatePassword(tokenA, 'hash-A'),
      service.consumeTokenAndUpdatePassword(tokenB, 'hash-B'),
    ]);
    const accepted = [resultA, resultB].filter((r) => r !== null);
    expect(accepted).toHaveLength(1);
  });
});
