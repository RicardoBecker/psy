import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Role } from '../../../../common/types/auth.types';

export class CreateAdminUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.PATIENT;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}