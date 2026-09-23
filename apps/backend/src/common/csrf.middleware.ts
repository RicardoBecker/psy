import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ensureCsrfCookie } from './session-cookie';

// 🎫 Roda em toda requisição: garante que o cliente sempre tenha um
// csrf_token, mesmo antes de fazer login — necessário para o double-submit
// cookie funcionar já na primeira requisição mutável que ele fizer.
@Injectable()
export class CsrfCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    ensureCsrfCookie(req, res);
    next();
  }
}
