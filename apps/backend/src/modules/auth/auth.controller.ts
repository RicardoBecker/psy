import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  // 🔍 KAN-15: login com Google. Assim como register/login, isento de CSRF
  // — ainda não existe sessão para um atacante abusar aqui. O `token` é o
  // ID token assinado pelo Google (Google Identity Services no frontend);
  // AuthService.loginWithGoogle verifica assinatura/issuer/audience/
  // expiração antes de confiar em qualquer claim dele.
  @SkipCsrf()
  @Post('google')
  async googleLogin(
    @Body() dto: SocialLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = await this.authService.loginWithGoogle(dto.token);
    const csrfToken = setSessionCookies(res, access_token);
    return { user, csrfToken };
  }

  // 🍎 KAN-16: login com Apple. Mesmo contrato do Google acima — isento de
  // CSRF (ainda não existe sessão), `token` é o identityToken assinado pela
  // Apple, verificado em AuthService.loginWithApple antes de confiar nele.
  @SkipCsrf()
  @Post('apple')
  async appleLogin(
    @Body() dto: SocialLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = await this.authService.loginWithApple(dto.token);
    const csrfToken = setSessionCookies(res, access_token);
    return { user, csrfToken };
  }

  // 🔒 KAN-17: mesma resposta genérica sempre — não confirma nem nega que
  // o e-mail existe (anti-enumeração de contas). Isento de CSRF: quem
  // solicita isso não tem sessão nenhuma (nem própria, nem de vítima) para
  // um atacante abusar.
  @SkipCsrf()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Se o e-mail existir, enviaremos instruções de recuperação.' };
  }

  // 🔒 KAN-17: a prova de autorização aqui é o próprio token (só quem tem
  // acesso à caixa de entrada do e-mail o recebeu) — não uma sessão, por
  // isso isento de CSRF como os demais endpoints de entrada.
  @SkipCsrf()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }
}