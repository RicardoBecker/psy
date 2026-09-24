import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { SocialAuthService } from './social-auth.service';

describe('AuthService.validateUser — inactive users never authenticate (CR-02.1)', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let passwordHash: string;

  const PASSWORD = 'senhaCorreta123';

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4); // rounds baixo só para o teste ser rápido
  });

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('fake.jwt.token') } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('returns the user (without passwordHash) for an active account with correct password', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ativo@example.com',
      passwordHash,
      role: 'PATIENT',
      isActive: true,
    });

    const result = await service.validateUser('ativo@example.com', PASSWORD);

    expect(result).not.toBeNull();
    expect(result.id).toBe('user-1');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns null for a deactivated account even with the correct password', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: 'inativo@example.com',
      passwordHash,
      role: 'PATIENT',
      isActive: false,
    });

    const result = await service.validateUser('inativo@example.com', PASSWORD);

    expect(result).toBeNull();
  });

  it('returns null for a wrong password on an active account', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-3',
      email: 'ativo@example.com',
      passwordHash,
      role: 'PATIENT',
      isActive: true,
    });

    const result = await service.validateUser('ativo@example.com', 'senhaErrada');

    expect(result).toBeNull();
  });

  it('returns null for a nonexistent account', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const result = await service.validateUser('naoexiste@example.com', PASSWORD);

    expect(result).toBeNull();
  });

  // 🔒 KAN-15: contas criadas via login social (User.passwordHash nulo)
  // não podem ser "adivinhadas" por senha — bcrypt.compare nunca chega a
  // rodar contra um hash inexistente.
  it('returns null for an account created via social login (no local password set)', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-social',
      email: 'social@example.com',
      passwordHash: null,
      role: 'PATIENT',
      isActive: true,
    });

    const result = await service.validateUser('social@example.com', 'qualquerSenha123');

    expect(result).toBeNull();
  });
});
