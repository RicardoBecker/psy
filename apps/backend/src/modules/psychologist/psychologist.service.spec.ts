import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PsychologistService } from './psychologist.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ConsentStatus } from '../../common/types/auth.types';

describe('PsychologistService — descoberta e convite só para psicólogo verificado (CR-01.4)', () => {
  let service: PsychologistService;
  let prisma: {
    psychologistProfile: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    patientPsychologistLink: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const PSYCHOLOGIST_ID = 'psy-1';
  const PATIENT_ID = 'pat-1';

  beforeEach(async () => {
    prisma = {
      psychologistProfile: { findUnique: jest.fn() },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      patientPsychologistLink: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [PsychologistService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PsychologistService);
  });

  describe('searchPatients', () => {
    it('rejects with 403 when the psychologist has no profile at all', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValue(null);

      await expect(service.searchPatients(PSYCHOLOGIST_ID, 'paciente@example.com')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the profile exists but is not verified', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValue({ verified: false });

      await expect(service.searchPatients(PSYCHOLOGIST_ID, 'paciente@example.com')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('uses the exact same error message for "no profile" and "not verified" (no enumeration)', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValueOnce(null);
      const noProfileError = await service
        .searchPatients(PSYCHOLOGIST_ID, 'x@example.com')
        .catch((e) => e.message);

      prisma.psychologistProfile.findUnique.mockResolvedValueOnce({ verified: false });
      const notVerifiedError = await service
        .searchPatients(PSYCHOLOGIST_ID, 'x@example.com')
        .catch((e) => e.message);

      expect(noProfileError).toBe(notVerifiedError);
    });

    it('proceeds to search when the profile is verified', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValue({ verified: true });
      prisma.user.findMany.mockResolvedValue([{ id: PATIENT_ID, name: 'Paciente', email: 'p@example.com' }]);
      prisma.patientPsychologistLink.findMany.mockResolvedValue([]);

      const result = await service.searchPatients(PSYCHOLOGIST_ID, 'p@example.com');

      expect(result).toEqual([{ id: PATIENT_ID, name: 'Paciente', email: 'p@example.com', linkStatus: null }]);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      );
    });
  });

  describe('createPatientLink', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === PSYCHOLOGIST_ID) return Promise.resolve({ id: PSYCHOLOGIST_ID, role: Role.PSYCHOLOGIST });
        if (where.id === PATIENT_ID) return Promise.resolve({ id: PATIENT_ID, role: Role.PATIENT, isActive: true });
        return Promise.resolve(null);
      });
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(null);
      prisma.patientPsychologistLink.create.mockResolvedValue({ id: 'link-1', consentStatus: ConsentStatus.PENDING });
    });

    it('rejects with 403 when the psychologist has no verified profile, before even looking up the patient', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createPatientLink(PSYCHOLOGIST_ID, { patientId: PATIENT_ID }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.patientPsychologistLink.create).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the target patient is inactive, with the same message as "not found"', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValue({ verified: true });
      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === PSYCHOLOGIST_ID) return Promise.resolve({ id: PSYCHOLOGIST_ID, role: Role.PSYCHOLOGIST });
        if (where.id === PATIENT_ID) return Promise.resolve({ id: PATIENT_ID, role: Role.PATIENT, isActive: false });
        return Promise.resolve(null);
      });

      const inactiveError: any = await service
        .createPatientLink(PSYCHOLOGIST_ID, { patientId: PATIENT_ID })
        .catch((e) => e);

      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === PSYCHOLOGIST_ID) return Promise.resolve({ id: PSYCHOLOGIST_ID, role: Role.PSYCHOLOGIST });
        return Promise.resolve(null); // paciente não existe de verdade
      });
      const notFoundError: any = await service
        .createPatientLink(PSYCHOLOGIST_ID, { patientId: 'nao-existe' })
        .catch((e) => e);

      expect(inactiveError).toBeInstanceOf(NotFoundException);
      expect(inactiveError.message).toBe(notFoundError.message);
      expect(prisma.patientPsychologistLink.create).not.toHaveBeenCalled();
    });

    it('creates the link when the psychologist is verified and the patient is active', async () => {
      prisma.psychologistProfile.findUnique.mockResolvedValue({ verified: true });

      const result = await service.createPatientLink(PSYCHOLOGIST_ID, { patientId: PATIENT_ID });

      expect(result).toEqual({ id: 'link-1', consentStatus: ConsentStatus.PENDING });
      expect(prisma.patientPsychologistLink.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('approvePatientLink / rejectPatientLink — só o próprio paciente ou admin (CR-06.2)', () => {
    const LINK_ID = 'link-1';
    const baseLink = { id: LINK_ID, patientId: PATIENT_ID, psychologistId: PSYCHOLOGIST_ID };

    it('o próprio paciente consegue aprovar', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(baseLink);
      prisma.user.findUnique.mockResolvedValue({ id: PATIENT_ID, role: Role.PATIENT });
      (prisma.patientPsychologistLink.update as jest.Mock).mockResolvedValue({
        ...baseLink,
        consentStatus: ConsentStatus.APPROVED,
      });

      const result = await service.approvePatientLink(LINK_ID, PATIENT_ID);
      expect(result.consentStatus).toBe(ConsentStatus.APPROVED);
    });

    it('o psicólogo do próprio vínculo NÃO consegue aprovar o próprio convite (só o paciente ou admin)', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(baseLink);
      prisma.user.findUnique.mockResolvedValue({ id: PSYCHOLOGIST_ID, role: Role.PSYCHOLOGIST });

      await expect(service.approvePatientLink(LINK_ID, PSYCHOLOGIST_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.patientPsychologistLink.update).not.toHaveBeenCalled();
    });

    it('um paciente alheio (IDOR) não consegue aprovar o vínculo de outro paciente', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(baseLink);
      prisma.user.findUnique.mockResolvedValue({ id: 'other-patient', role: Role.PATIENT });

      await expect(service.approvePatientLink(LINK_ID, 'other-patient')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('admin consegue aprovar', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(baseLink);
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN });
      (prisma.patientPsychologistLink.update as jest.Mock).mockResolvedValue({
        ...baseLink,
        consentStatus: ConsentStatus.APPROVED,
      });

      await expect(service.approvePatientLink(LINK_ID, 'admin-1')).resolves.toBeDefined();
    });

    it('404 ao tentar aprovar/rejeitar um vínculo inexistente', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(null);

      await expect(service.approvePatientLink('nao-existe', PATIENT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.rejectPatientLink('nao-existe', PATIENT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('aprovar duas vezes seguidas (transição repetida) continua idempotente — sem erro, permanece APPROVED', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue({
        ...baseLink,
        consentStatus: ConsentStatus.APPROVED,
      });
      prisma.user.findUnique.mockResolvedValue({ id: PATIENT_ID, role: Role.PATIENT });
      (prisma.patientPsychologistLink.update as jest.Mock).mockResolvedValue({
        ...baseLink,
        consentStatus: ConsentStatus.APPROVED,
      });

      const result = await service.approvePatientLink(LINK_ID, PATIENT_ID);
      expect(result.consentStatus).toBe(ConsentStatus.APPROVED);
    });

    it('rejeitar um vínculo já aprovado transiciona para REJECTED (paciente pode revogar via reject)', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue({
        ...baseLink,
        consentStatus: ConsentStatus.APPROVED,
      });
      prisma.user.findUnique.mockResolvedValue({ id: PATIENT_ID, role: Role.PATIENT });
      (prisma.patientPsychologistLink.update as jest.Mock).mockResolvedValue({
        ...baseLink,
        consentStatus: ConsentStatus.REJECTED,
      });

      const result = await service.rejectPatientLink(LINK_ID, PATIENT_ID);
      expect(result.consentStatus).toBe(ConsentStatus.REJECTED);
    });

    it('um usuário completamente alheio não consegue rejeitar', async () => {
      prisma.patientPsychologistLink.findUnique.mockResolvedValue(baseLink);
      prisma.user.findUnique.mockResolvedValue({ id: 'stranger-1', role: Role.PATIENT });

      await expect(service.rejectPatientLink(LINK_ID, 'stranger-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
