import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CSRF_COOKIE_NAME } from './session-cookie';
import { SKIP_CSRF_KEY } from './skip-csrf.decorator';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// 🔒 Double-submit cookie: em toda requisição mutável, o header
// X-CSRF-Token precisa bater exatamente com o cookie csrf_token. Um
// atacante cross-site consegue fazer o navegador da vítima enviar o
// cookie automaticamente, mas não consegue LER o valor do cookie (mesma
// origem apenas) para replicar no header — por isso a dupla checagem
// neutraliza CSRF mesmo com o cookie de sessão sendo enviado.
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(req.method)) return true;

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers['x-csrf-token'];

    if (
      typeof cookieToken === 'string' &&
      typeof headerToken === 'string' &&
      cookieToken.length > 0 &&
      cookieToken === headerToken
    ) {
      return true;
    }

    throw new ForbiddenException('Token CSRF ausente ou inválido.');
  }
}
