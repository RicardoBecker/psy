import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService.create — always creates PATIENT (CR-01.2)', () => {
  let service: UsersService;
  let prisma: { user: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'user-1', ...data })),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('persists role PATIENT for a plain registration DTO', async () => {
    await service.create({
      name: 'Paciente Teste',
      email: 'paciente@example.com',
      password: 'senha123',
    } as any);

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create.mock.calls[0][0].data.role).toBe('PATIENT');
  });

  it('ignores a role smuggled onto the DTO at the type-system boundary and still persists PATIENT', async () => {
    // CreateUserDto no longer declares `role`, but this proves the service
    // itself does not read/trust one even if something upstream slips it in.
    await service.create({
      name: 'Atacante',
      email: 'atacante@example.com',
      password: 'senha123',
      role: 'ADMIN',
    } as any);

    expect(prisma.user.create.mock.calls[0][0].data.role).toBe('PATIENT');
  });
});

describe('UsersService.createFromSocialProfile — social accounts are PATIENT with no local password (KAN-15)', () => {
  let service: UsersService;
  let prisma: { user: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'user-1', ...data })),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('creates a PATIENT with passwordHash null, using the verified email/name', async () => {
    await service.createFromSocialProfile({ email: 'social@example.com', name: 'Pessoa Social' });

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe('PATIENT');
    expect(data.passwordHash).toBeNull();
    expect(data.email).toBe('social@example.com');
    expect(data.name).toBe('Pessoa Social');
  });

  it('falls back to the email local-part as name when the provider gives none', async () => {
    await service.createFromSocialProfile({ email: 'sem.nome@example.com' });

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.name).toBe('sem.nome');
  });
});
