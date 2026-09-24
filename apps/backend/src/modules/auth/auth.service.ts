import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/types/auth.types';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { SocialAuthService } from './social-auth.service';
import { PasswordResetService } from './password-reset.service';
import { buildPasswordResetEmail } from './password-reset-email';
import { MailerService } from '../../common/mailer/mailer.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private googleAuthProvider: GoogleAuthProvider,
    private appleAuthProvider: AppleAuthProvider,
    private socialAuthService: SocialAuthService,
    private passwordResetService: PasswordResetService,
    private mailerService: MailerService,
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
  // antes de resolver/criar o usuário local. `expectedNonce` (Code review
  // PR #18, KAN-158, P1) já foi extraído e validado quanto ao `state` pelo
  // AppleChallengeService no controller.
  async loginWithApple(idToken: string, expectedNonce: string) {
    const profile = await this.appleAuthProvider.verify(idToken, expectedNonce);
    const user = await this.socialAuthService.resolveOrCreateUser(profile);
    return this.login(user);
  }

  // 🔒 KAN-17: SEMPRE resolve com sucesso (void), exista ou não a conta —
  // é o controller quem devolve a mesma mensagem genérica nos dois casos.
  // Só envia e-mail de verdade quando existe conta ativa com aquele e-mail;
  // contas social-only (sem passwordHash ainda) também recebem, porque
  // definir uma senha aqui é um jeito legítimo de recuperar acesso.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return;

    const rawToken = await this.passwordResetService.createTokenForUser(user.id);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const { subject, html, text } = buildPasswordResetEmail(resetUrl);

    await this.mailerService.send({ to: user.email, subject, html, text });
  }

  // 🔒 KAN-17: token inválido/expirado/já usado gera sempre a mesma
  // BadRequestException genérica — não diferenciamos os três casos na
  // resposta (evita dar pistas sobre o estado interno do token a quem
  // estiver testando valores).
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const consumed = await this.passwordResetService.consumeToken(token);
    if (!consumed) {
      throw new BadRequestException('Link inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(consumed.userId, passwordHash);
  }
}