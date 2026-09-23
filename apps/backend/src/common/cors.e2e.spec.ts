import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { buildCorsOptions } from './cors.config';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({ controllers: [PingController] })
class PingModule {}

/**
 * Testa o CORS real de ponta a ponta (preflight incluso) contra um servidor
 * HTTP de verdade, não só a função de decisão isolada (CR-05.3).
 */
describe('CORS end-to-end — preflight e headers reais (CR-05.3)', () => {
  let devApp: INestApplication;
  let prodApp: INestApplication;

  beforeAll(async () => {
    const devModule: TestingModule = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();
    devApp = devModule.createNestApplication();
    devApp.enableCors(buildCorsOptions({ NODE_ENV: 'development' } as NodeJS.ProcessEnv));
    await devApp.init();

    const prodModule: TestingModule = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();
    prodApp = prodModule.createNestApplication();
    prodApp.enableCors(
      buildCorsOptions({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      } as NodeJS.ProcessEnv),
    );
    await prodApp.init();
  });

  afterAll(async () => {
    await devApp.close();
    await prodApp.close();
  });

  it('preflight (OPTIONS) de origem autorizada recebe os headers CORS esperados', async () => {
    const res = await request(prodApp.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://app.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('preflight (OPTIONS) de origem não autorizada não recebe header de permissão', async () => {
    const res = await request(prodApp.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('GET real de origem autorizada recebe Access-Control-Allow-Origin igual à origem (nunca "*")', async () => {
    const res = await request(prodApp.getHttpServer()).get('/ping').set('Origin', 'https://app.example.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('GET real de origem não autorizada em produção não recebe header CORS', async () => {
    const res = await request(prodApp.getHttpServer()).get('/ping').set('Origin', 'https://evil.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('em desenvolvimento, IP de rede local recebe os headers CORS esperados', async () => {
    const res = await request(devApp.getHttpServer()).get('/ping').set('Origin', 'http://192.168.1.50:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://192.168.1.50:3000');
  });
});
