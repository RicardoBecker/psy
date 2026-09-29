-- KAN-156 (P2, re-review PR #19): no máximo UM PasswordResetToken por
-- usuário — nunca "o mais recente entre várias linhas". Antes de criar a
-- constraint, remove defensivamente linhas antigas em duplicidade (mantém
-- só a criada por último por usuário) para bancos que já tenham dados de
-- antes desta migration; num banco novo/CI isto não apaga nada.
-- Tupla (created_at, id) dá ordem total mesmo se dois registros tiverem o
-- mesmo created_at (timestamps iguais não deixam empate indefinido).
DELETE FROM "password_reset_tokens" a
USING "password_reset_tokens" b
WHERE a."user_id" = b."user_id"
  AND (a."created_at", a."id") < (b."created_at", b."id");

-- DropIndex
DROP INDEX "password_reset_tokens_user_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_user_id_key" ON "password_reset_tokens"("user_id");
