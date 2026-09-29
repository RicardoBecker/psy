import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetService — single-use, short-lived tokens; only the hash is ever stored (KAN-17/KAN-156)', () => {
  let service: PasswordResetService;
  let prisma: {
    passwordResetToken: {
      upsert: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
    user: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      passwordResetToken: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: { update: jest.fn() },
    } as any;
    // consumeTokenAndUpdatePassword ainda usa $transaction (callback) —
    // createTokenForUser não usa mais (ver describe abaixo).
    prisma.$transaction = jest.fn().mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') return (arg as (tx: typeof prisma) => unknown)(prisma);
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new PasswordResetService(prisma as any);
  });

  // 🔒 KAN-156 (P2, re-review PR #19): estes testes (mocks) provam só a
  // FORMA da chamada ao Prisma — não provam segurança sob concorrência
  // real, que é o que o finding original cobrava ("mocks isolados não
  // comprovam o critério"). A prova de concorrência real está em
  // password-reset-concurrency.e2e.spec.ts, contra PostgreSQL de verdade.
  describe('createTokenForUser', () => {
    it('persists only the SHA-256 hash of the raw token it returns, never the raw value', async () => {
      const rawToken = await service.createTokenForUser('user-1');

      expect(rawToken).toMatch(/^[0-9a-f]{64}$/); // 32 bytes em hex
      expect(prisma.passwordResetToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({ userId: 'user-1', tokenHash: sha256(rawToken) }),
          update: expect.objectContaining({ tokenHash: sha256(rawToken) }),
        }),
      );
    });

    it('sets an expiry roughly 30 minutes in the future', async () => {
      const before = Date.now();
      await service.createTokenForUser('user-1');
      const after = Date.now();

      const { create, update } = prisma.passwordResetToken.upsert.mock.calls[0][0];
      for (const { expiresAt } of [create, update]) {
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
        expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 31 * 60 * 1000);
      }
    });

    // 🔒 userId é @unique no schema (ver prisma/schema.prisma) — upsert é
    // UM único statement atômico (INSERT ... ON CONFLICT DO UPDATE no
    // Postgres), não duas operações separadas como o delete+create
    // anterior. `update` também limpa `usedAt` — reemitir um token para
    // quem já tinha um token USADO (usedAt preenchido) precisa deixar a
    // linha ativa de novo, não continuar marcada como consumida.
    it('upserts by userId in a single call, clearing usedAt on the update branch', async () => {
      await service.createTokenForUser('user-1');

      expect(prisma.passwordResetToken.upsert).toHaveBeenCalledTimes(1);
      const [args] = prisma.passwordResetToken.upsert.mock.calls[0];
      expect(args.where).toEqual({ userId: 'user-1' });
      expect(args.update.usedAt).toBeNull();
    });
  });

  describe('consumeTokenAndUpdatePassword', () => {
    it('marks a valid, unexpired, unused token as used AND updates the password, atomically', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetToken.findUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await service.consumeTokenAndUpdatePassword('token-valido', 'hash-ja-calculado');

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: sha256('token-valido'),
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'hash-ja-calculado', passwordChangedAt: expect.any(Date) },
      });
      expect(result).toEqual({ userId: 'user-1' });
    });

    it('runs the token update and the password update inside a single $transaction call', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetToken.findUnique.mockResolvedValue({ userId: 'user-1' });

      await service.consumeTokenAndUpdatePassword('token-valido', 'hash-ja-calculado');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const [arg] = prisma.$transaction.mock.calls[0];
      expect(typeof arg).toBe('function');
    });

    it('returns null when no matching unused/unexpired token exists (also covers reuse of an already-used token), and never touches the password', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.consumeTokenAndUpdatePassword(
        'token-invalido-ou-ja-usado',
        'hash-ja-calculado',
      );

      expect(result).toBeNull();
      expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // 🔒 Code review PR #19 (KAN-156, P2): se a atualização da senha falhar,
    // a operação inteira precisa propagar o erro (nunca "sucesso parcial"
    // com o token já queimado e a senha intacta) — é a transação do Prisma
    // quem garante o rollback de verdade contra o Postgres; aqui provamos
    // que o service não engole essa falha nem retorna sucesso indevido.
    it('propagates a failure instead of reporting success when the password update fails', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetToken.findUnique.mockResolvedValue({ userId: 'user-1' });
      prisma.user.update.mockRejectedValue(new Error('conexão com o banco caiu'));

      await expect(
        service.consumeTokenAndUpdatePassword('token-valido', 'hash-ja-calculado'),
      ).rejects.toThrow('conexão com o banco caiu');
    });
  });
});
