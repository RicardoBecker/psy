import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { SocialAuthService } from './social-auth.service';
import { PasswordResetService } from './password-reset.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { RateLimitStore } from '../../common/rate-limit/rate-limit.store';
import { RateLimitMetricsService } from '../../common/rate-limit/rate-limit-metrics.service';
import { AuthRateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

describe('POST /auth/register — public registration cannot mint privileged roles (CR-01.2)', () => {
  let app: INestApplication;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };

  const fakePatient = {
    id: 'user-1',
    name: 'Paciente Teste',
    email: 'paciente@example.com',
    role: 'PATIENT',
    ageGroup: 'ADULT',
    birthDate: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(fakePatient),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('fake.jwt.token') } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: PasswordResetService,
          useValue: { createTokenForUser: jest.fn(), consumeToken: jest.fn() },
        },
        { provide: MailerService, useValue: { send: jest.fn() } },
        RateLimitStore,
        RateLimitMetricsService,
        AuthRateLimitGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mesma configuração global usada em main.ts — é ela quem rejeita
    // propriedades não declaradas no DTO (como `role`).
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usersService.findByEmail.mockClear();
    usersService.create.mockClear();
  });

  it('creates a PATIENT when no role is sent', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Paciente Teste',
      email: 'paciente@example.com',
      password: 'senha123',
    });

    expect(res.status).toBe(201);
    expect(usersService.create).toHaveBeenCalledTimes(1);
    expect(usersService.create.mock.calls[0][0]).not.toHaveProperty('role');
  });

  it.each(['ADMIN', 'PSYCHOLOGIST', 'GUARDIAN'])(
    'rejects registration attempting role: %s with 400 and never calls UsersService.create',
    async (role) => {
      const res = await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Atacante',
        email: `attacker-${role}@example.com`,
        password: 'senha123',
        role,
      });

      expect(res.status).toBe(400);
      expect(usersService.create).not.toHaveBeenCalled();
    },
  );

  it.each(['isActive', 'verified', 'id'])(
    'rejects mass-assignment attempt on administrative field "%s" with 400',
    async (field) => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Atacante',
          email: `attacker-${field}@example.com`,
          password: 'senha123',
          [field]: true,
        });

      expect(res.status).toBe(400);
      expect(usersService.create).not.toHaveBeenCalled();
    },
  );
});
