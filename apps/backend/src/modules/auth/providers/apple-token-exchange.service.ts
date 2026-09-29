import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const CLIENT_SECRET_TTL_SECONDS = 5 * 60;

interface AppleTokenResponse {
  id_token?: string;
  error?: string;
}

// 🔒 KAN-158 (P2, re-review PR #18): a doc oficial da Apple
// (https://developer.apple.com/documentation/signinwithapple/verifying-a-user)
// é explícita — "web apps must validate the authorization code using the
// Token validation endpoint" — a verificação local do identityToken
// (assinatura/issuer/audience/nonce, já feita em AppleAuthProvider) NÃO
// substitui essa troca; ela só valida o que o CLIENTE afirma ter recebido.
// A troca do `code` prova, server-to-server e autenticada com nosso
// client_secret, que a Apple realmente emitiu essa autorização para o
// nosso client_id — ver
// https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens
// e https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
// para o formato do client_secret (JWT ES256: iss=Team ID, sub=client_id,
// aud="https://appleid.apple.com").
@Injectable()
export class AppleTokenExchangeService {
  private readonly logger = new Logger(AppleTokenExchangeService.name);
  private readonly jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

  constructor(private readonly configService: ConfigService) {}

  // Troca `code` pelo endpoint oficial da Apple e confirma que o id_token
  // devolvido pertence ao MESMO `sub`/`nonce` já verificados no identityToken
  // que o cliente enviou — fecha o elo entre "o cliente afirma ter esse
  // token" e "a Apple confirma, agora, que emitiu essa autorização".
  async exchangeAndVerify(params: {
    code: string;
    redirectUri: string;
    expectedSub: string;
    expectedNonce: string;
  }): Promise<void> {
    const { code, redirectUri, expectedSub, expectedNonce } = params;

    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const privateKeyPem = this.configService.get<string>('APPLE_PRIVATE_KEY');

    if (!clientId || !teamId || !keyId || !privateKeyPem) {
      // 🔒 Mesma postura do AppleAuthProvider: sem credenciais para gerar o
      // client_secret não há como validar o code — recusar é o único
      // estado seguro, nunca pular a troca.
      throw new UnauthorizedException('Login com Apple não está disponível no momento.');
    }

    const clientSecret = await this.buildClientSecret({ clientId, teamId, keyId, privateKeyPem });

    let response: Response;
    try {
      response = await fetch(APPLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
    } catch (err) {
      this.logger.warn(`Falha de rede ao validar o code da Apple: ${(err as Error).message}`);
      throw new UnauthorizedException('Não foi possível validar o login com a Apple. Tente novamente.');
    }

    let data: AppleTokenResponse;
    try {
      data = (await response.json()) as AppleTokenResponse;
    } catch {
      throw new UnauthorizedException('Código de autorização da Apple inválido ou expirado.');
    }

    // 🔒 A Apple responde 400 com {error: "invalid_grant"} tanto para code
    // expirado (>5min, ver doc) quanto para code já usado — single-use é
    // garantido pelo PRÓPRIO servidor da Apple, não por estado nosso.
    if (!response.ok || !data.id_token) {
      throw new UnauthorizedException('Código de autorização da Apple inválido ou expirado.');
    }

    let payload;
    try {
      const result = await jwtVerify(data.id_token, this.jwks, {
        issuer: APPLE_ISSUER,
        audience: clientId,
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException('Código de autorização da Apple inválido ou expirado.');
    }

    // 🔒 O id_token devolvido pela TROCA precisa ser sobre a MESMA pessoa
    // (sub) e a MESMA tentativa (nonce) do identityToken que o cliente
    // enviou — sem isso, um code válido para OUTRA sessão/usuário poderia
    // ser encaixado aqui.
    if (payload.sub !== expectedSub) {
      throw new UnauthorizedException('Código de autorização da Apple inválido ou expirado.');
    }
    if (
      !expectedNonce ||
      typeof payload.nonce !== 'string' ||
      !payload.nonce ||
      payload.nonce !== expectedNonce
    ) {
      throw new UnauthorizedException('Código de autorização da Apple inválido ou expirado.');
    }
  }

  // ES256, kid=Key ID, iss=Team ID, aud="https://appleid.apple.com",
  // sub=client_id — formato exato da doc "Creating a client secret". TTL
  // curto (5min): geramos um novo a cada troca, não há motivo para um JWT
  // de vida longa por aí.
  private async buildClientSecret(config: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKeyPem: string;
  }): Promise<string> {
    const { clientId, teamId, keyId, privateKeyPem } = config;
    // 🔒 A chave privada normalmente chega como uma única linha de env var,
    // com \n literais no lugar de quebras de linha reais — sem isso,
    // importPKCS8 recebe um PEM malformado e falha.
    const normalizedPem = privateKeyPem.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(normalizedPem, 'ES256');

    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + CLIENT_SECRET_TTL_SECONDS)
      .setAudience(APPLE_ISSUER)
      .setSubject(clientId)
      .sign(privateKey);
  }
}
