import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy.validate — trusts the database, not the token payload (CR-02.2)', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  const stalePayload = {
    sub: 'user-1',
    email: 'user@example.com',
    role: 'ADMIN', // claim embutida no token, pode ter até 7 dias
    ageGroup: 'ADULT',
  };

  beforeEach(async () => {
    usersService = { findById: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('returns the CURRENT role from the database, ignoring a stale ADMIN claim in the token', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'PATIENT', // já foi rebaixado no banco depois que o token foi emitido
      ageGroup: 'ADULT',
      isActive: true,
    });

    const result = await strategy.validate(stalePayload as any);

    expect(result.role).toBe('PATIENT');
  });

  it('rejects with 401 when the user has been deactivated since the token was issued', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
      ageGroup: 'ADULT',
      isActive: false,
    });

    await expect(strategy.validate(stalePayload as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects with 401 when the user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(strategy.validate(stalePayload as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('never trusts role/ageGroup straight from the payload for an active user', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'fresh@example.com',
      role: 'PSYCHOLOGIST',
      ageGroup: 'ADOLESCENT',
      isActive: true,
    });

    const result = await strategy.validate(stalePayload as any);

    // payload dizia ADMIN/ADULT/user@example.com — o resultado deve refletir
    // exclusivamente o que veio do banco nesta chamada.
    expect(result).toEqual({
      id: 'user-1',
      email: 'fresh@example.com',
      role: 'PSYCHOLOGIST',
      ageGroup: 'ADOLESCENT',
    });
  });
});
