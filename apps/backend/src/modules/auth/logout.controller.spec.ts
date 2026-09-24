import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { SocialAuthService } from './social-auth.service';
import { PasswordResetService } from './password-reset.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { RateLimitStore } from '../../common/rate-limit/rate-limit.store';
import { RateLimitMetricsService } from '../../common/rate-limit/rate-limit-metrics.service';
import { AuthRateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { AppleChallengeService } from './apple-challenge.service';
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../common/session-cookie';

describe('POST /auth/logout — encerra a sessão de verdade (CR-05.4)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let usersService: { findById: jest.Mock; findByEmail: jest.Mock };

  beforeAll(async () => {
    usersService = { findById: jest.fn(), findByEmail: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        AppleChallengeService,
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        {
          provide: PasswordResetService,
          useValue: { createTokenForUser: jest.fn(), consumeTokenAndUpdatePassword: jest.fn() },
        },
        { provide: MailerService, useValue: { send: jest.fn() } },
        RateLimitStore,
        RateLimitMetricsService,
        AuthRateLimitGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requer sessão válida — sem cookie, recebe 401 e nada é limpo', async () => {
    const res = await request(app.getHttpServer()).post('/auth/logout');
    expect(res.status).toBe(401);
  });

  it('com sessão válida, limpa os cookies de sessão e CSRF', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'PATIENT',
      ageGroup: 'ADULT',
      isActive: true,
    });
    const token = jwtService.sign({ sub: 'user-1', email: 'user@example.com', role: 'PATIENT', ageGroup: 'ADULT' });

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true });

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

    // clearCookie envia o cookie vazio com data de expiração no passado
    expect(sessionCookie).toMatch(/emotional_app_token=;/);
    expect(csrfCookie).toMatch(/csrf_token=;/);
  });
});

describe('Token forjado não libera nada (CR-05.4)', () => {
  let app: INestApplication;
  let usersService: { findById: jest.Mock };

  beforeAll(async () => {
    usersService = { findById: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'segredo-real-do-servidor' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: { get: () => 'segredo-real-do-servidor' } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        AppleChallengeService,
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        {
          provide: PasswordResetService,
          useValue: { createTokenForUser: jest.fn(), consumeTokenAndUpdatePassword: jest.fn() },
        },
        { provide: MailerService, useValue: { send: jest.fn() } },
        RateLimitStore,
        RateLimitMetricsService,
        AuthRateLimitGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cookie com assinatura de outro segredo é rejeitado com 401', async () => {
    // Um "atacante" assina um token com um segredo diferente do servidor.
    const forgedJwt = require('@nestjs/jwt') as typeof import('@nestjs/jwt');
    const forgedService = new forgedJwt.JwtService({ secret: 'segredo-do-atacante' });
    const forgedToken = forgedService.sign({ sub: 'admin-1', role: 'ADMIN' });

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${forgedToken}`);

    expect(res.status).toBe(401);
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('cookie com valor sem formato de JWT é rejeitado com 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${SESSION_COOKIE_NAME}=isso-nao-e-um-jwt`);

    expect(res.status).toBe(401);
    expect(usersService.findById).not.toHaveBeenCalled();
  });
});
