import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SESSION_COOKIE_NAME } from '../../common/session-cookie';

/**
 * Prova, ponta a ponta e usando o MESMO token JWT emitido uma única vez, que
 * uma desativação ou mudança de role feita no banco tem efeito imediato na
 * próxima requisição — sem esperar o token expirar (CR-02.2).
 */
describe('Session freshness — same old token, DB state decides access (CR-02.2)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let usersService: { findById: jest.Mock; findAll: jest.Mock };
  let tokenForUser1: string;

  beforeAll(async () => {
    usersService = { findById: jest.fn(), findAll: jest.fn().mockResolvedValue([]) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
      ],
      controllers: [UsersController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    jwtService = moduleRef.get(JwtService);
    // Token emitido UMA VEZ, quando o usuário ainda era ADMIN ativo — o mesmo
    // token é reusado em todas as chamadas abaixo, mesmo depois do banco mudar.
    tokenForUser1 = jwtService.sign({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
      ageGroup: 'ADULT',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('while ADMIN and active in the DB, the token grants access to an admin-only route', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
      ageGroup: 'ADULT',
      isActive: true,
    });

    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${tokenForUser1}`);

    expect(res.status).toBe(200);
  });

  it('after being demoted to PATIENT in the DB, the SAME token loses admin access immediately', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'PATIENT', // rebaixado no banco — o token ainda diz "ADMIN"
      ageGroup: 'ADULT',
      isActive: true,
    });

    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${tokenForUser1}`);

    expect(res.status).toBe(403);
  });

  it('after being deactivated in the DB, the SAME token is rejected with 401 on the next call', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
      ageGroup: 'ADULT',
      isActive: false, // desativado — token continua "válido" criptograficamente
    });

    const res = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${tokenForUser1}`);

    expect(res.status).toBe(401);
  });

  it('after the user is removed from the DB, the SAME token is rejected with 401', async () => {
    usersService.findById.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${tokenForUser1}`);

    expect(res.status).toBe(401);
  });
});
