import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SocialAuthService } from './social-auth.service';
import { AuthProvider } from '../../common/types/auth.types';
import { VerifiedSocialProfile } from './providers/social-profile';

function uniqueViolation(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '5.22.0',
    meta: { target },
  });
}

describe('SocialAuthService — resolving a verified profile to a local user (KAN-15/KAN-16)', () => {
  let service: SocialAuthService;
  let prisma: {
    socialIdentity: { findUnique: jest.Mock; create: jest.Mock };
    user: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let usersService: { findById: jest.Mock; findByEmail: jest.Mock };
  let tx: { user: { create: jest.Mock }; socialIdentity: { create: jest.Mock } };

  const profile: VerifiedSocialProfile = {
    provider: AuthProvider.GOOGLE,
    providerUserId: 'google-sub-123',
    email: 'Pessoa@Example.com',
    emailVerified: true,
    name: 'Pessoa Exemplo',
  };
  const normalizedEmail = 'pessoa@example.com';

  beforeEach(() => {
    tx = {
      user: { create: jest.fn() },
      socialIdentity: { create: jest.fn() },
    };
    prisma = {
      socialIdentity: { findUnique: jest.fn(), create: jest.fn() },
      user: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    };
    usersService = { findById: jest.fn(), findByEmail: jest.fn() };
    service = new SocialAuthService(prisma as any, usersService as any);
  });

  it('returns the linked user when the (provider, providerUserId) identity already exists', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
    usersService.findById.mockResolvedValue({ id: 'user-1', isActive: true, email: normalizedEmail });

    const result = await service.resolveOrCreateUser(profile);

    expect(result).toEqual({ id: 'user-1', isActive: true, email: normalizedEmail });
    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });

  it('rejects when the identity exists but points to a deactivated user', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
    usersService.findById.mockResolvedValue({ id: 'user-1', isActive: false });

    await expect(service.resolveOrCreateUser(profile)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('links to an existing local account by NORMALIZED email, even when the token email has different casing', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: normalizedEmail,
      passwordHash: 'hash-de-uma-senha-local-preexistente',
      isActive: true,
    });

    const result = await service.resolveOrCreateUser(profile);

    expect(usersService.findByEmail).toHaveBeenCalledWith(normalizedEmail);
    expect(prisma.socialIdentity.create).toHaveBeenCalledWith({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: normalizedEmail,
        userId: 'user-2',
      },
    });
    // 🔒 a senha local não vaza para o objeto retornado (vira parte do JWT/response)
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe('user-2');
  });

  it('refuses to link to an existing account when the provider did NOT verify the email (prevents account takeover)', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: normalizedEmail, isActive: true });

    await expect(
      service.resolveOrCreateUser({ ...profile, emailVerified: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });

  it('rejects when the matching local account by email is deactivated', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: normalizedEmail, isActive: false });

    await expect(service.resolveOrCreateUser(profile)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });

  it('creates a brand-new user (and links the identity) atomically, inside a single transaction', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: 'user-3', email: normalizedEmail, role: 'PATIENT' });

    const result = await service.resolveOrCreateUser(profile);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: normalizedEmail, role: 'PATIENT', passwordHash: null }),
      }),
    );
    expect(tx.socialIdentity.create).toHaveBeenCalledWith({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: normalizedEmail,
        userId: 'user-3',
      },
    });
    expect(result.id).toBe('user-3');
  });

  // 🔒 Code review PR #17 (KAN-157, P2): duas conclusões simultâneas do
  // mesmo login social não podem gerar 500 nem estado parcial.
  describe('concurrency: two requests resolving the same profile at once (KAN-157)', () => {
    it('when both try to create the SAME NEW USER (same email), the loser re-reads the winner and links to it', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      usersService.findByEmail
        .mockResolvedValueOnce(null) // primeira leitura: ninguém existe ainda
        .mockResolvedValueOnce({ id: 'user-vencedor', email: normalizedEmail, isActive: true }); // reread pós-conflito

      prisma.$transaction.mockRejectedValue(uniqueViolation(['email']));

      const result = await service.resolveOrCreateUser(profile);

      expect(result.id).toBe('user-vencedor');
      // vincula a identidade à conta vencedora em vez de tentar criar outra
      expect(prisma.socialIdentity.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-vencedor' }) }),
      );
    });

    it('when both try to link the SAME SOCIAL IDENTITY concurrently, the loser re-reads and returns the same user (no 500)', async () => {
      prisma.socialIdentity.findUnique
        .mockResolvedValueOnce(null) // primeira leitura: identidade ainda não existe
        .mockResolvedValueOnce({ userId: 'user-vencedor' }); // reread pós-conflito
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findById.mockResolvedValue({ id: 'user-vencedor', isActive: true });

      prisma.$transaction.mockRejectedValue(
        uniqueViolation(['provider', 'provider_user_id']),
      );

      const result = await service.resolveOrCreateUser(profile);

      expect(result.id).toBe('user-vencedor');
    });

    it('tolerates a concurrent duplicate-identity conflict when linking to an EXISTING account (double click / network retry)', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: normalizedEmail, isActive: true });
      prisma.socialIdentity.create.mockRejectedValue(uniqueViolation(['provider', 'provider_user_id']));

      const result = await service.resolveOrCreateUser(profile);
      expect(result.id).toBe('user-2');
    });

    it('re-throws a unique violation that is unrelated to email/identity (does not swallow unrelated errors)', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      prisma.$transaction.mockRejectedValue(uniqueViolation(['some_other_column']));

      await expect(service.resolveOrCreateUser(profile)).rejects.toBeInstanceOf(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('re-throws a non-Prisma error untouched (does not misinterpret arbitrary errors as a race)', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      prisma.$transaction.mockRejectedValue(new Error('conexão com o banco caiu'));

      await expect(service.resolveOrCreateUser(profile)).rejects.toThrow('conexão com o banco caiu');
    });
  });
});
