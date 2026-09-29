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

// 🔒 Code review PR #20 (KAN-159, P1/P2): cardinalidade ilimitada de
// identidades arbitrárias (tráfego anônimo) não pode crescer o Map para
// sempre — o próprio controle de abuso não pode virar superfície de DoS.
//
// 🔒 KAN-159 (P2, re-review): a v1 (eviction FIFO incondicional) tinha um
// defeito de segurança oposto ao que resolvia — o teste "evicting the
// oldest entry (FIFO)" desta suíte PROVAVA isso: uma entrada evictada
// "voltava como primeira tentativa livre", ou seja, um atacante saturando
// o store com cardinalidade nova conseguia expulsar sua PRÓPRIA entrada já
// bloqueada e continuar tentando. Esse teste foi removido — o
// comportamento que ele documentava não existe mais — e substituído pelos
// testes abaixo, que prezam a garantia oposta: nenhuma entrada ainda
// válida (bloqueada ou não) é expulsa; ao saturar, a store falha fechado.
describe('RateLimitStore — bounded cardinality and real expiry cleanup (KAN-159, P1/P2)', () => {
  it('does not evict anything when re-hitting an existing key at capacity (no artificial growth)', () => {
    const store = new RateLimitStore({ maxEntries: 2, sweepIntervalMs: 60_000 });
    store.hit('key-1', 100, 60_000);
    store.hit('key-2', 100, 60_000);

    store.hit('key-1', 100, 60_000); // já existe — não deveria disparar eviction
    expect(store.size).toBe(2);
  });

  // 🔒 KAN-159 (P2): o cenário de aceite do finding — uma chave já
  // bloqueada nunca é expulsa para abrir espaço para cardinalidade nova,
  // mesmo com o store saturado.
  it('never evicts a currently-blocked entry to admit a brand-new key — fails closed instead', () => {
    const store = new RateLimitStore({ maxEntries: 3, sweepIntervalMs: 60_000 });

    // Satura a capacidade: uma chave ATIVAMENTE BLOQUEADA (2 hits, limite 1)
    // e duas outras chaves ainda válidas (não bloqueadas).
    store.hit('atacante', 1, 60_000);
    expect(store.hit('atacante', 1, 60_000).blocked).toBe(true);
    store.hit('outra-1', 100, 60_000);
    store.hit('outra-2', 100, 60_000);
    expect(store.size).toBe(3);

    // Uma identidade nunca vista antes chega com o store saturado — v1
    // expulsaria 'atacante' (a mais antiga) para abrir espaço; v2 recusa a
    // nova identidade (fail closed) em vez disso.
    const novaIdentidade = store.hit('nunca-vista-antes', 100, 60_000);
    expect(novaIdentidade.blocked).toBe(true);
    expect(store.size).toBe(3); // ninguém foi expulso

    // A prova decisiva: 'atacante' CONTINUA bloqueada — não foi resetada
    // por uma eviction que a old implementation teria disparado aqui.
    const aindaBloqueada = store.hit('atacante', 1, 60_000);
    expect(aindaBloqueada.blocked).toBe(true);
  });

  // Mesmo cenário, mas provando que uma entrada válida NÃO bloqueada
  // também nunca é expulsa (a garantia vale para toda entrada dentro da
  // janela, não só para as bloqueadas).
  it('never evicts a currently-valid, not-yet-blocked entry either', () => {
    const store = new RateLimitStore({ maxEntries: 2, sweepIntervalMs: 60_000 });

    store.hit('valida-1', 100, 60_000);
    store.hit('valida-2', 100, 60_000);
    expect(store.size).toBe(2);

    store.hit('nova-identidade', 100, 60_000); // store saturado, nada expirou
    expect(store.size).toBe(2);

    // 'valida-1' nunca foi tocada por uma eviction — continua como estava.
    const resultado = store.hit('valida-1', 100, 60_000);
    expect(resultado.blocked).toBe(false);
  });

  // 🔒 A saturação é o pior caso, não o único: quando há espaço porque
  // entradas EXPIRARAM (não porque estão vazias desde o início), a nova
  // identidade deve ser admitida normalmente — sweepExpiredNow oportunista
  // dentro de tryAdmitNewKey já reclama esse espaço antes de recusar.
  it('reclaims space from already-expired entries before falling back to fail-closed', () => {
    const store = new RateLimitStore({ maxEntries: 2, sweepIntervalMs: 60_000 });
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000_000);
    store.hit('expira-logo', 100, 1_000); // expira em 1_001_000
    store.hit('ainda-vale', 100, 60_000); // expira em 1_060_000
    expect(store.size).toBe(2);

    nowSpy.mockReturnValue(1_002_000); // 'expira-logo' já expirou
    const resultado = store.hit('identidade-nova', 100, 60_000);

    expect(resultado.blocked).toBe(false); // admitida — havia espaço real
    expect(store.size).toBe(2); // 'expira-logo' saiu, 'identidade-nova' entrou

    nowSpy.mockRestore();
  });

  // Log de saturação agregado — não um WARN por requisição rejeitada
  // (um atacante gerando cardinalidade nova geraria um log por tentativa).
  it('throttles the saturation warning log instead of logging on every rejected admission', () => {
    const store = new RateLimitStore({ maxEntries: 1, sweepIntervalMs: 60_000 });
    const warnSpy = jest.spyOn((store as any).logger, 'warn').mockImplementation(() => undefined);

    store.hit('ocupa-a-unica-vaga', 100, 60_000);
    for (let i = 0; i < 5; i++) {
      store.hit(`nova-identidade-${i}`, 100, 60_000);
    }

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
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
