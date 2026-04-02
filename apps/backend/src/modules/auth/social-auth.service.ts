// 🌐 Social Auth Service - Estrutura preparada para OAuth
import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class SocialAuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 🔍 Google OAuth Login
  async googleLogin(googleUser: any) {
    try {
      // TODO: Validar token do Google usando google-auth-library
      // const { OAuth2Client } = require('google-auth-library');
      // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      // const ticket = await client.verifyIdToken({
      //   idToken: token,
      //   audience: process.env.GOOGLE_CLIENT_ID,
      // });
      // const payload = ticket.getPayload();

      const { email, name, picture } = googleUser;
      
      // 🔍 Verificar se usuário já existe
      let user = await this.usersService.findByEmail(email);
      
      if (!user) {
        // 📝 Criar novo usuário social
        user = await this.usersService.createSocialUser({
          email,
          name,
          provider: 'google',
          providerId: googleUser.sub,
          picture,
        });
      }

      // 🔑 Gerar JWT
      const payload = { email: user.email, sub: user.id };
      const access_token = this.jwtService.sign(payload);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        access_token,
      };
    } catch (error) {
      throw new BadRequestException('Falha na autenticação com Google');
    }
  }

  // 🍎 Apple Sign In
  async appleLogin(appleUser: any) {
    try {
      // TODO: Validar token do Apple usando apple-signin-auth
      // const appleSignin = require('apple-signin-auth');
      // const appleIdTokenClaims = await appleSignin.verifyIdToken(token, {
      //   audience: process.env.APPLE_CLIENT_ID,
      //   ignoreExpiration: false,
      // });

      const { email, name } = appleUser;
      
      // 🔍 Verificar se usuário já existe
      let user = await this.usersService.findByEmail(email);
      
      if (!user) {
        // 📝 Criar novo usuário social
        user = await this.usersService.createSocialUser({
          email,
          name: name || 'Usuário Apple',
          provider: 'apple',
          providerId: appleUser.sub,
        });
      }

      // 🔑 Gerar JWT
      const payload = { email: user.email, sub: user.id };
      const access_token = this.jwtService.sign(payload);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        access_token,
      };
    } catch (error) {
      throw new BadRequestException('Falha na autenticação com Apple');
    }
  }
}