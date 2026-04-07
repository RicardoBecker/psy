import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../common/types/auth.types';

export const ROLES_KEY = 'roles';

/**
 * Decorator para definir roles necessárias para acessar um endpoint
 * @param roles - Roles permitidas para acessar o endpoint
 * 
 * @example
 * @Roles(Role.ADMIN)
 * @Get('admin-only')
 * adminOnlyEndpoint() {
 *   return 'Only admins can see this';
 * }
 * 
 * @example
 * @Roles(Role.ADMIN, Role.PSYCHOLOGIST)
 * @Get('staff-only') 
 * staffOnlyEndpoint() {
 *   return 'Admins and psychologists can see this';
 * }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);