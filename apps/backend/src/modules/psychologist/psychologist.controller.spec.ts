import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PsychologistController } from './psychologist.controller';
import { PsychologistService } from './psychologist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Simula o JwtAuthGuard real: injeta req.user a partir de headers de teste,
// preservando o RolesGuard real (com o Reflector real) para exercitar RBAC.
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

describe('PsychologistController — verified é exclusivo do admin (CR-01.3)', () => {
  let app: INestApplication;
  let service: { updateProfile: jest.Mock; verifyPsychologist: jest.Mock };

  const psychologistId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const profileId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeAll(async () => {
    service = {
      updateProfile: jest.fn().mockResolvedValue({ id: profileId, verified: false }),
      verifyPsychologist: jest.fn().mockResolvedValue({ id: profileId, verified: true }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PsychologistController],
      providers: [{ provide: PsychologistService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new FakeJwtAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    service.updateProfile.mockClear();
    service.verifyPsychologist.mockClear();
  });

  it('rejects a self-service PATCH /psychologist/profile that includes verified with 400', async () => {
    const res = await request(app.getHttpServer())
      .patch('/psychologist/profile')
      .set('x-test-user-id', psychologistId)
      .set('x-test-user-role', 'PSYCHOLOGIST')
      .send({ bio: 'Especialista em ansiedade', verified: true });

    expect(res.status).toBe(400);
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('allows a self-service PATCH /psychologist/profile without verified', async () => {
    const res = await request(app.getHttpServer())
      .patch('/psychologist/profile')
      .set('x-test-user-id', psychologistId)
      .set('x-test-user-role', 'PSYCHOLOGIST')
      .send({ bio: 'Especialista em ansiedade' });

    expect(res.status).toBe(200);
    expect(service.updateProfile).toHaveBeenCalledWith(
      psychologistId,
      expect.not.objectContaining({ verified: expect.anything() }),
    );
  });

  it('allows an ADMIN to verify a psychologist profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/psychologist/verify/${profileId}`)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-role', 'ADMIN');

    expect(res.status).toBe(200);
    expect(service.verifyPsychologist).toHaveBeenCalledWith(profileId, 'admin-1');
  });

  it('rejects a non-admin (PSYCHOLOGIST) calling the verify endpoint with 403', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/psychologist/verify/${profileId}`)
      .set('x-test-user-id', psychologistId)
      .set('x-test-user-role', 'PSYCHOLOGIST');

    expect(res.status).toBe(403);
    expect(service.verifyPsychologist).not.toHaveBeenCalled();
  });

  it('rejects a non-admin (PATIENT) calling the verify endpoint with 403', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/psychologist/verify/${profileId}`)
      .set('x-test-user-id', 'patient-1')
      .set('x-test-user-role', 'PATIENT');

    expect(res.status).toBe(403);
    expect(service.verifyPsychologist).not.toHaveBeenCalled();
  });
});
