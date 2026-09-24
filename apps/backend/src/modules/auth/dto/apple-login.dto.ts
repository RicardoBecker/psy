import { IsNotEmpty, IsString } from 'class-validator';

// 🔒 Code review PR #18 (KAN-158, P1): `state` é o valor devolvido pelo SDK
// da Apple na resposta de autorização — comparado no backend contra o
// desafio emitido por GET /auth/apple/start (ver AppleChallengeService).
export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
