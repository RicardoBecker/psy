import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, AgeGroup, calculateAgeGroup } from '../../common/types/auth.types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    
    // Validar que não está tentando criar ADMIN via API pública
    if (createUserDto.role === Role.ADMIN) {
      throw new ForbiddenException('Não é possível criar usuário ADMIN via API pública');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Calcular ageGroup se birthDate foi fornecido
    let ageGroup: AgeGroup = AgeGroup.ADULT; // default
    let birthDate: Date | undefined;
    
    if (createUserDto.birthDate) {
      birthDate = new Date(createUserDto.birthDate);
      ageGroup = calculateAgeGroup(birthDate);
    }

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        role: createUserDto.role || Role.PATIENT, // default PATIENT
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