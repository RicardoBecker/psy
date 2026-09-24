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

// 🔒 Code review PR #17 (KAN-157, P2): sem normalização, "Pessoa@x.com" e
// "pessoa@x.com" colidem na busca (coluna Postgres sensível a caixa) e
// viram duas contas para o mesmo endereço lógico.
describe('UsersService — email normalizado em toda borda (trim + lowercase) (KAN-157)', () => {
  let service: UsersService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'user-1', ...data })),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('create() persists a lowercased, trimmed email regardless of how it was typed', async () => {
    await service.create({
      name: 'Pessoa',
      email: '  Pessoa@Exemplo.com  ',
      password: 'senha123',
    } as any);

    expect(prisma.user.create.mock.calls[0][0].data.email).toBe('pessoa@exemplo.com');
  });

  it('findByEmail() normalizes the lookup value before querying, so casing never misses an existing account', async () => {
    await service.findByEmail('Pessoa@Exemplo.com');

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'pessoa@exemplo.com' } }),
    );
  });
});
