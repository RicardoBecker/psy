import { Response } from 'express';
import { randomBytes } from 'crypto';

// 🔒 Contrato de sessão baseado em cookie (CR-05.4):
//   - `emotional_app_token`: HttpOnly — carrega o JWT, nunca legível por
//     JavaScript do navegador. Mesmo nome já usado pelo middleware do
//     Next.js, que continua funcionando sem alteração (HttpOnly só bloqueia
//     leitura via `document.cookie`, não leitura server-side).
//   - `csrf_token`: NÃO HttpOnly — par do double-submit cookie. O frontend
//     lê esse valor e ecoa como header `X-CSRF-Token` em toda requisição
//     mutável; o backend compara os dois (ver csrf.guard.ts).
export const SESSION_COOKIE_NAME = 'emotional_app_token';
export const CSRF_COOKIE_NAME = 'csrf_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function baseCookieOptions() {
  return {
    // "lax" já bloqueia o vetor clássico de CSRF cross-site em navegadores
    // modernos; o double-submit cookie (ver csrf.guard.ts) é defesa em
    // profundidade, pedida explicitamente pelo backlog.
    sameSite: 'lax' as const,
    secure: isProduction(),
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// 📱 Define os dois cookies de sessão numa resposta de login/registro.
export function setSessionCookies(res: Response, token: string): string {
  const csrfToken = generateCsrfToken();

  res.cookie(SESSION_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    httpOnly: true,
  });

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
  });

  return csrfToken;
}

// 🚪 Remove os dois cookies (logout). clearCookie já expira o cookie
// imediatamente — não passar `maxAge` (depreciado desde o Express 4.18).
export function clearSessionCookies(res: Response): void {
  const { sameSite, secure, path } = baseCookieOptions();
  const options = { sameSite, secure, path };
  res.clearCookie(SESSION_COOKIE_NAME, options);
  res.clearCookie(CSRF_COOKIE_NAME, options);
}

// 🎫 Garante que exista um csrf_token mesmo antes do login (double-submit
// cookie precisa de um par desde a primeira requisição do cliente).
export function ensureCsrfCookie(req: { cookies?: Record<string, string> }, res: Response): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), {
      ...baseCookieOptions(),
      httpOnly: false,
    });
  }
}
