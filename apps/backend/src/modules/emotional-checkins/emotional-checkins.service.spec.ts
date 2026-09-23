import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmotionalCheckinsService } from './emotional-checkins.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EmotionalCheckinsService — isolamento entre usuários (CR-06.1)', () => {
  let service: EmotionalCheckinsService;
  let prisma: {
    emotionalCheckin: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const OWNER_ID = 'owner-1';
  const OTHER_USER_ID = 'other-user-1';
  const CHECKIN_ID = 'checkin-1';

  beforeEach(async () => {
    prisma = {
      emotionalCheckin: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [EmotionalCheckinsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(EmotionalCheckinsService);
  });

  it('findOne retorna 404 quando o check-in pertence a outro usuário (IDOR)', async () => {
    prisma.emotionalCheckin.findFirst.mockResolvedValue(null);

    await expect(service.findOne(CHECKIN_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.emotionalCheckin.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CHECKIN_ID, userId: OTHER_USER_ID } }),
    );
  });

  it('update rejeita (404) quando o solicitante não é o dono, sem escrever nada', async () => {
    prisma.emotionalCheckin.findFirst.mockResolvedValue(null);

    await expect(
      service.update(CHECKIN_ID, OTHER_USER_ID, { moodScore: 1 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.emotionalCheckin.update).not.toHaveBeenCalled();
  });

  it('remove rejeita (404) quando o solicitante não é o dono, sem apagar nada', async () => {
    prisma.emotionalCheckin.findFirst.mockResolvedValue(null);

    await expect(service.remove(CHECKIN_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.emotionalCheckin.delete).not.toHaveBeenCalled();
  });

  it('findAll e getStats são escopados por userId — nunca misturam dados entre pacientes', async () => {
    prisma.emotionalCheckin.findMany.mockResolvedValue([]);

    await service.findAll(OWNER_ID);
    expect(prisma.emotionalCheckin.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: OWNER_ID } }),
    );

    await service.getStats(OWNER_ID);
    expect(prisma.emotionalCheckin.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: OWNER_ID } }),
    );
  });
});
