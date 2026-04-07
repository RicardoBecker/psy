import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { Role, AgeGroup, calculateAgeGroup } from '../../../common/types/auth.types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  // 📋 Listar usuários com filtros e paginação
  async getUsers(query: GetUsersQueryDto) {
    const { search, role, ageGroup, isActive, page, limit, sortBy, sortOrder } = query;

    const where: any = {};

    // Filtros
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role;
    if (ageGroup) where.ageGroup = ageGroup;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    // Paginação
    const skip = (page - 1) * limit;

    // Ordenação
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
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
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // 👤 Obter usuário específico
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  // ➕ Criar usuário (admin)
  async createUser(createUserDto: CreateAdminUserDto) {
    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const { password, ...userData } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);

    // Calcular ageGroup se birthDate foi fornecido
    let ageGroup: AgeGroup = AgeGroup.ADULT;
    if (createUserDto.birthDate) {
      ageGroup = calculateAgeGroup(new Date(createUserDto.birthDate));
    }

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        ageGroup,
        birthDate: createUserDto.birthDate ? new Date(createUserDto.birthDate) : null,
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

  // ✏️ Atualizar usuário
  async updateUser(id: string, updateUserDto: UpdateAdminUserDto) {
    const existingUser = await this.getUserById(id);

    // Se email está sendo alterado, verificar se não existe
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      
      if (emailExists) {
        throw new ConflictException('Email já está em uso');
      }
    }

    const updateData: any = { ...updateUserDto };

    // Recalcular ageGroup se birthDate foi alterado
    if (updateUserDto.birthDate) {
      updateData.ageGroup = calculateAgeGroup(new Date(updateUserDto.birthDate));
      updateData.birthDate = new Date(updateUserDto.birthDate);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
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

  // 🔄 Alterar role do usuário
  async updateUserRole(id: string, updateRoleDto: UpdateUserRoleDto, adminId: string) {
    const user = await this.getUserById(id);

    // Verificar se o admin existe
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem alterar roles');
    }

    // Não permitir remover role ADMIN do último admin
    if (user.role === Role.ADMIN && updateRoleDto.role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: updateRoleDto.role },
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

    return updatedUser;
  }

  // 🔛 Alterar status do usuário
  async updateUserStatus(id: string, updateStatusDto: UpdateUserStatusDto, adminId: string) {
    const user = await this.getUserById(id);

    // Verificar se o admin existe
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem alterar status de usuários');
    }

    // Não permitir desativar último admin
    if (user.role === Role.ADMIN && !updateStatusDto.isActive) {
      const activeAdminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException('Não é possível desativar o último administrador');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: updateStatusDto.isActive },
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

    return updatedUser;
  }

  // 📊 Estatísticas de usuários
  async getUserStats() {
    const [
      total,
      active,
      inactive,
      byRole,
      byAgeGroup,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.user.groupBy({
        by: ['ageGroup'],
        _count: { ageGroup: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {}),
      byAgeGroup: byAgeGroup.reduce((acc, item) => {
        acc[item.ageGroup] = item._count.ageGroup;
        return acc;
      }, {}),
    };
  }
}