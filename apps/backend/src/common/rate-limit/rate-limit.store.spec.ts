import { RateLimitStore } from './rate-limit.store';

describe('RateLimitStore — fixed window, in-memory (KAN-18)', () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new RateLimitStore();
  });

  it('allows requests up to the limit, then blocks the next one', () => {
    const key = 'ip:/auth/login:1.2.3.4';
    for (let i = 0; i < 5; i++) {
      expect(store.hit(key, 5, 60_000).blocked).toBe(false);
    }
    expect(store.hit(key, 5, 60_000).blocked).toBe(true);
  });

  it('reports a positive retryAfterSeconds once blocked', () => {
    const key = 'ip:/auth/login:1.2.3.4';
    store.hit(key, 1, 60_000);
    const result = store.hit(key, 1, 60_000);

    expect(result.blocked).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('auto-unblocks once the window expires — no cleanup process needed (AC: "desbloqueio automático")', () => {
    const key = 'ip:/auth/login:1.2.3.4';
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000_000);
    store.hit(key, 1, 60_000); // 1ª tentativa, janela começa aqui
    expect(store.hit(key, 1, 60_000).blocked).toBe(true); // 2ª, estoura o limite

    nowSpy.mockReturnValue(1_000_000 + 60_001); // janela expirou
    expect(store.hit(key, 1, 60_000).blocked).toBe(false);

    nowSpy.mockRestore();
  });

  it('tracks different keys independently', () => {
    store.hit('ip:/auth/login:1.1.1.1', 1, 60_000);
    expect(store.hit('ip:/auth/login:1.1.1.1', 1, 60_000).blocked).toBe(true);

    // outro IP, mesma rota — janela própria, não afetada pelo primeiro
    expect(store.hit('ip:/auth/login:2.2.2.2', 1, 60_000).blocked).toBe(false);
  });
});

// 🔒 Code review PR #20 (KAN-159, P1): cardinalidade ilimitada de
// identidades arbitrárias (tráfego anônimo) não pode crescer o Map para
// sempre — o próprio controle de abuso não pode virar superfície de DoS.
describe('RateLimitStore — bounded cardinality and real expiry cleanup (KAN-159, P1)', () => {
  it('never grows past maxEntries, evicting the oldest entry (FIFO) to make room', () => {
    const store = new RateLimitStore({ maxEntries: 3, sweepIntervalMs: 60_000 });

    store.hit('key-1', 100, 60_000);
    store.hit('key-2', 100, 60_000);
    store.hit('key-3', 100, 60_000);
    expect(store.size).toBe(3);

    store.hit('key-4', 100, 60_000); // deveria expulsar key-1 (mais antiga)
    expect(store.size).toBe(3);

    // key-1 foi esquecida — uma nova "primeira tentativa" para ela não é
    // bloqueada mesmo que já estivesse perto do limite antes da eviction.
    const afterEviction = store.hit('key-1', 1, 60_000);
    expect(afterEviction.blocked).toBe(false);
  });

  it('does not evict anything when re-hitting an existing key at capacity (no artificial growth)', () => {
    const store = new RateLimitStore({ maxEntries: 2, sweepIntervalMs: 60_000 });
    store.hit('key-1', 100, 60_000);
    store.hit('key-2', 100, 60_000);

    store.hit('key-1', 100, 60_000); // já existe — não deveria disparar eviction
    expect(store.size).toBe(2);
  });

  describe('sweepExpiredNow', () => {
    it('removes only entries whose window has already expired', () => {
      const store = new RateLimitStore();
      const nowSpy = jest.spyOn(Date, 'now');

      nowSpy.mockReturnValue(1_000_000);
      store.hit('expira-logo', 10, 1_000); // expira em 1_001_000
      store.hit('ainda-vale', 10, 60_000); // expira em 1_060_000

      nowSpy.mockReturnValue(1_002_000); // só o primeiro já expirou
      const removed = store.sweepExpiredNow();

      expect(removed).toBe(1);
      expect(store.size).toBe(1);

      nowSpy.mockRestore();
    });

    it('is a no-op when nothing has expired yet', () => {
      const store = new RateLimitStore();
      store.hit('vale-ainda', 10, 60_000);

      expect(store.sweepExpiredNow()).toBe(0);
      expect(store.size).toBe(1);
    });
  });

  describe('periodic sweep lifecycle (Nest hooks)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('only starts the periodic sweep when onModuleInit runs (never on bare `new`)', () => {
      const store = new RateLimitStore({ maxEntries: 10_000, sweepIntervalMs: 1_000 });
      const sweepSpy = jest.spyOn(store, 'sweepExpiredNow');

      jest.advanceTimersByTime(5_000);
      expect(sweepSpy).not.toHaveBeenCalled(); // sem onModuleInit, nenhum timer rodando

      store.onModuleInit();
      jest.advanceTimersByTime(5_000);
      expect(sweepSpy).toHaveBeenCalled();
    });

    it('stops the periodic sweep on onModuleDestroy (no dangling timer)', () => {
      const store = new RateLimitStore({ maxEntries: 10_000, sweepIntervalMs: 1_000 });
      const sweepSpy = jest.spyOn(store, 'sweepExpiredNow');

      store.onModuleInit();
      store.onModuleDestroy();

      jest.advanceTimersByTime(10_000);
      expect(sweepSpy).not.toHaveBeenCalled();
    });
  });
});
