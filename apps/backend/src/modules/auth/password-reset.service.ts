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
  // recente enviado por e-mail continua válido.
  async createTokenForUser(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    });
    await this.prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  // Só aceita um token existente, não expirado e ainda não usado — e marca
  // como usado atomicamente na mesma query (updateMany com WHERE usedAt:
  // null), então duas requisições concorrentes com o mesmo token nunca
  // conseguem as duas "vencer".
  async consumeToken(rawToken: string): Promise<{ userId: string } | null> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const { count } = await this.prisma.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });

    if (count === 0) return null;

    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    return record ? { userId: record.userId } : null;
  }
}
