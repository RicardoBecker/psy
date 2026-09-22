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
