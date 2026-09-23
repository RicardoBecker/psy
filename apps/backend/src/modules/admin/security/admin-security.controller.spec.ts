import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AdminSecurityController } from './admin-security.controller';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { UsersService } from '../../users/users.service';
import { RateLimitMetricsService } from '../../../common/rate-limit/rate-limit-metrics.service';
import { SESSION_COOKIE_NAME } from '../../../common/session-cookie';

// 🔒 KAN-18 (KAN-80): GET /admin/security/rate-limits só para ADMIN — mesmo
// padrão de RBAC ponta a ponta usado em session-freshness.e2e.spec.ts.
describe('GET /admin/security/rate-limits — ADMIN-only metrics (KAN-18/KAN-80)', () => {
  let app: INestApplication;
  let usersService: { findById: jest.Mock };
  let metrics: RateLimitMetricsService;
  let jwtService: JwtService;

  beforeAll(async () => {
    usersService = { findById: jest.fn() };
    metrics = new RateLimitMetricsService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
      ],
      controllers: [AdminSecurityController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: UsersService, useValue: usersService },
        { provide: RateLimitMetricsService, useValue: metrics },
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

  function tokenFor(role: string) {
    return jwtService.sign({ sub: 'user-1', email: 'user@example.com', role, ageGroup: 'ADULT' });
  }

  it('rejects with 401 when there is no session at all', async () => {
    const res = await request(app.getHttpServer()).get('/admin/security/rate-limits');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin (PATIENT) with 403', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'PATIENT',
      ageGroup: 'ADULT',
      isActive: true,
    });

    const res = await request(app.getHttpServer())
      .get('/admin/security/rate-limits')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${tokenFor('PATIENT')}`);

    expect(res.status).toBe(403);
  });

  it('returns the current in-memory snapshot for an ADMIN', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      ageGroup: 'ADULT',
      isActive: true,
    });
    metrics.recordBlock('/auth/login', 'ip');
    metrics.recordBlock('/auth/forgot-password', 'identity');

    const res = await request(app.getHttpServer())
      .get('/admin/security/rate-limits')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${tokenFor('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      blocks: expect.arrayContaining([
        { route: '/auth/login', reason: 'ip', count: 1 },
        { route: '/auth/forgot-password', reason: 'identity', count: 1 },
      ]),
    });
  });
});
