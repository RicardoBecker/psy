import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { SocialAuthService } from './social-auth.service';
import { PasswordResetService } from './password-reset.service';
import { MailerService } from '../../common/mailer/mailer.service';

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
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: PasswordResetService,
          useValue: { createTokenForUser: jest.fn(), consumeTokenAndUpdatePassword: jest.fn() },
        },
        { provide: MailerService, useValue: { send: jest.fn() } },
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

describe('AuthService.forgotPassword/resetPassword — no account enumeration, single-use tokens (KAN-17)', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let passwordResetService: {
    createTokenForUser: jest.Mock;
    consumeTokenAndUpdatePassword: jest.Mock;
  };
  let mailerService: { send: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };
    passwordResetService = {
      createTokenForUser: jest.fn(),
      consumeTokenAndUpdatePassword: jest.fn(),
    };
    mailerService = { send: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: GoogleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: AppleAuthProvider, useValue: { verify: jest.fn() } },
        { provide: SocialAuthService, useValue: { resolveOrCreateUser: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
        { provide: PasswordResetService, useValue: passwordResetService },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('sends a reset email with a link to an existing, active user', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'ativo@example.com', isActive: true });
    passwordResetService.createTokenForUser.mockResolvedValue('raw-token-123');

    await service.forgotPassword('ativo@example.com');

    expect(passwordResetService.createTokenForUser).toHaveBeenCalledWith('user-1');
    expect(mailerService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ativo@example.com',
        html: expect.stringContaining('http://localhost:3000/reset-password?token=raw-token-123'),
      }),
    );
  });

  it('does nothing (but does not throw) for a nonexistent email — same resolved outcome as an existing one', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.forgotPassword('naoexiste@example.com')).resolves.toBeUndefined();

    expect(passwordResetService.createTokenForUser).not.toHaveBeenCalled();
    expect(mailerService.send).not.toHaveBeenCalled();
  });

  it('does nothing for a deactivated account — same resolved outcome, no email sent', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-2', email: 'inativo@example.com', isActive: false });

    await expect(service.forgotPassword('inativo@example.com')).resolves.toBeUndefined();

    expect(mailerService.send).not.toHaveBeenCalled();
  });

  // 🔒 Code review PR #19 (KAN-156, P2): hash calculado pelo AuthService
  // ANTES de chamar o PasswordResetService — consumo do token e escrita da
  // senha agora são atômicos dentro de consumeTokenAndUpdatePassword
  // (ver password-reset.service.spec.ts para a garantia de atomicidade).
  it('resetPassword hashes the new password and delegates the atomic write to PasswordResetService', async () => {
    passwordResetService.consumeTokenAndUpdatePassword.mockResolvedValue({ userId: 'user-1' });

    await service.resetPassword('token-valido', 'novaSenhaSegura123');

    expect(passwordResetService.consumeTokenAndUpdatePassword).toHaveBeenCalledWith(
      'token-valido',
      expect.any(String),
    );
    const [, hash] = passwordResetService.consumeTokenAndUpdatePassword.mock.calls[0];
    expect(hash).not.toBe('novaSenhaSegura123'); // nunca grava a senha em texto plano
  });

  it('resetPassword rejects with a generic error for an invalid/expired/already-used token', async () => {
    passwordResetService.consumeTokenAndUpdatePassword.mockResolvedValue(null);

    await expect(service.resetPassword('token-invalido', 'novaSenhaSegura123')).rejects.toThrow(
      'Link inválido ou expirado.',
    );
  });
});
