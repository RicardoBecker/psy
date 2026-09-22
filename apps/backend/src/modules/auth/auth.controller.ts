import { Controller, Post, Body, UseGuards, Request, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(req.user);
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