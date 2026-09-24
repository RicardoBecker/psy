import { Injectable, Logger, Optional, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface RateLimitHitResult {
  blocked: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitStoreOptions {
  maxEntries?: number;
  sweepIntervalMs?: number;
}

// 🔒 Code review PR #20 (KAN-159, P1): cardinalidade e tempo de vida
// limitados. Sem isso, cada identidade inédita de tráfego anônimo (um
// e-mail sempre diferente no corpo, por exemplo) cria uma entrada nova no
// Map, para sempre — o próprio controle de abuso vira uma superfície de
// DoS por exaustão de memória. Duas defesas independentes:
//   1. Cardinalidade máxima com eviction FIFO — nunca deixa o Map crescer
//      além de MAX_ENTRIES, não importa quantas identidades distintas um
//      atacante enviar.
//   2. Varredura periódica removendo entradas já expiradas — mantém o Map
//      enxuto sob operação normal, não só no limite de capacidade.
const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

// 🔒 KAN-18 (KAN-79): contador em memória, janela fixa. Sem Redis no
// projeto hoje — suficiente para uma instância única; documentado como
// limitação conhecida em IA/RATE_LIMITING_SETUP.md (múltiplas instâncias
// atrás de um load balancer precisariam de um store compartilhado).
//
// "Desbloqueio automático" (AC da KAN-18) sai de graça aqui: a janela
// expira sozinha (resetAt no passado) — não existe estado "bloqueado" para
// limpar, só uma contagem que para de valer depois do TTL.
@Injectable()
export class RateLimitStore implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitStore.name);
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private sweepTimer: NodeJS.Timeout | null = null;
  private readonly maxEntries: number;
  private readonly sweepIntervalMs: number;

  // 🔒 `@Optional()` é o que permite este provider continuar sendo
  // injetado normalmente pelo Nest (RateLimitModule, testes que o listam
  // como classe pura) — sem isto, o Nest tentaria resolver um provider
  // para o tipo do parâmetro e falharia, já que `RateLimitStoreOptions` é
  // uma interface (não existe em runtime). Testes que querem um
  // maxEntries pequeno para exercitar a eviction instanciam diretamente
  // com `new RateLimitStore({ maxEntries: 3 })`, fora do Nest DI.
  constructor(@Optional() options?: RateLimitStoreOptions) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.sweepIntervalMs = options?.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  }

  // 🔒 O timer só nasce quando o Nest de fato inicializa este provider
  // dentro de uma aplicação real (app.init()) — testes que fazem
  // `new RateLimitStore()` diretamente nunca disparam isto, então não
  // vazam timers/handles abertos em suítes unitárias.
  onModuleInit(): void {
    this.sweepTimer = setInterval(() => this.sweepExpiredNow(), this.sweepIntervalMs);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  hit(key: string, limit: number, windowMs: number): RateLimitHitResult {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.setEntry(key, { count: 1, resetAt: now + windowMs });
      return { blocked: false, retryAfterSeconds: 0 };
    }

    entry.count += 1;
    const blocked = entry.count > limit;
    return { blocked, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  private setEntry(key: string, value: { count: number; resetAt: number }): void {
    if (!this.hits.has(key) && this.hits.size >= this.maxEntries) {
      // Map preserva ordem de inserção — a primeira chave iterada é a
      // mais antiga. Eviction FIFO: simples, O(1), e suficiente como
      // backstop de DoS (não precisa ser LRU de verdade para isso).
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey !== undefined) {
        this.hits.delete(oldestKey);
        this.logger.warn(
          `RateLimitStore atingiu capacidade máxima (${this.maxEntries}) — entrada mais antiga descartada.`,
        );
      }
    }
    this.hits.set(key, value);
  }

  // Exposto para teste determinístico (sem depender de timers reais) e
  // para a varredura periódica interna.
  sweepExpiredNow(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) {
        this.hits.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  // Só para teste/observabilidade — nunca usado no caminho de decisão.
  get size(): number {
    return this.hits.size;
  }
}
