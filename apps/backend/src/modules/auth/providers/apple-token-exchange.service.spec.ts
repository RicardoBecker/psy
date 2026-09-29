import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AppleTokenExchangeService } from './apple-token-exchange.service';

// 🔒 KAN-158 (P2, re-review PR #18): a Apple é um serviço externo real —
// não há como (nem deveria) subir um servidor Apple de verdade num teste.
// Mockamos exatamente na borda de rede (`global.fetch`) e na assinatura do
// client_secret (`jose`), do mesmo jeito que apple.provider.spec.ts já faz
// para a verificação do identityToken. O contrato exercitado (corpo do
// POST, tratamento de invalid_grant, verificação do id_token devolvido) é
// o documentado oficialmente:
// https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens
const jwtVerify = jest.fn();
const createRemoteJWKSet = jest.fn().mockReturnValue('fake-jwks');
const importPKCS8 = jest.fn().mockResolvedValue('fake-private-key');

const signJWTMethods = {
  setProtectedHeader: jest.fn(() => signJWTMethods),
  setIssuer: jest.fn(() => signJWTMethods),
  setIssuedAt: jest.fn(() => signJWTMethods),
  setExpirationTime: jest.fn(() => signJWTMethods),
  setAudience: jest.fn(() => signJWTMethods),
  setSubject: jest.fn(() => signJWTMethods),
  sign: jest.fn().mockResolvedValue('fake-client-secret-jwt'),
};
const signJWTConstructor = jest.fn((..._args: unknown[]) => signJWTMethods);

jest.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => jwtVerify(...args),
  createRemoteJWKSet: (...args: unknown[]) => createRemoteJWKSet(...args),
  importPKCS8: (...args: unknown[]) => importPKCS8(...args),
  SignJWT: function (this: unknown, ...args: unknown[]) {
    return signJWTConstructor(...args);
  },
}));

const VALID_CONFIG: Record<string, string> = {
  APPLE_CLIENT_ID: 'com.example.web',
  APPLE_TEAM_ID: 'TEAMID1234',
  APPLE_KEY_ID: 'KEYID56789',
  APPLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
};

const EXPECTED_SUB = 'apple-sub-123';
const EXPECTED_NONCE = 'nonce-do-desafio';

function mockFetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('AppleTokenExchangeService — troca do authorization code no endpoint oficial da Apple (KAN-158, P2)', () => {
  let service: AppleTokenExchangeService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    signJWTMethods.setProtectedHeader.mockReturnValue(signJWTMethods);
    signJWTMethods.setIssuer.mockReturnValue(signJWTMethods);
    signJWTMethods.setIssuedAt.mockReturnValue(signJWTMethods);
    signJWTMethods.setExpirationTime.mockReturnValue(signJWTMethods);
    signJWTMethods.setAudience.mockReturnValue(signJWTMethods);
    signJWTMethods.setSubject.mockReturnValue(signJWTMethods);
    signJWTMethods.sign.mockResolvedValue('fake-client-secret-jwt');

    configService = { get: jest.fn((key: string) => VALID_CONFIG[key]) };
    service = new AppleTokenExchangeService(configService as unknown as ConfigService);

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('POSTs the exact form-encoded contract documented by the Apple REST API', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { id_token: 'apple-returned-id-token' }));
    jwtVerify.mockResolvedValue({ payload: { sub: EXPECTED_SUB, nonce: EXPECTED_NONCE } });

    await service.exchangeAndVerify({
      code: 'auth-code-valido',
      redirectUri: 'http://localhost:3000',
      expectedSub: EXPECTED_SUB,
      expectedNonce: EXPECTED_NONCE,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://appleid.apple.com/auth/token');
    expect(init.method).toBe('POST');
    const body = init.body as URLSearchParams;
    expect(body.get('client_id')).toBe('com.example.web');
    expect(body.get('client_secret')).toBe('fake-client-secret-jwt');
    expect(body.get('code')).toBe('auth-code-valido');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('redirect_uri')).toBe('http://localhost:3000');

    // client_secret: ES256, kid=Key ID, iss=Team ID, aud=appleid.apple.com,
    // sub=client_id — formato exato da doc "Creating a client secret".
    expect(signJWTMethods.setProtectedHeader).toHaveBeenCalledWith({
      alg: 'ES256',
      kid: 'KEYID56789',
    });
    expect(signJWTMethods.setIssuer).toHaveBeenCalledWith('TEAMID1234');
    expect(signJWTMethods.setAudience).toHaveBeenCalledWith('https://appleid.apple.com');
    expect(signJWTMethods.setSubject).toHaveBeenCalledWith('com.example.web');
    expect(importPKCS8).toHaveBeenCalledWith(VALID_CONFIG.APPLE_PRIVATE_KEY, 'ES256');
  });

  it('resolves without throwing when the exchanged id_token verifies and matches sub + nonce', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { id_token: 'apple-returned-id-token' }));
    jwtVerify.mockResolvedValue({ payload: { sub: EXPECTED_SUB, nonce: EXPECTED_NONCE } });

    await expect(
      service.exchangeAndVerify({
        code: 'auth-code-valido',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).resolves.toBeUndefined();

    expect(jwtVerify).toHaveBeenCalledWith('apple-returned-id-token', 'fake-jwks', {
      issuer: 'https://appleid.apple.com',
      audience: 'com.example.web',
    });
  });

  // 🔒 Reprodução do problema original (KAN-158, P2): antes desta
  // correção não existia troca alguma — um code inválido/expirado/já
  // usado era simplesmente ignorado e o login prosseguia. A Apple
  // responde 400 com invalid_grant nos três casos (code inválido, expirado
  // — TTL de 5min — ou reutilizado), então tratamos "resposta não-ok" como
  // o sinal único de rejeição, sem tentar distinguir os três client-side.
  it.each([
    ['invalid_grant (code inválido)', 400, { error: 'invalid_grant' }],
    ['invalid_grant (code expirado, TTL 5min)', 400, { error: 'invalid_grant' }],
    ['invalid_grant (code já usado — single-use garantido pela própria Apple)', 400, { error: 'invalid_grant' }],
  ])('rejects when Apple responds with %s', async (_label, status, body) => {
    fetchMock.mockResolvedValue(mockFetchResponse(status, body));

    await expect(
      service.exchangeAndVerify({
        code: 'code-problematico',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('reused code: the SAME code succeeds once, then fails on a second attempt (Apple single-use enforcement)', async () => {
    fetchMock
      .mockResolvedValueOnce(mockFetchResponse(200, { id_token: 'apple-returned-id-token' }))
      .mockResolvedValueOnce(mockFetchResponse(400, { error: 'invalid_grant' }));
    jwtVerify.mockResolvedValue({ payload: { sub: EXPECTED_SUB, nonce: EXPECTED_NONCE } });

    await expect(
      service.exchangeAndVerify({
        code: 'code-de-uso-unico',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).resolves.toBeUndefined();

    await expect(
      service.exchangeAndVerify({
        code: 'code-de-uso-unico',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects on a network failure talking to the Apple token endpoint', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      service.exchangeAndVerify({
        code: 'auth-code-valido',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the token response has no id_token at all', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, {}));

    await expect(
      service.exchangeAndVerify({
        code: 'auth-code-valido',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the exchanged id_token fails jose verification (bad signature/issuer/audience)', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { id_token: 'id-token-invalido' }));
    jwtVerify.mockRejectedValue(new Error('signature verification failed'));

    await expect(
      service.exchangeAndVerify({
        code: 'auth-code-valido',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // 🔒 Fecha o elo entre "o cliente afirma ter recebido este identityToken"
  // e "a Apple confirma que emitiu esta autorização" — um code válido para
  // OUTRO usuário/tentativa não pode ser encaixado aqui.
  it('rejects when the exchanged id_token belongs to a DIFFERENT sub than the one already verified', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { id_token: 'id-token-de-outro-usuario' }));
    jwtVerify.mockResolvedValue({ payload: { sub: 'apple-sub-outra-pessoa', nonce: EXPECTED_NONCE } });

    await expect(
      service.exchangeAndVerify({
        code: 'code-de-outro-usuario',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the exchanged id_token nonce does not match the challenge nonce', async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { id_token: 'id-token-nonce-divergente' }));
    jwtVerify.mockResolvedValue({ payload: { sub: EXPECTED_SUB, nonce: 'nonce-de-outra-tentativa' } });

    await expect(
      service.exchangeAndVerify({
        code: 'code-qualquer',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ['APPLE_CLIENT_ID', { ...VALID_CONFIG, APPLE_CLIENT_ID: undefined }],
    ['APPLE_TEAM_ID', { ...VALID_CONFIG, APPLE_TEAM_ID: undefined }],
    ['APPLE_KEY_ID', { ...VALID_CONFIG, APPLE_KEY_ID: undefined }],
    ['APPLE_PRIVATE_KEY', { ...VALID_CONFIG, APPLE_PRIVATE_KEY: undefined }],
  ])('refuses to attempt the exchange when %s is not configured, never calling Apple', async (_key, config) => {
    configService.get.mockImplementation((k: string) => (config as Record<string, string | undefined>)[k]);
    service = new AppleTokenExchangeService(configService as unknown as ConfigService);

    await expect(
      service.exchangeAndVerify({
        code: 'auth-code-valido',
        redirectUri: 'http://localhost:3000',
        expectedSub: EXPECTED_SUB,
        expectedNonce: EXPECTED_NONCE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
