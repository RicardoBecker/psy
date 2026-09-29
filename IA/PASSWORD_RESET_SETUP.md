# 🔑 Configuração de Recuperação de Senha (KAN-17)

Este documento descreve como configurar o envio de e-mail real para o fluxo
de "esqueci minha senha". A implementação em si já está pronta — falta só
apontar para um servidor SMTP por ambiente.

## 📋 Status Atual

✅ **Implementado:**
- `POST /auth/forgot-password` — gera um token de uso único (256 bits),
  válido por 30 minutos, e envia um e-mail com o link de redefinição. Sempre
  responde com a mesma mensagem genérica, exista ou não a conta (anti-
  enumeração) — ver `apps/backend/src/modules/auth/auth.service.ts`.
- `POST /auth/reset-password` — troca a senha se o token for válido,
  não-expirado e ainda não usado; qualquer outro caso recebe a mesma
  mensagem genérica ("Link inválido ou expirado.").
- Trocar a senha invalida TODAS as sessões anteriores daquele usuário
  (`User.passwordChangedAt` + checagem em `JwtStrategy.validate`) — não é
  preciso fazer login de novo em cada dispositivo manualmente, mas sessões
  antigas param de funcionar. Comparação feita na mesma precisão
  (segundos) que o `iat` do JWT — corrigido no code review (KAN-156, P2)
  depois de um bug onde um login no MESMO segundo do reset podia ser
  rejeitado por diferença de precisão (`iat` em segundos vs.
  `passwordChangedAt` em milissegundos).
- Telas: `/forgot-password` (solicitar) e `/reset-password?token=...`
  (definir nova senha), com link "Esqueceu sua senha?" na tela de login.
- **Atomicidade (code review PR #19, KAN-156, P2):** gerar um token novo
  (invalidando o anterior) roda numa transação; consumir o token (marcá-lo
  usado) e gravar a nova senha também rodam numa ÚNICA transação
  (`PasswordResetService.consumeTokenAndUpdatePassword`) — uma falha
  transitória na escrita da senha não deixa o token "queimado" sem a senha
  ter mudado.
- **PII em logs (code review PR #19, KAN-156, P3):** `MailerService` nunca
  loga o endereço completo — usa `maskEmail()` (`common/email.util.ts`),
  ex.: `p***@exemplo.com`.

🚧 **Pendente de configuração:** um servidor SMTP real por ambiente. Sem
isso, o backend não lança erro nem quebra o fluxo — só loga um aviso e o
e-mail não sai de verdade (útil para dev/CI, mas não serve para produção).

---

## ✉️ Configurar SMTP real

Qualquer provedor SMTP padrão funciona (SES, SendGrid, Postmark, Mailgun,
Gmail com senha de app, etc.) — `MailerService` usa `nodemailer` genérico.

Variáveis de ambiente (`apps/backend/.env`, ou no `devOps/.env`):
```env
FRONTEND_URL=https://app.seudominio.com
SMTP_HOST=smtp.seuservico.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_usuario_smtp
SMTP_PASS=sua_senha_smtp
SMTP_FROM=no-reply@seudominio.com
```

- `FRONTEND_URL` monta o link do e-mail (`${FRONTEND_URL}/reset-password?token=...`)
  — precisa apontar para o frontend de verdade em produção, não para
  `localhost`.
- `SMTP_SECURE=true` para conexão TLS direta (porta 465); `false` para
  STARTTLS (porta 587, o mais comum).
- Sem `SMTP_HOST`, `MailerService.send()` só loga um aviso e retorna — não
  lança erro (ver racional em `mailer.service.ts`: uma falha de envio não
  pode virar 500 no fluxo de reset, porque isso reintroduziria enumeração
  de contas via diferença de resposta).

## ⚠️ Importante

- **Nunca commitar credenciais SMTP** no código — só em `.env` (já no
  `.gitignore`).
- O token de recuperação nunca é logado nem persistido em texto plano — só
  o hash SHA-256 (ver `password-reset.service.ts`). Se precisar depurar um
  link que não chegou, cheque os logs do provedor SMTP, não o banco.
- Cada nova solicitação de reset invalida qualquer link anterior ainda não
  usado do mesmo usuário — só o e-mail mais recente funciona.
