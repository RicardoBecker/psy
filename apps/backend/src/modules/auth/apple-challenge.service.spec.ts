import { UnauthorizedException } from '@nestjs/common';
import { AppleChallengeService } from './apple-challenge.service';

describe('AppleChallengeService — signed, short-lived state/nonce challenge (KAN-158, P1)', () => {
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let service: AppleChallengeService;

  beforeEach(() => {
    jwtService = { sign: jest.fn(), verify: jest.fn() };
    service = new AppleChallengeService(jwtService as any);
  });

  it('create() generates a distinct random state and nonce, and signs them with a 5-minute TTL', () => {
    jwtService.sign.mockReturnValue('signed.jwt.challenge');

    const { state, nonce, signedChallenge } = service.create();

    expect(state).toMatch(/^[0-9a-f]{32}$/);
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(state).not.toBe(nonce);
    expect(jwtService.sign).toHaveBeenCalledWith(
      { purpose: 'apple-auth-challenge', state, nonce },
      { expiresIn: '5m' },
    );
    expect(signedChallenge).toBe('signed.jwt.challenge');
  });

  it('verify() returns the nonce when the cookie is valid and the state matches', () => {
    jwtService.verify.mockReturnValue({ purpose: 'apple-auth-challenge', state: 's1', nonce: 'n1' });

    const result = service.verify('signed.jwt.challenge', 's1');

    expect(result).toEqual({ nonce: 'n1' });
  });

  it('rejects when there is no challenge cookie at all', () => {
    expect(() => service.verify(null, 's1')).toThrow(UnauthorizedException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects when the cookie is expired/adulterated (jwtService.verify throws)', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expect(() => service.verify('signed.jwt.challenge', 's1')).toThrow(UnauthorizedException);
  });

  it('rejects when the returned state does not match the one in the challenge', () => {
    jwtService.verify.mockReturnValue({ purpose: 'apple-auth-challenge', state: 's1', nonce: 'n1' });

    expect(() => service.verify('signed.jwt.challenge', 's2-diferente')).toThrow(UnauthorizedException);
  });

  it('rejects a token signed for a different purpose (defense in depth against token confusion)', () => {
    jwtService.verify.mockReturnValue({ purpose: 'outra-coisa', state: 's1', nonce: 'n1' });

    expect(() => service.verify('signed.jwt.challenge', 's1')).toThrow(UnauthorizedException);
  });
});
