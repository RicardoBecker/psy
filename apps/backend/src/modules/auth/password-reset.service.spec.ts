import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetService — single-use, short-lived tokens; only the hash is ever stored (KAN-17/KAN-156)', () => {
  let service: PasswordResetService;
  let prisma: {
    passwordResetToken: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
    user: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: { update: jest.fn() },
    } as any;
    // Mock de $transaction cobre as duas formas usadas pelo service:
    // array de promises (createTokenForUser) e callback (consumeToken...).
    prisma.$transaction = jest.fn().mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') return (arg as (tx: typeof prisma) => unknown)(prisma);
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new PasswordResetService(prisma as any);
  });

  describe('createTokenForUser', () => {
    it('persists only the SHA-256 hash of the raw token it returns, never the raw value', async () => {
      const rawToken = await service.createTokenForUser('user-1');

      expect(rawToken).toMatch(/^[0-9a-f]{64}$/); // 32 bytes em hex
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1', tokenHash: sha256(rawToken) }),
      });
    });

    it('sets an expiry roughly 30 minutes in the future', async () => {
      const before = Date.now();
      await service.createTokenForUser('user-1');
      const after = Date.now();

      const { expiresAt } = prisma.passwordResetToken.create.mock.calls[0][0].data;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 31 * 60 * 1000);
    });

    it('invalidates any previous unused token for the same user before creating a new one', async () => {
      await service.createTokenForUser('user-1');

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', usedAt: null },
      });
    });

    // 🔒 Code review PR #19 (KAN-156, P2): delete + create precisam rodar
    // como uma única transação — nunca um sem o outro.
    it('runs delete + create inside a single $transaction call', async () => {
      await service.createTokenForUser('user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const [args] = prisma.$transaction.mock.calls[0];
      expect(Array.isArray(args)).toBe(true);
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
