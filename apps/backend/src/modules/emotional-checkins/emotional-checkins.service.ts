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
        averageMoodScore: 0,
        averageEnergyLevel: 0,
        averageAnxietyLevel: 0,
        totalCheckins: 0,
        lastCheckin: null,
      };
    }

    const sum = checkins.reduce(
      (acc, checkin) => ({
        moodScore: acc.moodScore + checkin.moodScore,
        energyLevel: acc.energyLevel + checkin.energyLevel,
        anxietyLevel: acc.anxietyLevel + checkin.anxietyLevel,
      }),
      { moodScore: 0, energyLevel: 0, anxietyLevel: 0 }
    );

    return {
      averageMoodScore: Math.round((sum.moodScore / checkins.length) * 100) / 100,
      averageEnergyLevel: Math.round((sum.energyLevel / checkins.length) * 100) / 100,
      averageAnxietyLevel: Math.round((sum.anxietyLevel / checkins.length) * 100) / 100,
      totalCheckins: checkins.length,
      lastCheckin: checkins[0],
    };
  }
}