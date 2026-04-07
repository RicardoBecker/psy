import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Role } from '../../../common/types/auth.types';

export class CreateUserDto {
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
  role?: Role;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}