import { Injectable } from '@nestjs/common';

export type RateLimitReason = 'ip' | 'identity';

export interface RateLimitMetricSnapshot {
  route: string;
  reason: RateLimitReason;
  count: number;
}

// 📊 KAN-18 (KAN-80): "métricas de bloqueios" na forma mais honesta possível
// sem uma stack de observabilidade real no projeto — contadores em memória
// desde o início do processo, expostos via GET /admin/security/rate-limits
// (ver AdminSecurityController). Zeram a cada deploy/restart; não são
// histórico persistente. Ver IA/RATE_LIMITING_SETUP.md para o runbook de
// alertas (que depende da stack de logs do ambiente de produção).
@Injectable()
export class RateLimitMetricsService {
  private readonly counts = new Map<string, number>();

  recordBlock(route: string, reason: RateLimitReason): void {
    const key = `${route}|${reason}`;
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  getSnapshot(): RateLimitMetricSnapshot[] {
    return Array.from(this.counts.entries()).map(([key, count]) => {
      const [route, reason] = key.split('|') as [string, RateLimitReason];
      return { route, reason, count };
    });
  }
}
