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
