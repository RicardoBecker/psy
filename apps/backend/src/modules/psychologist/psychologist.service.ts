import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePsychologistProfileDto, UpdatePsychologistProfileDto } from './dto/psychologist-profile.dto';
import { CreatePatientLinkDto } from './dto/create-patient-link.dto';
import { Role, ConsentStatus } from '../../common/types/auth.types';

@Injectable()
export class PsychologistService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, createDto: CreatePsychologistProfileDto) {
    // Verificar se o usuário tem role PSYCHOLOGIST
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== Role.PSYCHOLOGIST) {
      throw new ForbiddenException('Usuário deve ter role PSYCHOLOGIST para criar perfil');
    }

    // Verificar se já existe perfil
    const existingProfile = await this.prisma.psychologistProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('Usuário já possui perfil de psicólogo');
    }

    return this.prisma.psychologistProfile.create({
      data: {
        userId,
        bio: createDto.bio,
        specialties: createDto.specialties || [],
        registrationNumber: createDto.registrationNumber,
      },
      include: {
        user: {
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

  async getProfile(userId: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de psicólogo não encontrado');
    }

    return profile;
  }

  async updateProfile(userId: string, updateDto: UpdatePsychologistProfileDto) {
    const profile = await this.getProfile(userId);

    return this.prisma.psychologistProfile.update({
      where: { id: profile.id },
      data: {
        bio: updateDto.bio,
        specialties: updateDto.specialties,
        registrationNumber: updateDto.registrationNumber,
        verified: updateDto.verified,
      },
      include: {
        user: {
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

  async createPatientLink(psychologistId: string, createDto: CreatePatientLinkDto) {
    // Verificar se o psicólogo existe e tem role/perfill correto
    const psychologist = await this.prisma.user.findUnique({
      where: { id: psychologistId },
      select: { id: true, role: true },
    });

    if (!psychologist || psychologist.role !== Role.PSYCHOLOGIST) {
      throw new ForbiddenException('Usuário deve ter role PSYCHOLOGIST');
    }

    // Verificar se o paciente existe e tem role PATIENT
    const patient = await this.prisma.user.findUnique({
      where: { id: createDto.patientId },
      select: { id: true, role: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    if (patient.role !== Role.PATIENT) {
      throw new BadRequestException('Usuário deve ter role PATIENT');
    }

    // Verificar se já existe link
    const existingLink = await this.prisma.patientPsychologistLink.findUnique({
      where: {
        patientId_psychologistId: {
          patientId: createDto.patientId,
          psychologistId: psychologistId,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException('Vínculo já existe entre este paciente e psicólogo');
    }

    return this.prisma.patientPsychologistLink.create({
      data: {
        patientId: createDto.patientId,
        psychologistId: psychologistId,
        consentStatus: ConsentStatus.PENDING,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            ageGroup: true,
          },
        },
        psychologist: {
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

  async getMyPatients(psychologistId: string) {
    return this.prisma.patientPsychologistLink.findMany({
      where: { 
        psychologistId,
        consentStatus: ConsentStatus.APPROVED,
      },
      include: {
        patient: {
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

  async getMyPsychologists(patientId: string) {
    return this.prisma.patientPsychologistLink.findMany({
      where: { 
        patientId,
        consentStatus: ConsentStatus.APPROVED,
      },
      include: {
        psychologist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingLinks(psychologistId: string) {
    return this.prisma.patientPsychologistLink.findMany({
      where: { 
        psychologistId,
        consentStatus: ConsentStatus.PENDING,
      },
      include: {
        patient: {
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

  async approvePatientLink(linkId: string, userId: string) {
    const link = await this.prisma.patientPsychologistLink.findUnique({
      where: { id: linkId },
      include: {
        patient: true,
        psychologist: true,
      },
    });

    if (!link) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    // Verificar permissão (paciente aprovar ou admin)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    const canApprove = (
      userId === link.patientId || 
      user?.role === Role.ADMIN
    );

    if (!canApprove) {
      throw new ForbiddenException('Sem permissão para aprovar este vínculo');
    }

    return this.prisma.patientPsychologistLink.update({
      where: { id: linkId },
      data: { consentStatus: ConsentStatus.APPROVED },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            ageGroup: true,
          },
        },
        psychologist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getAllPsychologists() {
    return this.prisma.psychologistProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
      where: {
        user: {
          isActive: true,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyPsychologist(profileId: string, adminUserId: string) {
    // Verificar se é admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem verificar psicólogos');
    }

    return this.prisma.psychologistProfile.update({
      where: { id: profileId },
      data: { verified: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}