import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmotionalCheckinDto } from './dto/create-emotional-checkin.dto';
import { UpdateEmotionalCheckinDto } from './dto/update-emotional-checkin.dto';
import { EmotionalCheckin } from '@prisma/client';

@Injectable()
export class EmotionalCheckinsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createEmotionalCheckinDto: CreateEmotionalCheckinDto): Promise<EmotionalCheckin> {
    return this.prisma.emotionalCheckin.create({
      data: {
        userId,
        ...createEmotionalCheckinDto,
      },
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

  async findAll(userId: string): Promise<EmotionalCheckin[]> {
    return this.prisma.emotionalCheckin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

  async findOne(id: string, userId: string): Promise<EmotionalCheckin> {
    const checkin = await this.prisma.emotionalCheckin.findFirst({
      where: { id, userId },
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

    if (!checkin) {
      throw new NotFoundException('Emotional checkin not found');
    }

    return checkin;
  }

  async update(id: string, userId: string, updateEmotionalCheckinDto: UpdateEmotionalCheckinDto): Promise<EmotionalCheckin> {
    // Verifica se existe e pertence ao usuário
    await this.findOne(id, userId);

    return this.prisma.emotionalCheckin.update({
      where: { id },
      data: updateEmotionalCheckinDto,
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

  async remove(id: string, userId: string): Promise<void> {
    // Verifica se existe e pertence ao usuário
    await this.findOne(id, userId);

    await this.prisma.emotionalCheckin.delete({
      where: { id },
    });
  }

  async getStats(userId: string): Promise<any> {
    const checkins = await this.prisma.emotionalCheckin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30, // Últimos 30 registros
    });

    if (checkins.length === 0) {
      return {
        averageMood: 0,
        averageEnergy: 0,
        averageStress: 0,
        totalCheckins: 0,
        lastCheckin: null,
      };
    }

    const sum = checkins.reduce(
      (acc, checkin) => ({
        mood: acc.mood + checkin.mood,
        energy: acc.energy + checkin.energy,
        stress: acc.stress + checkin.stress,
      }),
      { mood: 0, energy: 0, stress: 0 }
    );

    return {
      averageMood: Math.round((sum.mood / checkins.length) * 100) / 100,
      averageEnergy: Math.round((sum.energy / checkins.length) * 100) / 100,
      averageStress: Math.round((sum.stress / checkins.length) * 100) / 100,
      totalCheckins: checkins.length,
      lastCheckin: checkins[0],
    };
  }
}