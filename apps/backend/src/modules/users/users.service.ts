import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, AgeGroup, calculateAgeGroup } from '../../common/types/auth.types';
import { normalizeEmail } from '../../common/email.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 🔒 Cadastro público: sempre cria PATIENT. Roles privilegiadas só via
  // fluxo administrativo (AdminUsersService.createUser), nunca por aqui.
  async create(createUserDto: CreateUserDto) {
    const { password, name, birthDate: birthDateInput } = createUserDto;
    const email = normalizeEmail(createUserDto.email);

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

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
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