import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../../../common/types/auth.types';
import { UsersService } from '../../users/users.service';
import { SESSION_COOKIE_NAME } from '../../../common/session-cookie';

// 🔒 CR-05.4: a sessão vive só no cookie HttpOnly — o token nunca chega ao
// backend via header Authorization, porque o navegador nunca teve acesso
// ao valor para colocar lá. Extrai exclusivamente do cookie.
function extractFromCookie(req: Request): string | null {
  return req?.cookies?.[SESSION_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // 🔒 O token só carrega `sub` como identificador. Role, status e demais
  // atributos autorizativos vêm sempre do banco, nesta requisição — nunca do
  // payload, que pode ter até 7 dias e não reflete desativação/rebaixamento.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      ageGroup: user.ageGroup,
    };
  }
}