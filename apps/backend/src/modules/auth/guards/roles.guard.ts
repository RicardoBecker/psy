import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../common/types/auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard para controle de acesso baseado em roles (RBAC)
 * 
 * Funciona em conjunto com o decorator @Roles()
 * Verifica se o usuário autenticado possui uma das roles necessárias
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtém as roles necessárias definidas no decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não há roles definidas, permite acesso (compatibilidade com rotas existentes)
    if (!requiredRoles) {
      return true;
    }

    // Obtém o usuário do request (definido pelo JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();
    
    // Verifica se o usuário possui uma das roles necessárias
    return requiredRoles.some((role) => user.role === role);
  }
}