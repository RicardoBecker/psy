import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsentRecordDto } from './dto/create-consent-record.dto';
import { ConsentRecordStatus, AgeGroup, Role } from '../../common/types/auth.types';

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async createConsentRecord(userId: string, createDto: CreateConsentRecordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ageGroup: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Para menores de idade, verificar se há responsável legal
    if ((user.ageGroup === AgeGroup.CHILD || user.ageGroup === AgeGroup.ADOLESCENT) 
        && !createDto.guardianUserId) {
      throw new BadRequestException('Menores de idade precisam de consentimento do responsável legal');
    }

    // Se guardianUserId foi fornecido, verificar se é válido
    if (createDto.guardianUserId) {
      const guardian = await this.prisma.user.findUnique({
        where: { id: createDto.guardianUserId },
        select: { id: true, role: true },
      });

      if (!guardian || (guardian.role !== Role.GUARDIAN && guardian.role !== Role.ADMIN)) {
        throw new BadRequestException('Responsável legal inválido');
      }

      // Verificar se existe vínculo aprovado
      const relationship = await this.prisma.guardianRelationship.findFirst({
        where: {
          minorUserId: userId,
          guardianUserId: createDto.guardianUserId,
          consentStatus: 'APPROVED',
        },
      });

      if (!relationship && guardian.role !== Role.ADMIN) {
        throw new BadRequestException('Não existe vínculo aprovado com este responsável');
      }
    }

    return this.prisma.consentRecord.create({
      data: {
        userId,
        guardianUserId: createDto.guardianUserId,
        consentType: createDto.consentType,
        status: ConsentRecordStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        guardian: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getUserConsents(userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { userId },
      include: {
        guardian: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async getGuardianConsents(guardianUserId: string) {
    const guardian = await this.prisma.user.findUnique({
      where: { id: guardianUserId },
      select: { role: true },
    });

    if (!guardian || (guardian.role !== Role.GUARDIAN && guardian.role !== Role.ADMIN)) {
      throw new ForbiddenException('Usuário não é responsável legal');
    }

    return this.prisma.consentRecord.findMany({
      where: { guardianUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async revokeConsent(consentId: string, requestingUserId: string) {
    const consent = await this.prisma.consentRecord.findUnique({
      where: { id: consentId },
      include: {
        user: true,
        guardian: true,
      },
    });

    if (!consent) {
      throw new NotFoundException('Consentimento não encontrado');
    }

    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true },
    });

    // Permitir revogação se é o próprio usuário, responsável ou admin
    const canRevoke = (
      requestingUserId === consent.userId ||
      requestingUserId === consent.guardianUserId ||
      requestingUser?.role === Role.ADMIN
    );

    if (!canRevoke) {
      throw new ForbiddenException('Sem permissão para revogar este consentimento');
    }

    return this.prisma.consentRecord.update({
      where: { id: consentId },
      data: {
        status: ConsentRecordStatus.REVOKED,
        revokedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        guardian: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async checkUserConsent(userId: string, consentType: string): Promise<boolean> {
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        userId,
        consentType,
        status: ConsentRecordStatus.ACTIVE,
      },
    });

    return !!consent;
  }

  async getAllConsents(adminUserId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem ver todos os consentimentos');
    }

    return this.prisma.consentRecord.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        guardian: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }
}