import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '../../common/types/auth.types';

// 🔒 KAN-15: integração ponta a ponta via HTTP (mesmo padrão de
// login.controller.spec.ts) — do POST /auth/google até os cookies de
// sessão, passando pelo AuthService/SocialAuthService reais. Só o
// GoogleAuthProvider é mockado (fronteira de rede com o Google) e o Prisma
// (fronteira com o banco).
describe('POST /auth/google — id token verificado vira sessão própria (KAN-15)', () => {
  let app: INestApplication;
  let googleAuthProvider: { verify: jest.Mock };
  let usersService: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    createFromSocialProfile: jest.Mock;
  };
  let prisma: { socialIdentity: { findUnique: jest.Mock; create: jest.Mock } };

  beforeAll(async () => {
    googleAuthProvider = { verify: jest.fn() };
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
        { provide: GoogleAuthProvider, useValue: googleAuthProvider },
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
    googleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerUserId: 'google-sub-1',
      email: 'nova@example.com',
      emailVerified: true,
      name: 'Nova Pessoa',
    });
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createFromSocialProfile.mockResolvedValue({
      id: 'user-novo',
      email: 'nova@example.com',
      role: 'PATIENT',
      ageGroup: 'ADULT',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ token: 'id-token-valido-do-google' });

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
    googleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerUserId: 'google-sub-2',
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
      .post('/auth/google')
      .send({ token: 'id-token-valido-do-google' });

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe('user-existente');
    expect(usersService.createFromSocialProfile).not.toHaveBeenCalled();
  });

  it('rejects an invalid/expired Google token with 401 and issues no session', async () => {
    googleAuthProvider.verify.mockRejectedValue(new UnauthorizedException('Token do Google inválido ou expirado.'));

    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ token: 'token-forjado-por-um-atacante' });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('user');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('refuses to log the victim in when the token email is unverified and already belongs to someone else', async () => {
    googleAuthProvider.verify.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerUserId: 'google-sub-atacante',
      email: 'vitima@example.com',
      emailVerified: false,
    });
    prisma.socialIdentity.findUnique.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 'user-vitima', email: 'vitima@example.com', isActive: true });

    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ token: 'token-com-email-nao-verificado' });

    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
  });
});
