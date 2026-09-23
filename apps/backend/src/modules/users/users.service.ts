import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, AgeGroup, calculateAgeGroup } from '../../common/types/auth.types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 🔒 Cadastro público: sempre cria PATIENT. Roles privilegiadas só via
  // fluxo administrativo (AdminUsersService.createUser), nunca por aqui.
  async create(createUserDto: CreateUserDto) {
    const { password, name, email, birthDate: birthDateInput } = createUserDto;

    const passwordHash = await bcrypt.hash(password, 10);

    // Calcular ageGroup se birthDate foi fornecido
    let ageGroup: AgeGroup = AgeGroup.ADULT; // default
    let birthDate: Date | undefined;

    if (birthDateInput) {
      birthDate = new Date(birthDateInput);
      ageGroup = calculateAgeGroup(birthDate);
    }

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.PATIENT,
        ageGroup,
        birthDate,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ageGroup: true,
        birthDate: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  // 🔒 KAN-15/KAN-16: conta criada a partir de login social — sempre
  // PATIENT (mesma regra do cadastro público comum) e sem passwordHash,
  // já que a identidade é provada pelo provedor, não por senha local.
  // Quem chama (SocialAuthService) já verificou o token antes de chegar
  // aqui; `email` e `name` já são confiáveis neste ponto.
  async createFromSocialProfile(profile: { email: string; name?: string }) {
    return this.prisma.user.create({
      data: {
        name: profile.name?.trim() || profile.email.split('@')[0],
        email: profile.email,
        passwordHash: null,
        role: Role.PATIENT,
        ageGroup: AgeGroup.ADULT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ageGroup: true,
        birthDate: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        ageGroup: true,
        birthDate: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ageGroup: true,
        birthDate: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ageGroup: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, newRole: Role, adminUserId: string) {
    // Verificar se o admin existe e tem permissão
    const admin = await this.findById(adminUserId);
    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem alterar roles');
    }

    // Não permitir remover role ADMIN do último admin
    if (newRole !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });
      
      const targetUser = await this.findById(userId);
      if (targetUser?.role === Role.ADMIN && adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ageGroup: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async deactivateUser(userId: string, adminUserId: string) {
    // Verificar se o admin existe e tem permissão
    const admin = await this.findById(adminUserId);
    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem desativar usuários');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}