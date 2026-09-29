import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../common/types/auth.types';
import { RateLimitMetricsService } from '../../../common/rate-limit/rate-limit-metrics.service';

// 📊 KAN-18 (KAN-80): "métricas de bloqueios" na forma mais honesta possível
// sem uma stack de observabilidade real no projeto — ver o racional
// completo em RateLimitMetricsService e no runbook em
// IA/RATE_LIMITING_SETUP.md. Contadores em memória desde o início do
// processo, só para ADMIN.
@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSecurityController {
  constructor(private readonly metrics: RateLimitMetricsService) {}

  @Get('rate-limits')
  getRateLimitMetrics() {
    return { blocks: this.metrics.getSnapshot() };
  }
}
