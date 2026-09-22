import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController — disabled social login endpoints (CR-01.1)', () => {
  let app: INestApplication;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/google returns 503 and never issues a token, regardless of body', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ token: 'anything-an-attacker-makes-up' });

    expect(res.status).toBe(503);
    expect(res.body).not.toHaveProperty('access_token');
    expect(res.body).not.toHaveProperty('user');
    expect(JSON.stringify(res.body)).not.toMatch(/user@gmail\.com|user@icloud\.com/);
  });

  it('POST /auth/google with an empty body still returns 503, never a token', async () => {
    const res = await request(app.getHttpServer()).post('/auth/google').send({});

    expect(res.status).toBe(503);
    expect(res.body).not.toHaveProperty('access_token');
  });

  it('POST /auth/apple returns 503 and never issues a token, regardless of body', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/apple')
      .send({ token: 'anything-an-attacker-makes-up' });

    expect(res.status).toBe(503);
    expect(res.body).not.toHaveProperty('access_token');
    expect(res.body).not.toHaveProperty('user');
    expect(JSON.stringify(res.body)).not.toMatch(/user@gmail\.com|user@icloud\.com/);
  });

  it('does not construct AuthService or reach any identity-issuing code path', () => {
    expect(authService.register).not.toHaveBeenCalled();
    expect(authService.login).not.toHaveBeenCalled();
  });
});
