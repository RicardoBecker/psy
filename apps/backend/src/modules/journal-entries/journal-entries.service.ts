import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { JournalEntry } from '@prisma/client';

@Injectable()
export class JournalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createJournalEntryDto: CreateJournalEntryDto): Promise<JournalEntry> {
    return this.prisma.journalEntry.create({
      data: {
        userId,
        ...createJournalEntryDto,
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

  async findAll(userId: string): Promise<JournalEntry[]> {
    return this.prisma.journalEntry.findMany({
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

  async findOne(id: string, userId: string): Promise<JournalEntry> {
    const journalEntry = await this.prisma.journalEntry.findFirst({
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

    if (!journalEntry) {
      throw new NotFoundException('Journal entry not found');
    }

    return journalEntry;
  }

  async update(id: string, userId: string, updateJournalEntryDto: UpdateJournalEntryDto): Promise<JournalEntry> {
    // Verifica se existe e pertence ao usuário
    await this.findOne(id, userId);

    return this.prisma.journalEntry.update({
      where: { id },
      data: updateJournalEntryDto,
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

    await this.prisma.journalEntry.delete({
      where: { id },
    });
  }

  async search(userId: string, searchTerm: string): Promise<JournalEntry[]> {
    return this.prisma.journalEntry.findMany({
      where: {
        userId,
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
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

  async getStats(userId: string): Promise<any> {
    const totalEntries = await this.prisma.journalEntry.count({
      where: { userId },
    });

    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const entriesThisWeek = await this.prisma.journalEntry.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      totalEntries,
      entriesThisWeek,
      lastEntry,
    };
  }
}