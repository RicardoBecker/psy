import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersService } from '../users/users.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { SocialAuthService } from './social-auth.service';

describe('POST /auth/login — inactive users get the same generic 401 (CR-02.1)', () => {
  let app: INestApplication;
  let usersService: { findByEmail: jest.Mock };
  let passwordHash: string;

  const PASSWORD = 'senhaCorreta123';

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);

    usersService = { findByEmail: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AuthController],
      providers: [
        AuthService,
        LocalStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('fake.jwt.token') } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('active user with correct password logs in and receives the session as an HttpOnly cookie, never in the body (CR-05.4)', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ativo@example.com',
      passwordHash,
      role: 'PATIENT',
      isActive: true,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ativo@example.com', password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('access_token');
    expect(res.body.user).toBeDefined();
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.body.csrfToken.length).toBeGreaterThan(0);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((c) => c.startsWith('emotional_app_token='));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toContain('fake.jwt.token');

    const csrfCookie = cookies.find((c) => c.startsWith('csrf_token='));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).not.toMatch(/HttpOnly/i); // precisa ser legível por JS
  });

  it('deactivated user with the correct password receives 401 and no token', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: 'inativo@example.com',
      passwordHash,
      role: 'PATIENT',
      isActive: false,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'inativo@example.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('access_token');
  });

  it('wrong password on an active account receives the same 401 shape', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ativo@example.com',
      passwordHash,
      role: 'PATIENT',
      isActive: true,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ativo@example.com', password: 'senhaErrada' });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('access_token');
  });

  it('nonexistent account receives the same 401 shape as inactive/wrong-password', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'naoexiste@example.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('access_token');
  });
});
