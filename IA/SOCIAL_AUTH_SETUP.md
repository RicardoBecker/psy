# 🌐 Configuração de Login Social

Este documento descreve como configurar (credenciais reais) os logins sociais com Google e Apple. A implementação em si já está pronta — falta só o Client ID de cada provedor por ambiente.

## 📋 Status Atual

✅ **Google (KAN-15) — implementado:**
- Backend verifica o ID token do Google (assinatura, issuer, audience,
  expiração) via `google-auth-library`, sem trocar código nem usar client
  secret — ver `apps/backend/src/modules/auth/providers/google.provider.ts`.
- Frontend usa o Google Identity Services (carregado sob demanda) para obter
  o ID token e envia só isso ao backend — ver `apps/frontend/lib/google-identity.ts`.

✅ **Apple (KAN-16) — implementado:**
- Backend verifica o `identityToken` da Apple (assinatura via JWKS remoto,
  issuer, audience, expiração) com `jose`, sem client secret nem troca de
  código — ver `apps/backend/src/modules/auth/providers/apple.provider.ts`.
- Frontend usa o "Sign in with Apple JS" (popup, carregado sob demanda) para
  obter o `identityToken` — ver `apps/frontend/lib/apple-identity.ts`.
- **Code review PR #18 (KAN-158, P1) — handshake state/nonce:** antes de
  abrir o popup, o frontend chama `GET /auth/apple/start`, que gera um
  `state`/`nonce` e guarda num cookie HttpOnly assinado de 5 minutos
  (`AppleChallengeService`). Os dois valores vão para
  `AppleID.auth.init()`; na volta, o backend exige que o `state` do corpo
  bata com o do cookie E que o claim `nonce` do ID token bata com o nonce
  do desafio — sem isso, um ID token Apple válido obtido fora desta
  tentativa (replay, phishing, MITM) funcionaria como bearer credential.
  Ver [Verifying a user](https://developer.apple.com/documentation/signinwithapple/verifying-a-user).
- **Decisão de escopo consciente:** o finding original também sugeria
  validar o `authorization.code` contra o endpoint de token da Apple
  (`https://appleid.apple.com/auth/token`). Isso exigiria gerar um client
  secret JWT (ES256) com `APPLE_TEAM_ID`/`APPLE_KEY_ID`/chave privada do
  Apple Developer — infraestrutura que não existe neste projeto e que o
  handshake state/nonce acima já torna redundante para o risco descrito
  (replay/session-swap): nonce prova que o token é resposta à tentativa
  DESTE navegador: um atacante não consegue obter um ID token Apple
  assinado com um nonce que ele não controla sem a vítima autenticar de
  verdade contra a Apple usando esse nonce. Troca de código fica como
  hardening adicional (defesa em profundidade "porque a Apple recomenda"),
  não como algo que fecha uma vulnerabilidade hoje aberta — revisitar se o
  time decidir que vale o custo operacional de gerenciar a chave privada.

Contas: identidade vinculada via tabela `social_identities`, mesma lógica
para os dois provedores (`SocialAuthService`); login com e-mail já existente
só vincula quando o provedor confirma `email_verified`.

---

## 🔍 Google — configurar credenciais reais

### 1. Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Vá em **APIs & Services** > **Credentials** > **Create Credentials** >
   **OAuth client ID** > tipo **Web application**
4. Configure **Authorized JavaScript origins** (não precisa de redirect URI —
   o fluxo é client-side, sem callback no backend):
   - `http://localhost:3000` (desenvolvimento)
   - `https://seudominio.com` (produção)

### 2. Variáveis de ambiente
Só o Client ID — não há client secret porque o backend nunca troca código
por token, só verifica a assinatura do ID token que o frontend já recebeu.

Backend (`apps/backend/.env`, ou `GOOGLE_CLIENT_ID` no `devOps/.env`):
```env
GOOGLE_CLIENT_ID=seu_google_client_id.apps.googleusercontent.com
```

Frontend (mesmo valor, variável pública — roda no navegador):
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu_google_client_id.apps.googleusercontent.com
```

Sem `GOOGLE_CLIENT_ID` configurado, `POST /auth/google` responde 401 em vez
de pular a verificação — ver `google.provider.ts`.

---

## 🍎 Apple — configurar credenciais reais

### 1. Apple Developer Account
1. Acesse [Apple Developer](https://developer.apple.com/) > **Certificates, Identifiers & Profiles**
2. Garanta um **App ID** com **Sign In with Apple** habilitado
3. Crie um **Services ID** (ex.: `com.seudominio.web`) — esse identifier é o
   `APPLE_CLIENT_ID`/audience usado na verificação
4. Nesse Services ID, configure **Sign In with Apple** > **Domains and
   Subdomains** com seu domínio (ex.: `seudominio.com`) e **Return URLs**
   com a origem do frontend (ex.: `https://seudominio.com`) — o fluxo é
   popup client-side (`usePopup: true`), então essa URL não recebe um
   callback de verdade, só precisa estar na allowlist da Apple

### 2. Variáveis de ambiente
Só o Services ID — sem team id/key id/chave privada, porque não geramos um
client secret JWT nem trocamos código: só verificamos a assinatura do
`identityToken` que o frontend já recebeu, contra o JWKS público da Apple.

Backend (`apps/backend/.env`, ou `APPLE_CLIENT_ID` no `devOps/.env`):
```env
APPLE_CLIENT_ID=com.seudominio.web
```

Frontend (mesmo valor, variável pública):
```env
NEXT_PUBLIC_APPLE_CLIENT_ID=com.seudominio.web
```

Sem `APPLE_CLIENT_ID` configurado, `POST /auth/apple` responde 401 em vez de
pular a verificação — ver `apple.provider.ts`.

---

## 🔄 Próximos Passos

1. **Configurar credenciais reais do Google** (KAN-15, ver acima)
2. **Configurar credenciais reais da Apple** (KAN-16, ver acima)
3. **Testar em desenvolvimento** com domains localhost
4. **Configurar para produção** com domínios reais

---

## ⚠️ Importante

- **Nunca commitar credenciais** no código
- **Usar variáveis de ambiente** para todas as chaves
- **Validar tokens no backend** - nunca confiar apenas no frontend (Google e
  Apple seguem isso: cada `providers/*.provider.ts` verifica a assinatura,
  nunca aceita claims sem checar)
- **Configurar CORS** adequadamente para produção
- **Testar fluxo completo** antes do deploy