import { Controller, Post, Body, UseGuards, Request, Res, ServiceUnavailableException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SkipCsrf } from '../../common/skip-csrf.decorator';
import { setSessionCookies, clearSessionCookies } from '../../common/session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔒 CR-05.4: sessão vive num cookie HttpOnly, não mais no corpo da
  // resposta — o JWT nunca fica acessível a JavaScript do navegador.
  // Isento de CSRF: ainda não existe sessão para um atacante abusar aqui
  // (o risco é "logar a vítima numa conta do atacante", ameaça distinta
  // e de impacto menor do que CSRF sobre sessão já autenticada).
  @SkipCsrf()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = await this.authService.register(registerDto);
    const csrfToken = setSessionCookies(res, access_token);
    return { user, csrfToken };
  }

  @SkipCsrf()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = await this.authService.login(req.user);
    const csrfToken = setSessionCookies(res, access_token);
    return { user, csrfToken };
  }

  // 🚪 Encerra a sessão: remove os cookies no navegador. Requer estar
  // autenticado — não há sentido em "deslogar" quem não tem sessão.
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    clearSessionCookies(res);
    return { success: true };
  }

  // 🔍 Google OAuth Login — desabilitado até haver validação real do token
  // (verificação de assinatura, issuer, audience e expiração junto ao provedor).
  // Nenhum dado do corpo da requisição é usado: não há identidade a confiar aqui.
  @Post('google')
  async googleLogin() {
    throw new ServiceUnavailableException('Login com Google não está disponível no momento.');
  }

  // 🍎 Apple Sign In — desabilitado pelo mesmo motivo do Google acima.
  @Post('apple')
  async appleLogin() {
    throw new ServiceUnavailableException('Login com Apple não está disponível no momento.');
  }
}