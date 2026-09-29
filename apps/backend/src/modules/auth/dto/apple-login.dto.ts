import { IsNotEmpty, IsString } from 'class-validator';

// 🔒 Code review PR #18 (KAN-158, P1): `state` é o valor devolvido pelo SDK
// da Apple na resposta de autorização — comparado no backend contra o
// desafio emitido por GET /auth/apple/start (ver AppleChallengeService).
//
// 🔒 KAN-158 (P2, re-review): `code` é o `authorization.code` que a Apple
// também devolve na mesma resposta do popup — AuthService.loginWithApple o
// troca no endpoint oficial da Apple (AppleTokenExchangeService) antes de
// confiar na identidade. `redirectUri` é o mesmo valor que o frontend
// passou a AppleID.auth.init() (window.location.origin); a Apple exige que
// a troca do code informe exatamente essa URI — se divergir do que foi
// usado para obter o code, a própria Apple rejeita a troca.
export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  // Validação de formato fica por conta da própria Apple (autoridade real
  // sobre o valor, na troca do code) — aqui só exigimos "não vazio", para
  // não recusar origens legítimas como IP de rede local (docker-compose).
  @IsString()
  @IsNotEmpty()
  redirectUri: string;
}
