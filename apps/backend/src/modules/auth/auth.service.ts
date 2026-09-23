import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/types/auth.types';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { SocialAuthService } from './social-auth.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private googleAuthProvider: GoogleAuthProvider,
    private appleAuthProvider: AppleAuthProvider,
    private socialAuthService: SocialAuthService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const user = await this.usersService.create(registerDto);
    const payload: JwtPayload = { 
      email: user.email, 
      sub: user.id,
      role: user.role,
      ageGroup: user.ageGroup,
    };

    return {
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  // 🔒 Retorna null (→ 401 genérico no LocalStrategy) para senha errada,
  // conta inexistente, conta SEM senha local (login-only social, KAN-15) OU
  // conta desativada — as respostas externas são indistinguíveis de
  // propósito, para não facilitar enumeração de contas nem revelar que uma
  // conta só existe via login social.
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }
    if (!user.isActive) {
      return null;
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      ageGroup: user.ageGroup,
    };
    return {
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  // 🔍 KAN-15: verifica o ID token do Google (assinatura/issuer/audience/
  // expiração) e resolve para um usuário local antes de emitir nossa
  // própria sessão — a partir daqui é indistinguível de um login comum.
  async loginWithGoogle(idToken: string) {
    const profile = await this.googleAuthProvider.verify(idToken);
    const user = await this.socialAuthService.resolveOrCreateUser(profile);
    return this.login(user);
  }

  // 🍎 KAN-16: mesmo princípio do Google — verifica o ID token da Apple
  // antes de resolver/criar o usuário local.
  async loginWithApple(idToken: string) {
    const profile = await this.appleAuthProvider.verify(idToken);
    const user = await this.socialAuthService.resolveOrCreateUser(profile);
    return this.login(user);
  }
}