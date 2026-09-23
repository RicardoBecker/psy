import { Body, Controller, Get, INestApplication, Module, Patch, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { CsrfGuard } from './csrf.guard';
import { CsrfCookieMiddleware } from './csrf.middleware';
import { SkipCsrf } from './skip-csrf.decorator';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from './session-cookie';

@Controller('ping')
class PingController {
  @Get()
  read() {
    return { ok: true };
  }

  @Post()
  mutate(@Body() body: any) {
    return { received: body };
  }

  @SkipCsrf()
  @Patch('exempt')
  exempt() {
    return { ok: true };
  }
}

@Module({ controllers: [PingController], providers: [{ provide: APP_GUARD, useClass: CsrfGuard }] })
class PingModule {}

/**
 * Prova, contra um servidor HTTP real, que requisições mutáveis exigem o
 * par double-submit cookie (X-CSRF-Token == csrf_token) — CR-05.4.
 */
describe('CSRF — double-submit cookie protege requisições mutáveis (CR-05.4)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.use((req: any, res: any, next: any) => {
      ensureCsrfCookie(req, res);
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET (não-mutável) nunca exige CSRF, e a primeira resposta já traz um csrf_token', async () => {
    const res = await request(app.getHttpServer()).get('/ping');

    expect(res.status).toBe(200);
    const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cookies.some((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))).toBe(true);
  });

  it('POST sem header X-CSRF-Token é rejeitado com 403, mesmo com o cookie presente', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.get('/ping'); // recebe o csrf_token cookie

    const res = await agent.post('/ping').send({ hello: 'world' });

    expect(res.status).toBe(403);
  });

  it('POST com header X-CSRF-Token mas sem cookie correspondente é rejeitado com 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/ping')
      .set('X-CSRF-Token', 'valor-qualquer-forjado')
      .send({ hello: 'world' });

    expect(res.status).toBe(403);
  });

  it('POST com header X-CSRF-Token diferente do cookie é rejeitado com 403', async () => {
    const agent = request.agent(app.getHttpServer());
    const getRes = await agent.get('/ping');
    const cookies = getRes.headers['set-cookie'] as unknown as string[];
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))!;
    const realToken = csrfCookie.split(';')[0].split('=')[1];

    const res = await agent
      .post('/ping')
      .set('X-CSRF-Token', realToken + '-adulterado')
      .send({ hello: 'world' });

    expect(res.status).toBe(403);
  });

  it('POST com header X-CSRF-Token igual ao cookie é aceito', async () => {
    const agent = request.agent(app.getHttpServer());
    const getRes = await agent.get('/ping');
    const cookies = getRes.headers['set-cookie'] as unknown as string[];
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))!;
    const realToken = csrfCookie.split(';')[0].split('=')[1];

    const res = await agent.post('/ping').set('X-CSRF-Token', realToken).send({ hello: 'world' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: { hello: 'world' } });
  });

  it('endpoint marcado @SkipCsrf() aceita PATCH mesmo sem nenhum token CSRF', async () => {
    const res = await request(app.getHttpServer()).patch('/ping/exempt');

    expect(res.status).toBe(200);
  });
});

describe('CsrfCookieMiddleware — sempre garante um csrf_token (CR-05.4)', () => {
  it('define csrf_token se ainda não existir', () => {
    const res: any = { cookie: jest.fn() };
    const req: any = { cookies: {} };
    const next = jest.fn();

    new CsrfCookieMiddleware().use(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('não sobrescreve um csrf_token já existente', () => {
    const res: any = { cookie: jest.fn() };
    const req: any = { cookies: { [CSRF_COOKIE_NAME]: 'ja-existe' } };
    const next = jest.fn();

    new CsrfCookieMiddleware().use(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
