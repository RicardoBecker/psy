import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthProvider } from '../../../common/types/auth.types';
import { VerifiedSocialProfile } from './social-profile';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

// 🍎 KAN-16 (KAN-75): verificação de ID token do "Sign in with Apple JS".
// Mesmo princípio do Google (google.provider.ts): o frontend só nos entrega
// o `identityToken` assinado pela Apple; verificamos assinatura (contra o
// JWKS público da Apple, com cache automático de chaves), issuer e audience
// (nosso APPLE_CLIENT_ID/Services ID) antes de confiar em qualquer claim.
// Diferente do Google, não há client secret nem troca de código aqui — só
// verificação do token que o próprio navegador já recebeu da Apple.
@Injectable()
export class AppleAuthProvider {
  private readonly clientId: string | undefined;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    this.jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }

  // 🔒 Code review PR #18 (KAN-158, P1): `expectedNonce` vem de um desafio
  // que NÓS geramos e guardamos num cookie HttpOnly de curta duração (ver
  // AppleChallengeService) antes do popup da Apple abrir. Sem essa
  // checagem, um ID token Apple válido obtido FORA da tentativa atual
  // (phishing, MITM, token vazado) funcionaria como bearer credential
  // aqui — o claim `nonce` é o que prova que ESTE token é resposta a ESTE
  // desafio, não um replay. Ver
  // https://developer.apple.com/documentation/signinwithapple/verifying-a-user
  async verify(idToken: string, expectedNonce: string): Promise<VerifiedSocialProfile> {
    if (!this.clientId) {
      // 🔒 Sem client id não há audience para validar contra — aceitar o
      // token nesse estado equivaleria a pular a verificação.
      throw new UnauthorizedException('Login com Apple não está disponível no momento.');
    }

    let payload;
    try {
      const result = await jwtVerify(idToken, this.jwks, {
        issuer: APPLE_ISSUER,
        audience: this.clientId,
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException('Token da Apple inválido ou expirado.');
    }

    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    if (!sub || !email) {
      throw new UnauthorizedException('Token da Apple inválido ou expirado.');
    }

    // 🔒 Comparação estrita: nonce ausente/vazio no token OU no desafio
    // esperado, ou os dois divergentes, é sempre rejeitado — nunca "aceita
    // se os dois estiverem vazios" (uma string vazia nunca é um nonce
    // válido, então nunca deve "casar" com nada).
    if (
      !expectedNonce ||
      typeof payload.nonce !== 'string' ||
      !payload.nonce ||
      payload.nonce !== expectedNonce
    ) {
      throw new UnauthorizedException('Token da Apple inválido ou expirado.');
    }

    // 🔒 A Apple manda `email_verified` ora como boolean, ora como string
    // "true"/"false" — normaliza para nunca tratar a string "false" como
    // verdadeira (o bug clássico de "qualquer string não-vazia é truthy").
    const emailVerifiedClaim = payload.email_verified;
    const emailVerified = emailVerifiedClaim === true || emailVerifiedClaim === 'true';

    return {
      provider: AuthProvider.APPLE,
      providerUserId: sub,
      email,
      emailVerified,
    };
  }
}
