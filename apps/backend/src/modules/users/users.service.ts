import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

interface CreateSocialUserDto {
  email: string;
  name: string;
  provider: string;
  providerId: string;
  picture?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  // 🌐 Criar usuário social (Google/Apple)
  async createSocialUser(socialUserData: CreateSocialUserDto) {
    const user = await this.prisma.user.create({
      data: {
        name: socialUserData.name,
        email: socialUserData.email,
        // Para usuários sociais, usamos um hash vazio como placeholder
        passwordHash: 'SOCIAL_AUTH_USER', // Placeholder para indicar que é usuário social
        // TODO: Adicionar campos provider e providerId no schema se necessário
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
  }
}