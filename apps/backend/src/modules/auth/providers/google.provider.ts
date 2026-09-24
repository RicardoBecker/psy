import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider } from '../../../common/types/auth.types';
import { VerifiedSocialProfile } from './social-profile';

// 🔒 KAN-15 (KAN-73): verificação de ID token do Google Identity Services.
// O frontend nunca nos manda "quem é o usuário" em texto puro — manda o
// `credential` (JWT) que o próprio Google assinou. `verifyIdToken` valida
// assinatura (contra as chaves públicas do Google, com cache/rotação
// automáticos), issuer, audience (nosso GOOGLE_CLIENT_ID) e expiração.
// Qualquer campo do payload (email, nome, sub) só é confiável DEPOIS dessa
// verificação passar — é isso que nos permite ignorar o que o cliente diga
// sobre si mesmo.
@Injectable()
export class GoogleAuthProvider {
  private readonly client: OAuth2Client;
  private readonly clientId: string | undefined;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<VerifiedSocialProfile> {
    if (!this.clientId) {
      // 🔒 Sem client id configurado não há audience para validar contra —
      // aceitar o token nesse estado equivaleria a pular a verificação.
      throw new UnauthorizedException('Login com Google não está disponível no momento.');
    }

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido ou expirado.');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token do Google inválido ou expirado.');
    }

    return {
      provider: AuthProvider.GOOGLE,
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name,
    };
  }
}
