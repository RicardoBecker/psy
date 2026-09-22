/*
  Renomeia os campos de check-in emocional preservando o histórico
  existente (expand → backfill → contract):

  - `mood`   (1-10) → `moodScore`   (1-10)
  - `energy` (1-10) → `energyLevel` (1-10)
  - `stress` (1-10) → `anxietyLevel` (1-10) — mesmo conceito/escala,
    apenas renomeado (confirmado com o time de produto).

  Esta migration nunca foi aplicada fora de bancos de desenvolvimento
  descartáveis; a versão anterior (drop + add NOT NULL sem backfill)
  foi substituída por esta antes de qualquer aplicação em ambiente
  compartilhado. Ver IA/BACKLOG_CODE_REVIEW.md CR-03.1.
*/

-- 1) Expand: novas colunas nullable, sem quebrar linhas existentes
ALTER TABLE "emotional_checkins" ADD COLUMN "moodScore" INTEGER;
ALTER TABLE "emotional_checkins" ADD COLUMN "energyLevel" INTEGER;
ALTER TABLE "emotional_checkins" ADD COLUMN "anxietyLevel" INTEGER;

-- 2) Backfill: copia os valores existentes para as novas colunas
UPDATE "emotional_checkins" SET
  "moodScore" = "mood",
  "energyLevel" = "energy",
  "anxietyLevel" = "stress";

-- 3) Contract: aplica NOT NULL (falha se sobrar algum nulo, validando o
--    backfill) e só então remove as colunas antigas
ALTER TABLE "emotional_checkins" ALTER COLUMN "moodScore" SET NOT NULL;
ALTER TABLE "emotional_checkins" ALTER COLUMN "energyLevel" SET NOT NULL;
ALTER TABLE "emotional_checkins" ALTER COLUMN "anxietyLevel" SET NOT NULL;

ALTER TABLE "emotional_checkins" DROP COLUMN "mood";
ALTER TABLE "emotional_checkins" DROP COLUMN "energy";
ALTER TABLE "emotional_checkins" DROP COLUMN "stress";
