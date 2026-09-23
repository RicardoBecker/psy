import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntriesService } from './journal-entries.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('JournalEntriesService — isolamento entre usuários (CR-06.1)', () => {
  let service: JournalEntriesService;
  let prisma: {
    journalEntry: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  const OWNER_ID = 'owner-1';
  const OTHER_USER_ID = 'other-user-1';
  const ENTRY_ID = 'entry-1';

  beforeEach(async () => {
    prisma = {
      journalEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [JournalEntriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(JournalEntriesService);
  });

  it('findOne retorna 404 quando o dono da entrada é outro usuário (IDOR)', async () => {
    // findFirst com where: {id, userId} simplesmente não encontra nada quando
    // o id pertence a outro usuário — é exatamente isso que impede o IDOR.
    prisma.journalEntry.findFirst.mockResolvedValue(null);

    await expect(service.findOne(ENTRY_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ENTRY_ID, userId: OTHER_USER_ID } }),
    );
  });

  it('findOne retorna a entrada quando o usuário é o dono', async () => {
    const entry = { id: ENTRY_ID, userId: OWNER_ID, title: 'Meu diário' };
    prisma.journalEntry.findFirst.mockResolvedValue(entry);

    await expect(service.findOne(ENTRY_ID, OWNER_ID)).resolves.toEqual(entry);
  });

  it('update rejeita (404) quando o solicitante não é o dono, antes de escrever qualquer coisa', async () => {
    prisma.journalEntry.findFirst.mockResolvedValue(null); // não é dono

    await expect(
      service.update(ENTRY_ID, OTHER_USER_ID, { title: 'Título alterado pelo atacante' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.journalEntry.update).not.toHaveBeenCalled();
  });

  it('remove rejeita (404) quando o solicitante não é o dono, antes de apagar qualquer coisa', async () => {
    prisma.journalEntry.findFirst.mockResolvedValue(null);

    await expect(service.remove(ENTRY_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.journalEntry.delete).not.toHaveBeenCalled();
  });

  it('findAll só busca entradas do próprio usuário (where scoped por userId)', async () => {
    prisma.journalEntry.findMany.mockResolvedValue([]);

    await service.findAll(OWNER_ID);

    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: OWNER_ID } }),
    );
  });

  it('search também é escopado por userId, não vaza entradas de outros usuários', async () => {
    prisma.journalEntry.findMany.mockResolvedValue([]);

    await service.search(OWNER_ID, 'ansiedade');

    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: OWNER_ID }) }),
    );
  });
});
