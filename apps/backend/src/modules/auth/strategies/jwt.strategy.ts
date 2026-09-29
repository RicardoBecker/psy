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

    // 🔒 KAN-17: um reset de senha marca passwordChangedAt — qualquer token
    // emitido ANTES desse instante (iat, em segundos) é rejeitado aqui,
    // mesmo que ainda não tenha expirado. É assim que "nova senha invalida
    // sessões anteriores" funciona sem precisar de blacklist/sessão no banco.
    //
    // 🔒 Code review PR #19 (KAN-156, P2): `iat` tem precisão de SEGUNDOS
    // (padrão JWT), mas `passwordChangedAt` é um Date com milissegundos.
    // Comparar `iat * 1000 < passwordChangedAt.getTime()` direto rejeitava
    // até um login legítimo emitido no MESMO segundo do reset (iat
    // truncado para o início do segundo sempre fica "no passado" frente a
    // um passwordChangedAt com milissegundos não-zero). Corrigido
    // truncando passwordChangedAt para a mesma precisão (segundos) antes
    // de comparar — aceita, de propósito, uma janela de até ~1s onde um
    // token emitido pouco ANTES do reset (mesmo segundo) ainda passaria;
    // impacto prático desprezível (exigiria um token roubado emitido no
    // mesmíssimo segundo do reset da vítima) frente ao risco maior de
    // rejeitar sessões legítimas.
    if (user.passwordChangedAt) {
      const passwordChangedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (!payload.iat || payload.iat < passwordChangedAtSeconds) {
        throw new UnauthorizedException();
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      ageGroup: user.ageGroup,
    };
  }
}