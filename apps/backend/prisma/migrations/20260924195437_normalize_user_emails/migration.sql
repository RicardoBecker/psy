-- Code review PR #17 (KAN-157, P2): normaliza e-mails já persistidos para
-- a representação canônica (trim + lowercase) que a aplicação passa a
-- garantir em toda borda (cadastro, login, reset, login social) a partir
-- daqui. Se dois registros já colidirem depois de normalizados (duplicata
-- de casing pré-existente), esta migration falha de propósito — mesclar
-- contas automaticamente é uma decisão de produto, não algo para uma
-- migration decidir sozinha.
UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
