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
import { UsersService } from '../users/users.service';
import { RateLimitStore } from '../../common/rate-limit/rate-limit.store';
import { RateLimitMetricsService } from '../../common/rate-limit/rate-limit-metrics.service';
import { AuthRateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

async function buildApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      AuthService,
      { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
      {
        provide: UsersService,
        useValue: {
          findByEmail: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'user-1',
            name: 'Pessoa',
            email: 'nova-conta@example.com',
            role: 'PATIENT',
            ageGroup: 'ADULT',
            isActive: true,
          }),
        },
      },
      { provide: JwtService, useValue: { sign: jest.fn() } },
      { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
      { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
      { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
      { provide: PasswordResetService, useValue: { createTokenForUser: jest.fn(), consumeToken: jest.fn() } },
      { provide: MailerService, useValue: { send: jest.fn() } },
      RateLimitStore,
      RateLimitMetricsService,
      AuthRateLimitGuard,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

// 🔒 KAN-18 (KAN-79): prova ponta a ponta (via HTTP de verdade, guard real
// incluso) de que POST /auth/forgot-password (limite mais apertado da
// suíte: 5/min por IP) bloqueia com 429 depois do limite, tanto por IP
// quanto por identidade.
describe('Auth rate limiting — 429 via HTTP real (KAN-18)', () => {
  it('blocks by IP after 5 requests/min, with the standardized 429 body', async () => {
    const app = await buildApp();
    try {
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: `pessoa-${i}@example.com` });
        expect(res.status).toBe(201);
      }

      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'pessoa-6@example.com' });

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        statusCode: 429,
        message: 'Muitas tentativas. Tente novamente em alguns instantes.',
        retryAfter: expect.any(Number),
      });
      expect(res.headers['retry-after']).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('blocks by identity (same email) well before the IP limit is reached', async () => {
    const app = await buildApp();
    try {
      // limite por identidade = floor(5/2) = 2
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: 'vitima@example.com' });
        expect(res.status).toBe(201);
      }

      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'vitima@example.com' });

      expect(res.status).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('different routes track separate limits — hitting /auth/forgot-password does not affect /auth/register', async () => {
    const app = await buildApp();
    try {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: `outra-${i}@example.com` });
      }
      const blocked = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'mais-uma@example.com' });
      expect(blocked.status).toBe(429);

      // register tem limite próprio (10/min) — não foi afetado pelas
      // tentativas acima em outra rota
      const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Pessoa',
        email: 'nova-conta@example.com',
        password: 'senha123456',
      });
      expect(registerRes.status).toBe(201);
    } finally {
      await app.close();
    }
  });
});
