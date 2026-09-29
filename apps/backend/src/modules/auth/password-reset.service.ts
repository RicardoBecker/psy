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
  // token anterior do mesmo usuário — só o link mais recente enviado por
  // e-mail continua válido.
  //
  // 🔒 KAN-156 (P2, re-review PR #19): a versão anterior fazia
  // delete+create numa transação, mas isso NÃO é seguro sob concorrência
  // real — duas solicitações simultâneas para o MESMO usuário sem token
  // prévio podiam, cada uma, ver `deleteMany` afetar 0 linhas e então
  // inserir seu próprio `create`, resultando em DUAS linhas válidas (o
  // finding: "mocks isolados provam que $transaction foi chamado, não que
  // a operação é segura sob concorrência real"). `PasswordResetToken.userId`
  // agora é `@unique` (ver schema.prisma) e trocamos para `upsert`, que o
  // Postgres resolve como um único `INSERT ... ON CONFLICT (user_id) DO
  // UPDATE` atômico: sob duas chamadas concorrentes, a constraint garante
  // que só existe UMA linha para este usuário no final — a que "perde" a
  // corrida tem seu tokenHash sobrescrito pela que grava por último, então
  // o token bruto da perdedora deixa de bater com qualquer linha e passa a
  // ser rejeitado como inválido em consumeTokenAndUpdatePassword. Prova
  // sob concorrência real (não mock):
  // password-reset-concurrency.e2e.spec.ts.
  async createTokenForUser(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.upsert({
      where: { userId },
      create: { userId, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, usedAt: null },
    });

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
