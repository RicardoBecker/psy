import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RATE_LIMIT_KEY, RateLimitRule } from './rate-limit.decorator';
import { RateLimitStore } from './rate-limit.store';
import { RateLimitMetricsService } from './rate-limit-metrics.service';

// 🔒 KAN-18 (KAN-79): limita tentativas por IP E por identidade (e-mail no
// corpo, quando presente) — as duas checagens são independentes, qualquer
// uma delas bloqueando já barra a requisição. Endpoints sem @RateLimit()
// passam direto (canActivate retorna true sem nenhum custo).
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger('AuthRateLimit');

  constructor(
    private reflector: Reflector,
    private store: RateLimitStore,
    private metrics: RateLimitMetricsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const rule = this.reflector.get<RateLimitRule | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!rule) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const route = req.route?.path ?? req.path;
    const ip = req.ip ?? 'unknown';

    const byIp = this.store.hit(`ip:${route}:${ip}`, rule.limit, rule.windowMs);
    if (byIp.blocked) {
      this.blockAndThrow(route, 'ip', byIp.retryAfterSeconds, ip, res);
    }

    // 🔒 Code review PR #20 (KAN-159, P1): só toca o store de identidade
    // quando o IP NÃO bloqueou — uma requisição já rejeitada por IP não
    // precisa (e não deve) criar/incrementar mais uma chave no store por
    // uma identidade que pode ser arbitrária e sempre diferente (tráfego
    // anônimo forjando um e-mail novo a cada tentativa).
    const identity = this.extractIdentity(req);
    if (identity) {
      const identityLimit = Math.max(1, Math.floor(rule.limit / 2));
      const byIdentity = this.store.hit(`id:${route}:${identity}`, identityLimit, rule.windowMs);
      if (byIdentity.blocked) {
        this.blockAndThrow(route, 'identity', byIdentity.retryAfterSeconds, ip, res);
      }
    }

    return true;
  }

  private blockAndThrow(
    route: string,
    reason: 'ip' | 'identity',
    retryAfterSeconds: number,
    ip: string,
    res: Response,
  ): never {
    this.metrics.recordBlock(route, reason);
    // 🔒 Nunca loga o e-mail/identidade em si — só que uma tentativa foi
    // bloqueada, por qual dimensão e de onde (CR-02.1: "registrar sem dados
    // sensíveis").
    this.logger.warn(`429 em ${route} — motivo=${reason} ip=${ip}`);

    res.setHeader('Retry-After', String(retryAfterSeconds));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Muitas tentativas. Tente novamente em alguns instantes.',
        retryAfter: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private extractIdentity(req: Request): string | null {
    const email = req.body?.email;
    return typeof email === 'string' && email.length > 0 ? email.toLowerCase() : null;
  }
}
