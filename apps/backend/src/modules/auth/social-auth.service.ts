import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { VerifiedSocialProfile } from './providers/social-profile';

// 🔒 KAN-15/KAN-16: resolve um perfil JÁ VERIFICADO (assinatura, issuer,
// audience, expiração — ver providers/*.provider.ts) para um usuário local,
// independente do provedor. Três caminhos, nessa ordem:
//   1. Já existe SocialIdentity para (provider, providerUserId) → é a MESMA
//      pessoa que logou antes por aqui, sempre.
//   2. Não existe identidade, mas já existe User com esse e-mail → só
//      vinculamos a essa conta se o PRÓPRIO PROVEDOR confirma
//      (emailVerified) que o dono do token é dono do e-mail. Sem isso,
//      qualquer um poderia criar uma conta Google com o e-mail de outra
//      pessoa e sequestrar a conta local dela.
//   3. Nem identidade nem conta local → cria um novo User (sempre PATIENT,
//      mesma regra do cadastro público comum).
@Injectable()
export class SocialAuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async resolveOrCreateUser(profile: VerifiedSocialProfile) {
    const existingIdentity = await this.prisma.socialIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    });

    if (existingIdentity) {
      const user = await this.usersService.findById(existingIdentity.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Conta indisponível.');
      }
      return user;
    }

    const existingUser = await this.usersService.findByEmail(profile.email);
    if (existingUser) {
      if (!existingUser.isActive) {
        throw new UnauthorizedException('Conta indisponível.');
      }
      if (!profile.emailVerified) {
        throw new UnauthorizedException(
          'Não foi possível confirmar a propriedade deste e-mail junto ao provedor.',
        );
      }

      await this.prisma.socialIdentity.create({
        data: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
          userId: existingUser.id,
        },
      });

      const { passwordHash: _passwordHash, ...safeUser } = existingUser;
      return safeUser;
    }

    const newUser = await this.usersService.createFromSocialProfile({
      email: profile.email,
      name: profile.name,
    });

    await this.prisma.socialIdentity.create({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        userId: newUser.id,
      },
    });

    return newUser;
  }
}
