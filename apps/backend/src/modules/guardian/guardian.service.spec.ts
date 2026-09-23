import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GuardianService } from './guardian.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, AgeGroup, ConsentStatus } from '../../common/types/auth.types';

describe('GuardianService (CR-06.2)', () => {
  let service: GuardianService;
  let prisma: {
    user: { findUnique: jest.Mock };
    guardianRelationship: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  };

  const GUARDIAN_ID = 'guardian-1';
  const MINOR_ID = 'minor-1';
  const RELATIONSHIP_ID = 'rel-1';

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      guardianRelationship: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [GuardianService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(GuardianService);
  });

  describe('createGuardianRelationship', () => {
    it('rejeita quando o solicitante não tem role GUARDIAN nem ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: GUARDIAN_ID, role: Role.PATIENT });

      await expect(
        service.createGuardianRelationship(GUARDIAN_ID, {
          minorUserId: MINOR_ID,
          relationshipType: 'parent',
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.guardianRelationship.create).not.toHaveBeenCalled();
    });

    it('rejeita vínculo com usuário ADULT (só menores podem ter tutor)', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: GUARDIAN_ID, role: Role.GUARDIAN })
        .mockResolvedValueOnce({ id: MINOR_ID, ageGroup: AgeGroup.ADULT });

      await expect(
        service.createGuardianRelationship(GUARDIAN_ID, {
          minorUserId: MINOR_ID,
          relationshipType: 'parent',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.guardianRelationship.create).not.toHaveBeenCalled();
    });

    it('cria o vínculo como PENDING quando o menor é de fato menor de idade', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: GUARDIAN_ID, role: Role.GUARDIAN })
        .mockResolvedValueOnce({ id: MINOR_ID, ageGroup: AgeGroup.CHILD });
      prisma.guardianRelationship.findUnique.mockResolvedValue(null);
      prisma.guardianRelationship.create.mockResolvedValue({ id: RELATIONSHIP_ID, consentStatus: ConsentStatus.PENDING });

      const result = await service.createGuardianRelationship(GUARDIAN_ID, {
        minorUserId: MINOR_ID,
        relationshipType: 'parent',
      } as any);

      expect(result.consentStatus).toBe(ConsentStatus.PENDING);
      expect(prisma.guardianRelationship.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ consentStatus: ConsentStatus.PENDING }) }),
      );
    });
  });

  describe('approveRelationship — só o próprio menor ou admin', () => {
    const baseRelationship = { id: RELATIONSHIP_ID, minorUserId: MINOR_ID, guardianUserId: GUARDIAN_ID };

    it('permite que o próprio menor aprove', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(baseRelationship);
      prisma.user.findUnique.mockResolvedValue({ id: MINOR_ID, role: Role.PATIENT });
      prisma.guardianRelationship.update.mockResolvedValue({ ...baseRelationship, consentStatus: ConsentStatus.APPROVED });

      const result = await service.approveRelationship(RELATIONSHIP_ID, MINOR_ID);
      expect(result.consentStatus).toBe(ConsentStatus.APPROVED);
    });

    it('permite que um admin aprove', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(baseRelationship);
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN });
      prisma.guardianRelationship.update.mockResolvedValue({ ...baseRelationship, consentStatus: ConsentStatus.APPROVED });

      await expect(service.approveRelationship(RELATIONSHIP_ID, 'admin-1')).resolves.toBeDefined();
    });

    it('rejeita quando o próprio responsável tenta aprovar seu próprio pedido (IDOR/self-approval)', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(baseRelationship);
      prisma.user.findUnique.mockResolvedValue({ id: GUARDIAN_ID, role: Role.GUARDIAN });

      await expect(service.approveRelationship(RELATIONSHIP_ID, GUARDIAN_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.guardianRelationship.update).not.toHaveBeenCalled();
    });

    it('rejeita quando um usuário completamente alheio tenta aprovar', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(baseRelationship);
      prisma.user.findUnique.mockResolvedValue({ id: 'stranger-1', role: Role.PATIENT });

      await expect(service.approveRelationship(RELATIONSHIP_ID, 'stranger-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('404 quando o vínculo não existe', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(null);

      await expect(service.approveRelationship('nao-existe', MINOR_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rejectRelationship — menor, responsável envolvido ou admin', () => {
    const baseRelationship = { id: RELATIONSHIP_ID, minorUserId: MINOR_ID, guardianUserId: GUARDIAN_ID };

    it('permite que o próprio responsável envolvido rejeite (diferente de approve)', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(baseRelationship);
      prisma.user.findUnique.mockResolvedValue({ id: GUARDIAN_ID, role: Role.GUARDIAN });
      prisma.guardianRelationship.update.mockResolvedValue({ ...baseRelationship, consentStatus: ConsentStatus.REJECTED });

      await expect(service.rejectRelationship(RELATIONSHIP_ID, GUARDIAN_ID)).resolves.toBeDefined();
    });

    it('rejeita quando um usuário alheio tenta rejeitar', async () => {
      prisma.guardianRelationship.findUnique.mockResolvedValue(baseRelationship);
      prisma.user.findUnique.mockResolvedValue({ id: 'stranger-1', role: Role.PATIENT });

      await expect(service.rejectRelationship(RELATIONSHIP_ID, 'stranger-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
