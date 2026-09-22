import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

// 🔒 Cadastro público não aceita `role`: toda conta nasce PATIENT.
// Roles privilegiadas (ADMIN, PSYCHOLOGIST, GUARDIAN) só são concedidas
// pelo fluxo administrativo protegido (ver AdminUsersService.createUser).
export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}