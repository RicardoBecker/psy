import { Module } from '@nestjs/common';
import { RateLimitStore } from './rate-limit.store';
import { RateLimitMetricsService } from './rate-limit-metrics.service';
import { AuthRateLimitGuard } from './rate-limit.guard';

// 🔒 KAN-18: importado tanto por AuthModule (quem gera os bloqueios) quanto
// por AdminModule (quem só lê as métricas em GET /admin/security/
// rate-limits) — Nest reusa a mesma instância singleton dos providers em
// ambos, então os dois enxergam o mesmo estado.
@Module({
  providers: [RateLimitStore, RateLimitMetricsService, AuthRateLimitGuard],
  exports: [RateLimitStore, RateLimitMetricsService, AuthRateLimitGuard],
})
export class RateLimitModule {}
