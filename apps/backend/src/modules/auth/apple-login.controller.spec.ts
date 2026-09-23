import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { PasswordResetService } from './password-reset.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '../../common/types/auth.types';

// 🍎 KAN-16: integração ponta a ponta via HTTP (mesmo padrão de
// google-login.controller.spec.ts) — do POST /auth/apple até os cookies de
// sessão, passando pelo AuthService/SocialAuthService reais. Só o
// AppleAuthProvider é mockado (fronteira de rede com a Apple) e o Prisma.
describe('POST /auth/apple — id token verificado vira sessão própria (KAN-16)', () => {
  let app: INestApplication;
  let appleAuthProvider: { verify: jest.Mock };
  let usersService: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    createFromSocialProfile: jest.Mock;
  };
  let prisma: { socialIdentity: { findUnique: jest.Mock; create: jest.Mock } };

  beforeAll(async () => {
    appleAuthProvider = { verify: jest.fn() };
    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createFromSocialProfile: jest.fn(),
    };
    prisma = { socialIdentity: { findUnique: jest.fn(), create: jest.fn() } };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        SocialAuthService,
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: appleAuthProvider },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: PasswordResetService,
          useValue: { createTokenForUser: jest.fn(), consumeToken: jest.fn() },
        },
        { provide: MailerService, useValue: { send: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('fake.jwt.token') } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('new user: valid token creates the account and sets the session as an HttpOnly cookie, never in the body', async () => {
    appleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerUserId: 'apple-sub-1',
      email: 'nova@privaterelay.appleid.com',
      emailVerified: true,
    });
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createFromSocialProfile.mockResolvedValue({
      id: 'user-novo',
      email: 'nova@privaterelay.appleid.com',
      role: 'PATIENT',
      ageGroup: 'ADULT',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .send({ token: 'id-token-valido-da-apple' });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('access_token');
    expect(res.body.user.id).toBe('user-novo');
    expect(typeof res.body.csrfToken).toBe('string');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((c) => c.startsWith('emotional_app_token='));
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toContain('fake.jwt.token');
  });

  it('returning user: existing identity logs in without creating a new account', async () => {
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
      .send({ token: 'id-token-valido-da-apple' });

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe('user-existente');
    expect(usersService.createFromSocialProfile).not.toHaveBeenCalled();
  });

  it('rejects an invalid/expired Apple token with 401 and issues no session', async () => {
    appleAuthProvider.verify.mockRejectedValue(new UnauthorizedException('Token da Apple inválido ou expirado.'));

    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .send({ token: 'token-forjado-por-um-atacante' });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('user');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('refuses to log the victim in when the token email is unverified and already belongs to someone else', async () => {
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
      .send({ token: 'token-com-email-nao-verificado' });

    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });
});
