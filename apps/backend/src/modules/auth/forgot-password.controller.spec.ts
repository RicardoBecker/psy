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

// 🔒 KAN-17: POST /auth/forgot-password nunca revela se o e-mail existe —
// mesma resposta (200 e corpo genérico) para conta ativa, inativa ou
// inexistente. Só o comportamento OBSERVÁVEL do lado de fora do
// AuthService é o que importa aqui (o "o que acontece por dentro" já está
// coberto em auth.service.spec.ts).
describe('POST /auth/forgot-password — never confirms or denies an email exists (KAN-17)', () => {
  let app: INestApplication;
  let usersService: { findByEmail: jest.Mock };
  let mailerService: { send: jest.Mock };
  let passwordResetService: { createTokenForUser: jest.Mock };

  beforeAll(async () => {
    usersService = { findByEmail: jest.fn() };
    mailerService = { send: jest.fn() };
    passwordResetService = { createTokenForUser: jest.fn().mockResolvedValue('raw-token') };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
        { provide: PasswordResetService, useValue: passwordResetService },
        { provide: MailerService, useValue: mailerService },
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

  it('existing active account: 201, generic body, no session cookie issued', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'ativo@example.com', isActive: true });

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'ativo@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Se o e-mail existir, enviaremos instruções de recuperação.' });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(mailerService.send).toHaveBeenCalled();
  });

  it('nonexistent account: exact same response as an existing one', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'naoexiste@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Se o e-mail existir, enviaremos instruções de recuperação.' });
    expect(mailerService.send).not.toHaveBeenCalled();
  });

  it('deactivated account: exact same response, no email actually sent', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: 'inativo@example.com', isActive: false });

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'inativo@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Se o e-mail existir, enviaremos instruções de recuperação.' });
    expect(mailerService.send).not.toHaveBeenCalled();
  });
});
