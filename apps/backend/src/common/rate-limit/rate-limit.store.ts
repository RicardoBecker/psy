import { Injectable } from '@nestjs/common';

export interface RateLimitHitResult {
  blocked: boolean;
  retryAfterSeconds: number;
}

// 🔒 KAN-18 (KAN-79): contador em memória, janela fixa. Sem Redis no
// projeto hoje — suficiente para uma instância única; documentado como
// limitação conhecida em IA/RATE_LIMITING_SETUP.md (múltiplas instâncias
// atrás de um load balancer precisariam de um store compartilhado).
//
// "Desbloqueio automático" (AC da KAN-18) sai de graça aqui: a janela
// expira sozinha (resetAt no passado) — não existe estado "bloqueado" para
// limpar, só uma contagem que para de valer depois do TTL.
@Injectable()
export class RateLimitStore {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, limit: number, windowMs: number): RateLimitHitResult {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return { blocked: false, retryAfterSeconds: 0 };
    }

    entry.count += 1;
    const blocked = entry.count > limit;
    return { blocked, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
}
