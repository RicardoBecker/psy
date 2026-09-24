import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// 🔒 KAN-17 (KAN-77): dono da tabela password_reset_tokens. Só o HASH do
// token é persistido — o valor cru só existe em memória, no e-mail que sai
// para o usuário, e na URL que o navegador dele abre.
@Injectable()
export class PasswordResetService {
  constructor(private prisma: PrismaService) {}

  // Gera um token de uso único (256 bits de entropia) e invalida qualquer
  // token anterior ainda não usado do mesmo usuário — só o link mais
  // recente enviado por e-mail continua válido. Delete+create roda numa
  // transação (Code review PR #19, KAN-156, P2): sem isso, uma falha entre
  // as duas operações podia deixar o usuário sem NENHUM token válido
  // (deletou o antigo, não criou o novo) — nunca com dois, que é a
  // preocupação menos grave.
  async createTokenForUser(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
      this.prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);

    return rawToken;
  }

  // 🔒 Code review PR #19 (KAN-156, P2): consumir o token (marcar usado) e
  // atualizar a senha precisam ser UMA operação atômica. Antes, o token
  // era marcado usado ANTES de `bcrypt.hash`/`user.update` rodarem fora de
  // qualquer transação — uma falha transitória no update deixava o token
  // "queimado" sem a senha ter mudado, trancando o usuário fora até
  // solicitar um novo link. Agora: hash já computado (parâmetro, calculado
  // pelo chamador ANTES de entrar aqui — bcrypt não toca o banco, não
  // precisa estar dentro da transação), e as duas escritas (token +
  // senha) só confirmam juntas — qualquer falha reverte as duas, o token
  // original continua válido para uma nova tentativa.
  async consumeTokenAndUpdatePassword(
    rawToken: string,
    passwordHash: string,
  ): Promise<{ userId: string } | null> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (count === 0) return null;

      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!record) return null;

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, passwordChangedAt: now },
      });

      return { userId: record.userId };
    });
  }
}
