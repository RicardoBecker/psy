import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AppleAuthProvider } from './apple.provider';

const jwtVerify = jest.fn();
const createRemoteJWKSet = jest.fn().mockReturnValue('fake-jwks');

jest.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => jwtVerify(...args),
  createRemoteJWKSet: (...args: unknown[]) => createRemoteJWKSet(...args),
}));

describe('AppleAuthProvider — only a signature-verified token yields a profile (KAN-16/CR-01.1)', () => {
  let provider: AppleAuthProvider;
  const configService = { get: jest.fn().mockReturnValue('the-services-id') } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    (configService.get as jest.Mock).mockReturnValue('the-services-id');
    provider = new AppleAuthProvider(configService);
  });

  it('returns a verified profile built only from the payload jose validated (issuer/audience/signature/expiry)', async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: 'apple-sub-123', email: 'pessoa@privaterelay.appleid.com', email_verified: true },
    });

    const profile = await provider.verify('a-real-apple-id-token');

    expect(jwtVerify).toHaveBeenCalledWith('a-real-apple-id-token', 'fake-jwks', {
      issuer: 'https://appleid.apple.com',
      audience: 'the-services-id',
    });
    expect(profile).toEqual({
      provider: 'APPLE',
      providerUserId: 'apple-sub-123',
      email: 'pessoa@privaterelay.appleid.com',
      emailVerified: true,
    });
  });

  it('rejects when jose itself rejects (bad signature, issuer, audience or expiry)', async () => {
    jwtVerify.mockRejectedValue(new Error('signature verification failed'));

    await expect(provider.verify('token-forjado-por-um-atacante')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token whose verified payload is missing sub or email', async () => {
    jwtVerify.mockResolvedValue({ payload: { email_verified: true } });

    await expect(provider.verify('token-sem-sub')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats email_verified as the string "false" from Apple as NOT verified (not truthy-string bug)', async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: 'sub-1', email: 'a@example.com', email_verified: 'false' },
    });

    const profile = await provider.verify('token');

    expect(profile.emailVerified).toBe(false);
  });

  it('accepts email_verified as the string "true" from Apple (known quirk of their token format)', async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: 'sub-1', email: 'a@example.com', email_verified: 'true' },
    });

    const profile = await provider.verify('token');

    expect(profile.emailVerified).toBe(true);
  });

  it('refuses to verify anything when APPLE_CLIENT_ID is not configured, instead of skipping the audience check', async () => {
    (configService.get as jest.Mock).mockReturnValue(undefined);
    provider = new AppleAuthProvider(configService);

    await expect(provider.verify('qualquer-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtVerify).not.toHaveBeenCalled();
  });
});
