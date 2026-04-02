import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialAuthService: SocialAuthService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(req.user);
  }

  // 🔍 Google OAuth Login
  @Post('google')
  async googleLogin(@Body() body: { token: string }) {
    // TODO: Implementar validação completa do token Google
    // Por enquanto, estrutura preparada para receber o token do frontend
    
    // Simular dados do Google (substituir pela validação real)
    const mockGoogleUser = {
      sub: 'google_' + Date.now(),
      email: 'user@gmail.com', // Este virá do token real
      name: 'Usuário Google',   // Este virá do token real
      picture: 'https://...',   // Este virá do token real
    };

    return this.socialAuthService.googleLogin(mockGoogleUser);
  }

  // 🍎 Apple Sign In
  @Post('apple') 
  async appleLogin(@Body() body: { token: string }) {
    // TODO: Implementar validação completa do token Apple
    // Por enquanto, estrutura preparada para receber o token do frontend
    
    // Simular dados do Apple (substituir pela validação real)
    const mockAppleUser = {
      sub: 'apple_' + Date.now(),
      email: 'user@icloud.com', // Este virá do token real
      name: 'Usuário Apple',     // Este virá do token real
    };

    return this.socialAuthService.appleLogin(mockAppleUser);
  }
}