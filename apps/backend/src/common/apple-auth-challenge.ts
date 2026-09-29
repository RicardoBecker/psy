import { Response, Request } from 'express';

// 🔒 Code review PR #18 (KAN-158, P1): cookie HttpOnly de curta duração
// que carrega o desafio (state/nonce) assinado — ver AppleChallengeService
// para geração/verificação. Cookie separado do de sessão (session-cookie.ts)
// porque este existe ANTES de qualquer sessão, só durante o handshake com
// a Apple.
export const APPLE_CHALLENGE_COOKIE_NAME = 'apple_auth_challenge';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function setAppleChallengeCookie(res: Response, signedChallenge: string): void {
  res.cookie(APPLE_CHALLENGE_COOKIE_NAME, signedChallenge, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: FIVE_MINUTES_MS,
  });
}

// 🔒 Uso único: sempre limpo depois de uma tentativa de POST /auth/apple,
// com sucesso ou falha — um desafio não deve poder ser reaproveitado.
export function clearAppleChallengeCookie(res: Response): void {
  res.clearCookie(APPLE_CHALLENGE_COOKIE_NAME, {
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
  });
}

export function readAppleChallengeCookie(req: Request): string | null {
  return req.cookies?.[APPLE_CHALLENGE_COOKIE_NAME] ?? null;
}
