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

  async verify(idToken: string): Promise<VerifiedSocialProfile> {
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
