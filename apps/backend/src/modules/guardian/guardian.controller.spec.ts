import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Mesmo padrão usado em psychologist.controller.spec.ts: simula o
// JwtAuthGuard via headers de teste, preservando o RolesGuard real.
class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: req.headers['x-test-user-id'] ?? 'user-1',
      role: req.headers['x-test-user-role'] ?? 'PATIENT',
    };
    return true;
  }
}

describe('GuardianController — RBAC por role (CR-06.1)', () => {
  let app: INestApplication;
  let service: { createGuardianRelationship: jest.Mock; getGuardianRelationships: jest.Mock; getMinorRelationships: jest.Mock };

  beforeAll(async () => {
    service = {
      createGuardianRelationship: jest.fn().mockResolvedValue({ id: 'rel-1' }),
      getGuardianRelationships: jest.fn().mockResolvedValue([]),
      getMinorRelationships: jest.fn().mockResolvedValue([]),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [GuardianController],
      providers: [{ provide: GuardianService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new FakeJwtAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const MINOR_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  it.each(['GUARDIAN', 'ADMIN'])('%s pode criar vínculo de tutor', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/guardian/relationships')
      .set('x-test-user-role', role)
      .send({ minorUserId: MINOR_UUID, relationshipType: 'parent' });

    expect(res.status).toBe(201);
  });

  it.each(['PATIENT', 'PSYCHOLOGIST'])('%s NÃO pode criar vínculo de tutor (403)', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/guardian/relationships')
      .set('x-test-user-role', role)
      .send({ minorUserId: MINOR_UUID, relationshipType: 'parent' });

    expect(res.status).toBe(403);
  });

  it.each(['PATIENT', 'PSYCHOLOGIST'])('%s NÃO pode listar "meus vínculos como responsável" (403)', async (role) => {
    const res = await request(app.getHttpServer()).get('/guardian/relationships').set('x-test-user-role', role);

    expect(res.status).toBe(403);
  });

  it.each(['PATIENT', 'GUARDIAN', 'PSYCHOLOGIST', 'ADMIN'])(
    '%s consegue ver "meus vínculos como menor" — rota sem restrição de role, escopada pelo próprio id',
    async (role) => {
      const res = await request(app.getHttpServer())
        .get('/guardian/minor-relationships')
        .set('x-test-user-role', role);

      expect(res.status).toBe(200);
    },
  );
});
