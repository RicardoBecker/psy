import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuardianRelationshipDto } from './dto/create-guardian-relationship.dto';
import { Role, AgeGroup, ConsentStatus } from '../../common/types/auth.types';

@Injectable()
export class GuardianService {
  constructor(private readonly prisma: PrismaService) {}

  async createGuardianRelationship(
    guardianUserId: string, 
    createDto: CreateGuardianRelationshipDto
  ) {
    // Verificar se o guardian existe e tem role GUARDIAN
    const guardian = await this.prisma.user.findUnique({
      where: { id: guardianUserId },
      select: { id: true, role: true, ageGroup: true },
    });

    if (!guardian) {
      throw new NotFoundException('Usuário responsável não encontrado');
    }

    if (guardian.role !== Role.GUARDIAN && guardian.role !== Role.ADMIN) {
      throw new ForbiddenException('Usuário deve ter role GUARDIAN para criar vínculos');
    }

    // Verificar se o menor existe e é realmente menor de idade
    const minor = await this.prisma.user.findUnique({
      where: { id: createDto.minorUserId },
      select: { id: true, ageGroup: true, role: true },
    });

    if (!minor) {
      throw new NotFoundException('Usuário menor não encontrado');
    }

    if (minor.ageGroup === AgeGroup.ADULT) {
      throw new BadRequestException('Não é possível criar vínculo com usuário maior de idade');
    }

    // Verificar se já existe vínculo
    const existingRelationship = await this.prisma.guardianRelationship.findUnique({
      where: {
        minorUserId_guardianUserId: {
          minorUserId: createDto.minorUserId,
          guardianUserId: guardianUserId,
        },
      },
    });

    if (existingRelationship) {
      throw new BadRequestException('Vínculo já existe entre estes usuários');
    }

    return this.prisma.guardianRelationship.create({
      data: {
        minorUserId: createDto.minorUserId,
        guardianUserId: guardianUserId,
        relationshipType: createDto.relationshipType,
        consentStatus: ConsentStatus.PENDING,
      },
      include: {
        minorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        guardianUser: {
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

  async getGuardianRelationships(guardianUserId: string) {
    return this.prisma.guardianRelationship.findMany({
      where: { guardianUserId },
      include: {
        minorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMinorRelationships(minorUserId: string) {
    return this.prisma.guardianRelationship.findMany({
      where: { minorUserId },
      include: {
        guardianUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRelationship(relationshipId: string, userId: string) {
    // Verifica se o usuário tem permissão (é o próprio menor ou um admin)
    const relationship = await this.prisma.guardianRelationship.findUnique({
      where: { id: relationshipId },
      include: {
        minorUser: true,
        guardianUser: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Permettir se é o próprio menor ou um admin
    const canApprove = (
      userId === relationship.minorUserId || 
      user.role === Role.ADMIN
    );

    if (!canApprove) {
      throw new ForbiddenException('Sem permissão para aprovar este vínculo');
    }

    return this.prisma.guardianRelationship.update({
      where: { id: relationshipId },
      data: { consentStatus: ConsentStatus.APPROVED },
      include: {
        minorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        guardianUser: {
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

  async rejectRelationship(relationshipId: string, userId: string) {
    // Similar à aprovação, mas rejeitando
    const relationship = await this.prisma.guardianRelationship.findUnique({
      where: { id: relationshipId },
      include: {
        minorUser: true,
        guardianUser: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Permet se é o próprio menor, responsável ou um admin
    const canReject = (
      userId === relationship.minorUserId || 
      userId === relationship.guardianUserId ||
      user.role === Role.ADMIN
    );

    if (!canReject) {
      throw new ForbiddenException('Sem permissão para rejeitar este vínculo');
    }

    return this.prisma.guardianRelationship.update({
      where: { id: relationshipId },
      data: { consentStatus: ConsentStatus.REJECTED },
      include: {
        minorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        guardianUser: {
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
}