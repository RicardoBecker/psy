import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimitRule';

export interface RateLimitRule {
  /** Tentativas permitidas por IP dentro da janela. */
  limit: number;
  /** Duração da janela, em milissegundos. */
  windowMs: number;
}

// 🔒 KAN-18: aplica um limite de tentativas a um endpoint. O limite por
// identidade (e-mail no corpo, quando presente) é sempre a metade do
// limite por IP — uma única conta sob ataque de IPs rotativos não pode
// escapar do limite só trocando de origem.
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT_KEY, rule);
