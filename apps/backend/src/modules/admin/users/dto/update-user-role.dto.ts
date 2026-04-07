import { IsEnum } from 'class-validator';
import { Role } from '../../../../common/types/auth.types';

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}