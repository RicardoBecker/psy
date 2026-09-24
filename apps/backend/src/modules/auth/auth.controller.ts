import { Controller, Post, Get, Body, UseGuards, Request, Req, Res } from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { AppleChallengeService } from './apple-challenge.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { SkipCsrf } from '../../common/skip-csrf.decorator';
import { setSessionCookies, clearSessionCookies } from '../../common/session-cookie';
import {
  setAppleChallengeCookie,
  clearAppleChallengeCookie,
  readAppleChallengeCookie,
} from '../../common/apple-auth-challenge';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appleChallengeService: AppleChallengeService,
  ) {}

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

  // 🍎 Code review PR #18 (KAN-158, P1): gera state+nonce e guarda num
  // cookie HttpOnly de 5min — o frontend chama isto ANTES de abrir o popup
  // da Apple, e repassa os dois valores para AppleID.auth.init(). GET
  // porque não muda estado persistido (só um cookie transitório) e por
  // isso já é naturalmente isento de CSRF (CsrfGuard só age em métodos
  // mutáveis).
  @Get('apple/start')
  async startAppleAuth(@Res({ passthrough: true }) res: Response) {
    const { state, nonce, signedChallenge } = this.appleChallengeService.create();
    setAppleChallengeCookie(res, signedChallenge);
    return { state, nonce };
  }

  // 🍎 KAN-16: login com Apple. Mesmo contrato do Google acima — isento de
  // CSRF (ainda não existe sessão), `token` é o identityToken assinado pela
  // Apple. Code review PR #18 (KAN-158, P1): o cookie de desafio é sempre
  // limpo (uso único) e seu `nonce` é o que AuthService.loginWithApple usa
  // para provar que este token é resposta à tentativa que ESTE navegador
  // iniciou, não um replay.
  @SkipCsrf()
  @Post('apple')
  async appleLogin(
    @Body() dto: AppleLoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const signedChallenge = readAppleChallengeCookie(req);
    clearAppleChallengeCookie(res);
    const { nonce } = this.appleChallengeService.verify(signedChallenge, dto.state);

    const { user, access_token } = await this.authService.loginWithApple(dto.token, nonce);
    const csrfToken = setSessionCookies(res, access_token);
    return { user, csrfToken };
  }
}