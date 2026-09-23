import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, AgeGroup, ConsentRecordStatus } from '../../common/types/auth.types';

describe('ConsentService (CR-06.2)', () => {
  let service: ConsentService;
  let prisma: {
    user: { findUnique: jest.Mock };
    guardianRelationship: { findFirst: jest.Mock };
    consentRecord: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; findFirst: jest.Mock };
  };

  const PATIENT_ID = 'patient-1';
  const GUARDIAN_ID = 'guardian-1';
  const CONSENT_ID = 'consent-1';

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      guardianRelationship: { findFirst: jest.fn() },
      consentRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ConsentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ConsentService);
  });

  describe('createConsentRecord', () => {
    it('exige guardianUserId para menor de idade', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: PATIENT_ID, ageGroup: AgeGroup.CHILD, role: Role.PATIENT });

      await expect(
        service.createConsentRecord(PATIENT_ID, { consentType: 'data_processing' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.consentRecord.create).not.toHaveBeenCalled();
    });

    it('adulto não precisa de responsável', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: PATIENT_ID, ageGroup: AgeGroup.ADULT, role: Role.PATIENT });
      prisma.consentRecord.create.mockResolvedValue({ id: CONSENT_ID, status: ConsentRecordStatus.ACTIVE });

      const result = await service.createConsentRecord(PATIENT_ID, { consentType: 'data_processing' } as any);
      expect(result.status).toBe(ConsentRecordStatus.ACTIVE);
    });

    it('rejeita guardianUserId sem vínculo aprovado entre o menor e esse responsável', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: PATIENT_ID, ageGroup: AgeGroup.CHILD, role: Role.PATIENT })
        .mockResolvedValueOnce({ id: GUARDIAN_ID, role: Role.GUARDIAN });
      prisma.guardianRelationship.findFirst.mockResolvedValue(null); // sem vínculo aprovado

      await expect(
        service.createConsentRecord(PATIENT_ID, {
          consentType: 'data_processing',
          guardianUserId: GUARDIAN_ID,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.consentRecord.create).not.toHaveBeenCalled();
    });

    it('cria com sucesso quando há vínculo aprovado entre o menor e o responsável', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: PATIENT_ID, ageGroup: AgeGroup.CHILD, role: Role.PATIENT })
        .mockResolvedValueOnce({ id: GUARDIAN_ID, role: Role.GUARDIAN });
      prisma.guardianRelationship.findFirst.mockResolvedValue({ id: 'rel-1', consentStatus: 'APPROVED' });
      prisma.consentRecord.create.mockResolvedValue({ id: CONSENT_ID, status: ConsentRecordStatus.ACTIVE });

      await expect(
        service.createConsentRecord(PATIENT_ID, {
          consentType: 'data_processing',
          guardianUserId: GUARDIAN_ID,
        } as any),
      ).resolves.toBeDefined();
    });
  });

  describe('revokeConsent — dono, responsável envolvido ou admin', () => {
    const baseConsent = { id: CONSENT_ID, userId: PATIENT_ID, guardianUserId: GUARDIAN_ID };

    it('o próprio dono consegue revogar', async () => {
      prisma.consentRecord.findUnique.mockResolvedValue(baseConsent);
      prisma.user.findUnique.mockResolvedValue({ role: Role.PATIENT });
      prisma.consentRecord.update.mockResolvedValue({ ...baseConsent, status: ConsentRecordStatus.REVOKED });

      const result = await service.revokeConsent(CONSENT_ID, PATIENT_ID);
      expect(result.status).toBe(ConsentRecordStatus.REVOKED);
      expect(prisma.consentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: ConsentRecordStatus.REVOKED }) }),
      );
    });

    it('um usuário alheio (não é o dono, o responsável nem admin) não consegue revogar', async () => {
      prisma.consentRecord.findUnique.mockResolvedValue(baseConsent);
      prisma.user.findUnique.mockResolvedValue({ role: Role.PATIENT });

      await expect(service.revokeConsent(CONSENT_ID, 'stranger-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.consentRecord.update).not.toHaveBeenCalled();
    });

    it('404 quando o consentimento não existe', async () => {
      prisma.consentRecord.findUnique.mockResolvedValue(null);

      await expect(service.revokeConsent('nao-existe', PATIENT_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('checkUserConsent — consentimento revogado deixa de contar como ativo', () => {
    it('retorna true quando existe consentimento ACTIVE do tipo pedido', async () => {
      prisma.consentRecord.findFirst.mockResolvedValue({ id: CONSENT_ID, status: ConsentRecordStatus.ACTIVE });

      await expect(service.checkUserConsent(PATIENT_ID, 'data_processing')).resolves.toBe(true);
      expect(prisma.consentRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ConsentRecordStatus.ACTIVE }),
        }),
      );
    });

    it('retorna false quando o único registro existente foi revogado', async () => {
      // A query já filtra status: ACTIVE — um registro REVOKED simplesmente
      // não aparece no resultado.
      prisma.consentRecord.findFirst.mockResolvedValue(null);

      await expect(service.checkUserConsent(PATIENT_ID, 'data_processing')).resolves.toBe(false);
    });
  });

  describe('getAllConsents — admin-only', () => {
    it('rejeita usuário não-admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: Role.PATIENT });

      await expect(service.getAllConsents(PATIENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.consentRecord.findMany).not.toHaveBeenCalled();
    });

    it('permite admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
      prisma.consentRecord.findMany.mockResolvedValue([]);

      await expect(service.getAllConsents('admin-1')).resolves.toEqual([]);
    });
  });

  describe('getGuardianConsents — só para GUARDIAN/ADMIN', () => {
    it('rejeita PATIENT tentando ver consentimentos "como responsável"', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: Role.PATIENT });

      await expect(service.getGuardianConsents(PATIENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
