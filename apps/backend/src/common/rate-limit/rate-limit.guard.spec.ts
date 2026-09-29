import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRateLimitGuard } from './rate-limit.guard';
import { RateLimitStore } from './rate-limit.store';
import { RateLimitMetricsService } from './rate-limit-metrics.service';
import { RATE_LIMIT_KEY, RateLimitRule } from './rate-limit.decorator';

function makeContext(req: Record<string, any>): ExecutionContext {
  const res = { setHeader: jest.fn() };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('AuthRateLimitGuard — IP AND identity limits, standardized 429 (KAN-18/KAN-79)', () => {
  let guard: AuthRateLimitGuard;
  let reflector: { get: jest.Mock };
  let store: RateLimitStore;
  let metrics: RateLimitMetricsService;

  const rule: RateLimitRule = { limit: 10, windowMs: 60_000 };

  beforeEach(() => {
    reflector = { get: jest.fn().mockReturnValue(rule) };
    store = new RateLimitStore();
    metrics = new RateLimitMetricsService();
    guard = new AuthRateLimitGuard(reflector as unknown as Reflector, store, metrics);
  });

  it('passes through untouched when the route has no @RateLimit() metadata', () => {
    reflector.get.mockReturnValue(undefined);
    const req = { ip: '1.1.1.1', route: { path: '/auth/logout' }, body: {} };

    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('allows requests under the IP limit', () => {
    const req = { ip: '1.1.1.1', route: { path: '/auth/login' }, body: {} };
    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('blocks with a standardized 429 body once the IP limit is exceeded', () => {
    const req = { ip: '1.1.1.1', route: { path: '/auth/login' }, body: {} };
    for (let i = 0; i < 10; i++) guard.canActivate(makeContext(req));

    try {
      guard.canActivate(makeContext(req));
      fail('deveria ter lançado 429');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const response = (err as HttpException).getResponse() as any;
      expect((err as HttpException).getStatus()).toBe(429);
      expect(response).toEqual({
        statusCode: 429,
        message: 'Muitas tentativas. Tente novamente em alguns instantes.',
        retryAfter: expect.any(Number),
      });
    }
  });

  it('sets the Retry-After response header when blocking', () => {
    const res = { setHeader: jest.fn() };
    const req = { ip: '1.1.1.1', route: { path: '/auth/login' }, body: {} };
    const context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    for (let i = 0; i < 10; i++) guard.canActivate(context);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('blocks a single identity hammered from many different IPs, even under the per-IP limit', () => {
    // limite por identidade = floor(10/2) = 5 — bem mais apertado que o de IP
    for (let i = 0; i < 5; i++) {
      const req = { ip: `10.0.0.${i}`, route: { path: '/auth/login' }, body: { email: 'vitima@example.com' } };
      expect(guard.canActivate(makeContext(req))).toBe(true);
    }

    const req = { ip: '10.0.0.99', route: { path: '/auth/login' }, body: { email: 'vitima@example.com' } };
    expect(() => guard.canActivate(makeContext(req))).toThrow(HttpException);
  });

  it('records a block in RateLimitMetricsService, keyed by route and reason', () => {
    const req = { ip: '1.1.1.1', route: { path: '/auth/login' }, body: {} };
    for (let i = 0; i < 10; i++) guard.canActivate(makeContext(req));
    expect(() => guard.canActivate(makeContext(req))).toThrow(HttpException);

    expect(metrics.getSnapshot()).toEqual(
      expect.arrayContaining([{ route: '/auth/login', reason: 'ip', count: 1 }]),
    );
  });

  it('never uses the raw email as the metrics reason (no PII leaks into metrics/logs)', () => {
    for (let i = 0; i < 5; i++) {
      const req = { ip: `10.0.1.${i}`, route: { path: '/auth/login' }, body: { email: 'vitima@example.com' } };
      guard.canActivate(makeContext(req));
    }
    const req = { ip: '10.0.1.99', route: { path: '/auth/login' }, body: { email: 'vitima@example.com' } };
    expect(() => guard.canActivate(makeContext(req))).toThrow(HttpException);

    const snapshot = metrics.getSnapshot();
    expect(snapshot.some((s) => s.reason === ('vitima@example.com' as any))).toBe(false);
    expect(snapshot).toEqual(
      expect.arrayContaining([{ route: '/auth/login', reason: 'identity', count: 1 }]),
    );
  });

  // 🔒 Code review PR #20 (KAN-159, P1): uma requisição já bloqueada por IP
  // não pode continuar criando/incrementando chaves de identidade — senão
  // um atacante já bloqueado por IP consegue crescer o store indefinidamente
  // só trocando o e-mail do corpo a cada tentativa.
  it('does not touch the identity store once the IP is already blocked (KAN-159, P1)', () => {
    const hitSpy = jest.spyOn(store, 'hit');
    const ip = '1.1.1.1';

    for (let i = 0; i < 10; i++) {
      guard.canActivate(makeContext({ ip, route: { path: '/auth/login' }, body: { email: `pessoa-${i}@example.com` } }));
    }
    hitSpy.mockClear();

    // IP já no limite — cada tentativa seguinte traz um e-mail NUNCA visto.
    for (let i = 10; i < 15; i++) {
      const req = { ip, route: { path: '/auth/login' }, body: { email: `pessoa-${i}@example.com` } };
      expect(() => guard.canActivate(makeContext(req))).toThrow(HttpException);
    }

    // toda chamada a store.hit() nessas 5 tentativas foi só a do IP —
    // nunca chegou a montar/tocar a chave `id:...` para os e-mails novos.
    const idHits = hitSpy.mock.calls.filter(([key]) => (key as string).startsWith('id:'));
    expect(idHits).toHaveLength(0);
    expect(hitSpy).toHaveBeenCalledTimes(5); // só o hit de IP, uma vez por tentativa
  });
});
