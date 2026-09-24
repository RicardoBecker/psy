import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import { ConfigService } from '@nestjs/config';
import { AppleChallengeService } from './apple-challenge.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { PasswordResetService } from './password-reset.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { RateLimitStore } from '../../common/rate-limit/rate-limit.store';
import { RateLimitMetricsService } from '../../common/rate-limit/rate-limit-metrics.service';
import { AuthRateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '../../common/types/auth.types';

// 🍎 KAN-16 + Code review PR #18 (KAN-158, P1): integração ponta a ponta
// via HTTP, incluindo o handshake state/nonce de verdade (JwtService e
// AppleChallengeService reais, cookie assinado de verdade) — só o
// AppleAuthProvider é mockado (fronteira de rede com a Apple) e o Prisma.
describe('GET /auth/apple/start + POST /auth/apple — handshake state/nonce (KAN-16/KAN-158)', () => {
  let app: INestApplication;
  let appleAuthProvider: { verify: jest.Mock };
  let usersService: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
  };
  let prisma: {
    socialIdentity: { findUnique: jest.Mock; create: jest.Mock };
    user: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: { user: { create: jest.Mock }; socialIdentity: { create: jest.Mock } };

  beforeAll(async () => {
    appleAuthProvider = { verify: jest.fn() };
    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    tx = { user: { create: jest.fn() }, socialIdentity: { create: jest.fn() } };
    prisma = {
      socialIdentity: { findUnique: jest.fn(), create: jest.fn() },
      user: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } })],
      controllers: [AuthController],
      providers: [
        AuthService,
        SocialAuthService,
        AppleChallengeService,
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: appleAuthProvider },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: PasswordResetService,
          useValue: { createTokenForUser: jest.fn(), consumeTokenAndUpdatePassword: jest.fn() },
        },
        { provide: MailerService, useValue: { send: jest.fn() } },
        RateLimitStore,
        RateLimitMetricsService,
        AuthRateLimitGuard,
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  // Reproduz o handshake real: GET /auth/apple/start → extrai state/nonce
  // do corpo e o cookie de desafio do Set-Cookie.
  async function startAppleAuth(): Promise<{ state: string; nonce: string; cookie: string }> {
    const res = await request(app.getHttpServer()).get('/auth/apple/start');
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const challengeCookie = setCookie.find((c) => c.startsWith('apple_auth_challenge='));
    return { state: res.body.state, nonce: res.body.nonce, cookie: challengeCookie!.split(';')[0] };
  }

  it('GET /auth/apple/start returns a state/nonce pair and sets an HttpOnly challenge cookie', async () => {
    const res = await request(app.getHttpServer()).get('/auth/apple/start');

    expect(res.status).toBe(200);
    expect(typeof res.body.state).toBe('string');
    expect(typeof res.body.nonce).toBe('string');
    expect(res.body.state).not.toBe(res.body.nonce);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const challengeCookie = cookies.find((c) => c.startsWith('apple_auth_challenge='));
    expect(challengeCookie).toMatch(/HttpOnly/i);
  });

  it('new user: valid token + matching state/cookie creates the account and sets the session cookie', async () => {
    const { state, nonce, cookie } = await startAppleAuth();
    appleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerUserId: 'apple-sub-1',
      email: 'nova@privaterelay.appleid.com',
      emailVerified: true,
    });
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({
      id: 'user-novo',
      email: 'nova@privaterelay.appleid.com',
      role: 'PATIENT',
      ageGroup: 'ADULT',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .set('Cookie', cookie)
      .send({ token: 'id-token-valido-da-apple', state });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('access_token');
    expect(res.body.user.id).toBe('user-novo');
    expect(typeof res.body.csrfToken).toBe('string');
    // 🔒 KAN-158 P1: o provider é chamado com o nonce extraído do desafio,
    // não um valor arbitrário do corpo da requisição.
    expect(appleAuthProvider.verify).toHaveBeenCalledWith('id-token-valido-da-apple', nonce);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((c) => c.startsWith('emotional_app_token='));
    expect(sessionCookie).toMatch(/HttpOnly/i);
  });

  it('returning user: existing identity logs in without creating a new account', async () => {
    const { state, cookie } = await startAppleAuth();
    appleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerUserId: 'apple-sub-2',
      email: 'existente@example.com',
      emailVerified: true,
    });
    prisma.socialIdentity.findUnique.mockResolvedValue({ userId: 'user-existente' });
    usersService.findById.mockResolvedValue({
      id: 'user-existente',
      email: 'existente@example.com',
      role: 'PATIENT',
      ageGroup: 'ADULT',
      isActive: true,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .set('Cookie', cookie)
      .send({ token: 'id-token-valido-da-apple', state });

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe('user-existente');
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid/expired Apple token with 401 and issues no session', async () => {
    const { state, cookie } = await startAppleAuth();
    appleAuthProvider.verify.mockRejectedValue(new UnauthorizedException('Token da Apple inválido ou expirado.'));

    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .set('Cookie', cookie)
      .send({ token: 'token-forjado-por-um-atacante', state });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('user');
    // Cookie de desafio ainda é limpo (uso único, mesmo em falha) — só 
    // a AUSÊNCIA de cookie de SESSÃO é o que importa aqui.
    const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cookies.find((c) => c.startsWith('emotional_app_token='))).toBeUndefined();
  });

  it('refuses to log the victim in when the token email is unverified and already belongs to someone else', async () => {
    const { state, cookie } = await startAppleAuth();
    appleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerUserId: 'apple-sub-atacante',
      email: 'vitima@example.com',
      emailVerified: false,
    });
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 'user-vitima', email: 'vitima@example.com', isActive: true });

    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .set('Cookie', cookie)
      .send({ token: 'token-com-email-nao-verificado', state });

    expect(res.status).toBe(401);
    // Cookie de desafio ainda é limpo (uso único, mesmo em falha) — só 
    // a AUSÊNCIA de cookie de SESSÃO é o que importa aqui.
    const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cookies.find((c) => c.startsWith('emotional_app_token='))).toBeUndefined();
    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });

  // 🔒 Code review PR #18 (KAN-158, P1): a resposta precisa estar
  // vinculada à tentativa iniciada pelo navegador — sem cookie válido ou
  // com state divergente, a requisição é rejeitada ANTES de sequer chamar
  // o AppleAuthProvider (o token nem é examinado).
  describe('rejects responses not bound to a request this backend actually issued (KAN-158, P1)', () => {
    it('POST /auth/apple with no challenge cookie at all: 401, provider never called', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/apple')
        .send({ token: 'um-token-qualquer-obtido-em-outro-lugar', state: 'state-inventado' });

      expect(res.status).toBe(401);
      expect(appleAuthProvider.verify).not.toHaveBeenCalled();
    });

    it('POST /auth/apple with a valid cookie but a DIFFERENT state: 401, provider never called (session-swap/CSRF on the popup response)', async () => {
      const { cookie } = await startAppleAuth();

      const res = await request(app.getHttpServer())
        .post('/auth/apple')
        .set('Cookie', cookie)
        .send({ token: 'token-qualquer', state: 'state-de-outra-tentativa' });

      expect(res.status).toBe(401);
      expect(appleAuthProvider.verify).not.toHaveBeenCalled();
    });

    it('the challenge cookie is always cleared after a POST /auth/apple attempt, success or failure (single-use hygiene)', async () => {
      const success = await startAppleAuth();
      appleAuthProvider.verify.mockResolvedValue({
        provider: AuthProvider.APPLE,
        providerUserId: 'apple-sub-single-use',
        email: 'pessoa@example.com',
        emailVerified: true,
      });
      prisma.socialIdentity.findUnique.mockResolvedValue({ userId: 'user-x' });
      usersService.findById.mockResolvedValue({ id: 'user-x', isActive: true });

      const okRes = await request(app.getHttpServer())
        .post('/auth/apple')
        .set('Cookie', success.cookie)
        .send({ token: 'token-original', state: success.state });
      expect(okRes.status).toBe(201);
      const okCookies = okRes.headers['set-cookie'] as unknown as string[];
      expect(okCookies.find((c) => c.startsWith('apple_auth_challenge='))).toMatch(
        /apple_auth_challenge=;/,
      );

      const failure = await startAppleAuth();
      appleAuthProvider.verify.mockRejectedValue(new UnauthorizedException('Token da Apple inválido ou expirado.'));

      const failRes = await request(app.getHttpServer())
        .post('/auth/apple')
        .set('Cookie', failure.cookie)
        .send({ token: 'token-invalido', state: failure.state });
      expect(failRes.status).toBe(401);
      const failCookies = failRes.headers['set-cookie'] as unknown as string[];
      expect(failCookies.find((c) => c.startsWith('apple_auth_challenge='))).toMatch(
        /apple_auth_challenge=;/,
      );
    });
  });
});
