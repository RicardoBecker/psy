import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  // Mesma regra mínima do cadastro (RegisterDto) — consistência de política
  // de senha em toda a aplicação.
  @IsString()
  @MinLength(6)
  newPassword: string;
}
