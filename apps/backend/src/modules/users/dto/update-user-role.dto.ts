import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../../common/types/auth.types';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}