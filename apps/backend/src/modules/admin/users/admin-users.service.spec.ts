import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../../common/types/auth.types';

// Fake mínima de `prisma.user` com semântica real de unicidade por e-mail
// (chave do Map é o valor JÁ persistido, nunca o bruto) — o suficiente para
// provar, sem precisar de Postgres, que o que fica gravado é o valor
// canônico e que uma segunda leitura por e-mail com caixa/espaços
// diferentes encontra a MESMA linha. Isso não é um cenário de
// concorrência/transação (é um bug de normalização determinístico), por
// isso um fake em memória é evidência suficiente aqui.
class FakeUserTable {
  private rows = new Map<string, any>();
  private seq = 0;

  async findUnique({ where }: { where: { id?: string; email?: string } }) {
    if (where.id) return this.rows.get(where.id) ?? null;
    if (where.email) {
      return [...this.rows.values()].find((u) => u.email === where.email) ?? null;
    }
    return null;
  }

  async create({ data, select }: { data: any; select?: any }) {
    const id = `user-${++this.seq}`;
    const row = { id, isActive: true, createdAt: new Date(), ...data };
    this.rows.set(id, row);
    return this.project(row, select);
  }

  async update({ where, data, select }: { where: { id: string }; data: any; select?: any }) {
    const existing = this.rows.get(where.id);
    const updated = { ...existing, ...data };
    this.rows.set(where.id, updated);
    return this.project(updated, select);
  }

  private project(row: any, select?: any) {
    if (!select) return row;
    return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
  }
}

// 🔒 KAN-157 (P2, re-review PR #17): AdminUsersService.createUser/updateUser
// consultavam e persistiam o e-mail sem normalizeEmail — um admin podia
// criar "Pessoa@Exemplo.com" e o login local (que normaliza antes de
// buscar) nunca encontrava a conta, além de abrir duplicata lógica por
// casing/espaços.
describe('AdminUsersService — e-mail normalizado em criação e edição (KAN-157)', () => {
  let adminUsersService: AdminUsersService;
  let usersService: UsersService;
  let fakeUsers: FakeUserTable;

  beforeEach(async () => {
    fakeUsers = new FakeUserTable();
    const prisma = { user: fakeUsers };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    adminUsersService = moduleRef.get(AdminUsersService);
    usersService = moduleRef.get(UsersService);
  });

  it('createUser() persiste o e-mail canônico e o login local (busca normalizada) encontra a conta', async () => {
    const created = await adminUsersService.createUser({
      name: 'Pessoa Admin',
      email: '  Pessoa@Exemplo.com  ',
      password: 'senha123',
      role: Role.PATIENT,
    } as any);

    // Persistência canônica: nunca o valor bruto digitado pelo admin.
    expect(created.email).toBe('pessoa@exemplo.com');

    // Reprodução do bug original: login local busca por normalizeEmail(email).
    // Antes da correção, isso retornava null porque a linha estava gravada
    // como "  Pessoa@Exemplo.com  ".
    const foundAtLogin = await usersService.findByEmail('pessoa@exemplo.com');
    expect(foundAtLogin).not.toBeNull();
    expect(foundAtLogin?.id).toBe(created.id);

    // A mesma conta também é encontrável a partir de qualquer variação de
    // caixa que um usuário digite ao logar.
    const foundWithDifferentCasing = await usersService.findByEmail('PESSOA@EXEMPLO.COM');
    expect(foundWithDifferentCasing?.id).toBe(created.id);
  });

  it('createUser() rejeita e-mail duplicado mesmo quando a diferença é só caixa/espaços', async () => {
    await adminUsersService.createUser({
      name: 'Primeira Pessoa',
      email: 'pessoa@exemplo.com',
      password: 'senha123',
      role: Role.PATIENT,
    } as any);

    await expect(
      adminUsersService.createUser({
        name: 'Segunda Pessoa',
        email: '  Pessoa@Exemplo.com  ',
        password: 'outrasenha',
        role: Role.PATIENT,
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('updateUser() detecta conflito contra um e-mail existente que difere só por caixa', async () => {
    await adminUsersService.createUser({
      name: 'Pessoa Existente',
      email: 'existente@exemplo.com',
      password: 'senha123',
      role: Role.PATIENT,
    } as any);

    const target = await adminUsersService.createUser({
      name: 'Pessoa Alvo',
      email: 'alvo@exemplo.com',
      password: 'senha123',
      role: Role.PATIENT,
    } as any);

    // Sem normalizar, "Existente@Exemplo.com" pareceria "diferente" do
    // e-mail já gravado como "existente@exemplo.com" e o conflito passaria
    // despercebido, criando duplicata lógica.
    await expect(
      adminUsersService.updateUser(target.id, { email: '  Existente@Exemplo.com  ' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('updateUser() persiste o novo e-mail já normalizado', async () => {
    const target = await adminUsersService.createUser({
      name: 'Pessoa Alvo',
      email: 'alvo@exemplo.com',
      password: 'senha123',
      role: Role.PATIENT,
    } as any);

    const updated = await adminUsersService.updateUser(target.id, {
      email: '  Novo@Exemplo.com  ',
    } as any);

    expect(updated.email).toBe('novo@exemplo.com');

    const foundAtLogin = await usersService.findByEmail('novo@exemplo.com');
    expect(foundAtLogin?.id).toBe(target.id);
  });
});
