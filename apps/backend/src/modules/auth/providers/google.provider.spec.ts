import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleAuthProvider } from './google.provider';

const verifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken,
  })),
}));

describe('GoogleAuthProvider — only a signature-verified token yields a profile (KAN-15/CR-01.1)', () => {
  let provider: GoogleAuthProvider;
  const configService = { get: jest.fn().mockReturnValue('the-client-id') } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    (configService.get as jest.Mock).mockReturnValue('the-client-id');
    provider = new GoogleAuthProvider(configService);
  });

  it('returns a verified profile built only from the payload the Google library validated', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'pessoa@example.com',
        email_verified: true,
        name: 'Pessoa Exemplo',
      }),
    });

    const profile = await provider.verify('a-real-google-id-token');

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'a-real-google-id-token',
      audience: 'the-client-id',
    });
    expect(profile).toEqual({
      provider: 'GOOGLE',
      providerUserId: 'google-sub-123',
      email: 'pessoa@example.com',
      emailVerified: true,
      name: 'Pessoa Exemplo',
    });
  });

  it('rejects when the Google library itself rejects (bad signature, issuer, audience or expiry)', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong number of segments in token'));

    await expect(provider.verify('token-forjado-por-um-atacante')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token whose verified payload is missing sub or email', async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ email_verified: true }) });

    await expect(provider.verify('token-sem-sub')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats an unset email_verified claim as unverified, never assumes true', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'sub-1', email: 'a@example.com' }),
    });

    const profile = await provider.verify('token');

    expect(profile.emailVerified).toBe(false);
  });

  it('refuses to verify anything when GOOGLE_CLIENT_ID is not configured, instead of skipping the audience check', async () => {
    (configService.get as jest.Mock).mockReturnValue(undefined);
    provider = new GoogleAuthProvider(configService);

    await expect(provider.verify('qualquer-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
