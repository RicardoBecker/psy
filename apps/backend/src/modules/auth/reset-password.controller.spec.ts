import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { PasswordResetService } from './password-reset.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { RateLimitStore } from '../../common/rate-limit/rate-limit.store';
import { RateLimitMetricsService } from '../../common/rate-limit/rate-limit-metrics.service';
import { AuthRateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { AppleChallengeService } from './apple-challenge.service';
import { UsersService } from '../users/users.service';

// 🔒 KAN-17: POST /auth/reset-password — token válido troca a senha e
// nunca vaza o hash; token inválido/expirado/já usado recebe sempre a
// mesma resposta genérica.
describe('POST /auth/reset-password — token válido troca a senha (KAN-17)', () => {
  let app: INestApplication;
  let passwordResetService: { consumeTokenAndUpdatePassword: jest.Mock };

  beforeAll(async () => {
    passwordResetService = { consumeTokenAndUpdatePassword: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: PasswordResetService, useValue: passwordResetService },
        { provide: MailerService, useValue: { send: jest.fn() } },
        RateLimitStore,
        RateLimitMetricsService,
        AuthRateLimitGuard,
        AppleChallengeService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('valid token: 201, generic success body, no session cookie (this is not a login)', async () => {
    passwordResetService.consumeTokenAndUpdatePassword.mockResolvedValue({ userId: 'user-1' });

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'token-valido', newPassword: 'novaSenhaSegura123' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true });
    expect(res.headers['set-cookie']).toBeUndefined();
    // 🔒 Code review PR #19 (KAN-156, P2): hash calculado ANTES de chamar
    // o service, que agora marca o token usado E grava a senha juntos
    // (atomicidade) — não há mais uma chamada separada a updatePassword.
    expect(passwordResetService.consumeTokenAndUpdatePassword).toHaveBeenCalledWith(
      'token-valido',
      expect.any(String),
    );
  });

  it('invalid/expired/already-used token: 400 with a generic message', async () => {
    passwordResetService.consumeTokenAndUpdatePassword.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'token-invalido', newPassword: 'novaSenhaSegura123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Link inválido ou expirado.');
  });
});
