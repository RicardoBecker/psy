import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

const CHALLENGE_PURPOSE = 'apple-auth-challenge';
const CHALLENGE_TTL = '5m';

interface AppleChallengePayload {
  purpose: typeof CHALLENGE_PURPOSE;
  state: string;
  nonce: string;
}

// 🔒 Code review PR #18 (KAN-158, P1): gera e valida o par state/nonce que
// vincula a resposta da Apple à tentativa que ESTE navegador iniciou.
// O desafio é assinado (JwtService, mesmo segredo/infra do resto da app) e
// guardado num cookie HttpOnly de 5 minutos — o cliente nunca escreve o
// nonce esperado, só o recebe pronto e o repassa para o SDK da Apple.
@Injectable()
export class AppleChallengeService {
  constructor(private jwtService: JwtService) {}

  create(): { state: string; nonce: string; signedChallenge: string } {
    const state = randomBytes(16).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    const payload: AppleChallengePayload = { purpose: CHALLENGE_PURPOSE, state, nonce };
    const signedChallenge = this.jwtService.sign(payload, { expiresIn: CHALLENGE_TTL });
    return { state, nonce, signedChallenge };
  }

  // 🔒 Falha (cookie ausente/expirado/adulterado, ou state divergente do
  // devolvido pela Apple) sempre com a mesma mensagem genérica — não dá
  // pista de qual verificação especificamente falhou.
  verify(signedChallenge: string | null, returnedState: string): { nonce: string } {
    if (!signedChallenge) {
      throw new UnauthorizedException('Sessão de login com Apple expirada ou ausente. Tente novamente.');
    }

    let payload: AppleChallengePayload;
    try {
      payload = this.jwtService.verify<AppleChallengePayload>(signedChallenge);
    } catch {
      throw new UnauthorizedException('Sessão de login com Apple expirada ou ausente. Tente novamente.');
    }

    if (payload.purpose !== CHALLENGE_PURPOSE || payload.state !== returnedState) {
      throw new UnauthorizedException('Sessão de login com Apple expirada ou ausente. Tente novamente.');
    }

    return { nonce: payload.nonce };
  }
}
