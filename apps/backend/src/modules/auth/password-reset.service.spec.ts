import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetService — single-use, short-lived tokens; only the hash is ever stored (KAN-17)', () => {
  let service: PasswordResetService;
  let prisma: {
    passwordResetToken: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
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
  });

  describe('consumeToken', () => {
    it('marks a valid, unexpired, unused token as used and returns the owning userId', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetToken.findUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await service.consumeToken('token-valido');

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: sha256('token-valido'),
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(result).toEqual({ userId: 'user-1' });
    });

    it('returns null when no matching unused/unexpired token exists (also covers reuse of an already-used token)', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.consumeToken('token-invalido-ou-ja-usado');

      expect(result).toBeNull();
      expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
    });
  });
});
