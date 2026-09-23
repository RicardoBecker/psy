import { UnauthorizedException } from '@nestjs/common';
import { SocialAuthService } from './social-auth.service';
import { AuthProvider } from '../../common/types/auth.types';
import { VerifiedSocialProfile } from './providers/social-profile';

describe('SocialAuthService — resolving a verified profile to a local user (KAN-15/KAN-16)', () => {
  let service: SocialAuthService;
  let prisma: { socialIdentity: { findUnique: jest.Mock; create: jest.Mock } };
  let usersService: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    createFromSocialProfile: jest.Mock;
  };

  const profile: VerifiedSocialProfile = {
    provider: AuthProvider.GOOGLE,
    providerUserId: 'google-sub-123',
    email: 'pessoa@example.com',
    emailVerified: true,
    name: 'Pessoa Exemplo',
  };

  beforeEach(() => {
    prisma = { socialIdentity: { findUnique: jest.fn(), create: jest.fn() } };
    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createFromSocialProfile: jest.fn(),
    };
    service = new SocialAuthService(prisma as any, usersService as any);
  });

  it('returns the linked user when the (provider, providerUserId) identity already exists', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
    usersService.findById.mockResolvedValue({ id: 'user-1', isActive: true, email: profile.email });

    const result = await service.resolveOrCreateUser(profile);

    expect(result).toEqual({ id: 'user-1', isActive: true, email: profile.email });
    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(usersService.createFromSocialProfile).not.toHaveBeenCalled();
  });

  it('rejects when the identity exists but points to a deactivated user', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
    usersService.findById.mockResolvedValue({ id: 'user-1', isActive: false });

    await expect(service.resolveOrCreateUser(profile)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('links to an existing local account by email only because the provider verified the email', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: profile.email,
      passwordHash: 'hash-de-uma-senha-local-preexistente',
      isActive: true,
    });

    const result = await service.resolveOrCreateUser(profile);

    expect(prisma.socialIdentity.create).toHaveBeenCalledWith({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        userId: 'user-2',
      },
    });
    // 🔒 a senha local não vaza para o objeto retornado (vira parte do JWT/response)
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe('user-2');
  });

  it('refuses to link to an existing account when the provider did NOT verify the email (prevents account takeover)', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: profile.email, isActive: true });

    await expect(
      service.resolveOrCreateUser({ ...profile, emailVerified: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });

  it('rejects when the matching local account by email is deactivated', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: profile.email, isActive: false });

    await expect(service.resolveOrCreateUser(profile)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });

  it('creates a brand-new user (and links the identity) when nothing matches yet', async () => {
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createFromSocialProfile.mockResolvedValue({
      id: 'user-3',
      email: profile.email,
      role: 'PATIENT',
    });

    const result = await service.resolveOrCreateUser(profile);

    expect(usersService.createFromSocialProfile).toHaveBeenCalledWith({
      email: profile.email,
      name: profile.name,
    });
    expect(prisma.socialIdentity.create).toHaveBeenCalledWith({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        userId: 'user-3',
      },
    });
    expect(result.id).toBe('user-3');
  });
});
