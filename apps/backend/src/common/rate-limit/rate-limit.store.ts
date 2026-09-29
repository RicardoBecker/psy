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
//   1. Cardinalidade máxima — nunca deixa o Map crescer além de
//      MAX_ENTRIES, não importa quantas identidades distintas um atacante
//      enviar.
//   2. Varredura periódica removendo entradas já expiradas — mantém o Map
//      enxuto sob operação normal, não só no limite de capacidade.
//
// 🔒 KAN-159 (P2, re-review PR #20): a v1 usava eviction FIFO incondicional
// — expulsava a entrada mais antiga do Map mesmo que ela estivesse
// ATIVAMENTE bloqueada (count > limit, dentro da janela). Um atacante
// gerando cardinalidade nova (IPs/identidades distintas) conseguia,
// efetivamente, desbloquear a si mesmo: bastava saturar o Map para expulsar
// sua PRÓPRIA entrada já bloqueada, que voltava como "primeira tentativa
// livre" na próxima requisição — o oposto do que o rate limiter existe
// para fazer. O teste anterior ("evicting the oldest entry (FIFO) to make
// room") provava exatamente esse efeito, não o desprovava.
//
// v2: nunca expulsa uma entrada ainda dentro da janela (bloqueada ou não).
// Ao saturar, primeiro tenta liberar espaço removendo entradas já
// EXPIRADAS (sweepExpiredNow, oportunista além da varredura periódica); se
// mesmo assim não há espaço — todas as MAX_ENTRIES entradas ainda são
// válidas —, falha fechado: a nova identidade é tratada como bloqueada em
// vez de expulsar alguém. Sob um ataque distribuído grande o bastante para
// saturar o store com entradas genuinamente ativas, isso significa negar
// identidades novas também — postura de segurança deliberada (a alternativa,
// resetar o bloqueio de quem já está sendo limitado, é pior). Um store
// externo compartilhado (Redis) é o caminho para erguer o teto de
// MAX_ENTRIES sem esse trade-off; ver IA/RATE_LIMITING_SETUP.md.
const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_SWEEP_INTERVAL_MS = 60_000;
// Não loga a cada rejeição por saturação (um atacante gerando cardinalidade
// nova geraria um WARN por requisição) — agrega num intervalo mínimo entre
// logs.
const SATURATION_LOG_INTERVAL_MS = 60_000;

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
  private lastSaturationLogAt = 0;

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
      const admitted = this.tryAdmitNewKey(key, { count: 1, resetAt: now + windowMs });
      if (!admitted) {
        // 🔒 KAN-159 (P2): capacidade esgotada com só entradas ainda
        // válidas — falha fechado (nega a identidade nova) em vez de
        // expulsar alguém que já está sendo rastreado/bloqueado.
        return { blocked: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
      }
      return { blocked: false, retryAfterSeconds: 0 };
    }

    entry.count += 1;
    const blocked = entry.count > limit;
    return { blocked, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  // Retorna false quando o store está saturado com entradas ainda válidas
  // e não há espaço a liberar — chamador decide o que fazer (fail closed).
  private tryAdmitNewKey(key: string, value: { count: number; resetAt: number }): boolean {
    if (this.hits.size >= this.maxEntries) {
      // Antes de recusar, tenta liberar espaço removendo o que já expirou
      // — sob operação normal isso já reclama a maior parte da pressão sem
      // nunca precisar recusar nada.
      this.sweepExpiredNow();
    }
    if (this.hits.size >= this.maxEntries) {
      this.logSaturation();
      return false;
    }
    this.hits.set(key, value);
    return true;
  }

  private logSaturation(): void {
    const now = Date.now();
    if (now - this.lastSaturationLogAt < SATURATION_LOG_INTERVAL_MS) return;
    this.lastSaturationLogAt = now;
    this.logger.warn(
      `RateLimitStore em capacidade máxima (${this.maxEntries}) com todas as entradas ainda válidas — novas identidades sendo recusadas (fail closed) até haver espaço.`,
    );
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
