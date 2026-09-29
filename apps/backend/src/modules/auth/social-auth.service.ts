import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { normalizeEmail } from '../../common/email.util';
import { Role, AgeGroup } from '../../common/types/auth.types';
import { VerifiedSocialProfile } from './providers/social-profile';

const UNIQUE_VIOLATION = 'P2002';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  ageGroup: true,
  birthDate: true,
  isActive: true,
  createdAt: true,
} as const;

// 🔒 KAN-15/KAN-16: resolve um perfil JÁ VERIFICADO (assinatura, issuer,
// audience, expiração — ver providers/*.provider.ts) para um usuário
// local, independente do provedor. Três caminhos, nessa ordem:
//   1. Já existe SocialIdentity para (provider, providerUserId) → é a MESMA
//      pessoa que logou antes por aqui, sempre.
//   2. Não existe identidade, mas já existe User com esse e-mail → só
//      vinculamos a essa conta se o PRÓPRIO PROVEDOR confirma
//      (emailVerified) que o dono do token é dono do e-mail.
//   3. Nem identidade nem conta local → cria um novo User (sempre PATIENT)
//      + a identidade, atomicamente.
//
// 🔒 Code review PR #17 (KAN-157, P2): as três leituras acima e a escrita
// que cada caminho faz não são uma única operação atômica — duas
// conclusões simultâneas do mesmo login social (popup duplicado, retry de
// rede, duas abas) podem passar pelas leituras antes de qualquer escrita.
// Em vez de isolamento SERIALIZABLE + retry (mais caro e mais complexo do
// que o necessário aqui), usamos os índices únicos do banco como fonte de
// verdade: criação de usuário+identidade roda dentro de uma transação, e
// qualquer violação de unicidade (e-mail ou provider+providerUserId) é
// capturada e resolvida relendo quem "venceu" a corrida — nunca propaga
// 500 nem deixa uma conta social criada sem vínculo.
@Injectable()
export class SocialAuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async resolveOrCreateUser(profile: VerifiedSocialProfile) {
    const email = normalizeEmail(profile.email);

    const existingIdentity = await this.prisma.socialIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    });
    if (existingIdentity) {
      return this.loadActiveUser(existingIdentity.userId);
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      return this.linkToExistingUser(existingUser, profile, email);
    }

    return this.createUserWithIdentity(profile, email);
  }

  private async loadActiveUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Conta indisponível.');
    }
    return user;
  }

  private async linkToExistingUser(
    existingUser: { id: string; isActive: boolean; passwordHash?: string },
    profile: VerifiedSocialProfile,
    email: string,
  ) {
    if (!existingUser.isActive) {
      throw new UnauthorizedException('Conta indisponível.');
    }
    if (!profile.emailVerified) {
      throw new UnauthorizedException(
        'Não foi possível confirmar a propriedade deste e-mail junto ao provedor.',
      );
    }

    await this.createIdentityTolerant(existingUser.id, profile, email);

    const { passwordHash: _passwordHash, ...safeUser } = existingUser;
    return safeUser;
  }

  // Cria a identidade tolerando uma corrida: se duas requisições
  // concorrentes tentam vincular a MESMA identidade social à MESMA conta
  // (duplo clique, retry de rede), a segunda vê P2002 no índice único
  // (provider, providerUserId) — como o estado final desejado (identidade
  // vinculada a essa conta) já foi alcançado pela primeira, ignoramos o
  // conflito em vez de propagar um 500.
  private async createIdentityTolerant(
    userId: string,
    profile: VerifiedSocialProfile,
    email: string,
  ): Promise<void> {
    try {
      await this.prisma.socialIdentity.create({
        data: { provider: profile.provider, providerUserId: profile.providerUserId, email, userId },
      });
    } catch (err) {
      if (!this.isUniqueViolation(err, 'provider_user_id')) throw err;
    }
  }

  // Cria usuário + identidade ATOMICAMENTE: sem transação, uma falha entre
  // os dois `create` deixaria uma conta social sem vínculo (e sem senha) —
  // inacessível até um retry manual.
  private async createUserWithIdentity(profile: VerifiedSocialProfile, email: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: profile.name?.trim() || email.split('@')[0],
            email,
            passwordHash: null,
            role: Role.PATIENT,
            ageGroup: AgeGroup.ADULT,
          },
          select: USER_SELECT,
        });
        await tx.socialIdentity.create({
          data: {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            email,
            userId: newUser.id,
          },
        });
        return newUser;
      });
    } catch (err) {
      if (this.isUniqueViolation(err, 'email')) {
        // Outra requisição criou a conta com este e-mail entre nosso
        // findByEmail e este create — relê quem venceu e vincula nela.
        const winner = await this.usersService.findByEmail(email);
        if (!winner) throw err;
        return this.linkToExistingUser(winner, profile, email);
      }
      if (this.isUniqueViolation(err, 'provider_user_id')) {
        // Outra requisição resolveu a MESMA identidade social em paralelo.
        const identity = await this.prisma.socialIdentity.findUnique({
          where: {
            provider_providerUserId: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
            },
          },
        });
        if (!identity) throw err;
        return this.loadActiveUser(identity.userId);
      }
      throw err;
    }
  }

  // 🔒 `err.meta.target` vem com o nome da COLUNA no banco (via @map), não
  // o nome do campo no schema Prisma — por isso 'provider_user_id', não
  // 'providerUserId'. Confirmado empiricamente contra Postgres 16 real.
  private isUniqueViolation(err: unknown, field: string): boolean {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== UNIQUE_VIOLATION) {
      return false;
    }
    const target = err.meta?.target;
    if (Array.isArray(target)) return target.some((t) => String(t).includes(field));
    return typeof target === 'string' && target.includes(field);
  }
}
