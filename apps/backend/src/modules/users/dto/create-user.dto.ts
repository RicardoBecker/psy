import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

// 🔒 Usado apenas pelo cadastro público (UsersService.create): não aceita
// `role` — toda conta criada por este caminho é PATIENT. Criação de contas
// com outras roles é exclusiva do fluxo administrativo protegido.
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
  @IsDateString()
  birthDate?: string;
}