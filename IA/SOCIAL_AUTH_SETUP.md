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
  issuer, audience, expiração) com `jose` —
  ver `apps/backend/src/modules/auth/providers/apple.provider.ts`.
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
- **KAN-158 (P2, re-review PR #18) — troca do authorization code:** a doc
  oficial da Apple é explícita — "web apps must validate the authorization
  code using the Token validation endpoint" — a verificação local do
  identityToken (item acima) prova só o que o CLIENTE afirma ter recebido,
  não que a Apple de fato emitiu essa autorização para o nosso client_id.
  `AppleTokenExchangeService` gera um client_secret (JWT ES256 assinado com
  `APPLE_PRIVATE_KEY`, `iss=APPLE_TEAM_ID`, `sub=APPLE_CLIENT_ID`,
  `aud=https://appleid.apple.com`, ver "Creating a client secret" abaixo) e
  troca o `code` no endpoint `https://appleid.apple.com/auth/token`; o
  `id_token` devolvido é reverificado e precisa bater com o MESMO
  `sub`/`nonce` já validados. Um `code` inválido, expirado (TTL de 5min) ou
  já usado faz a Apple responder `invalid_grant` — nesse caso o login é
  bloqueado mesmo com identityToken e state/nonce corretos. Ver
  [Verifying a user](https://developer.apple.com/documentation/signinwithapple/verifying-a-user),
  [Generate and validate tokens](https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens)
  e [Creating a client secret](https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret).

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
5. **KAN-158 (P2):** em **Certificates, Identifiers & Profiles** >
   **Keys**, crie uma chave com **Sign In with Apple** habilitado e associe
   ao seu App ID. Baixe o arquivo `.p8` (só é possível uma vez) — ele é o
   `APPLE_PRIVATE_KEY`. Anote também o **Key ID** (10 caracteres, mostrado
   na criação da chave) e o **Team ID** (10 caracteres, canto superior
   direito do Apple Developer, ou em **Membership**) — são o `APPLE_KEY_ID`
   e o `APPLE_TEAM_ID`.

### 2. Variáveis de ambiente

Backend (`apps/backend/.env`, ou as mesmas 4 chaves no `devOps/.env`):
```env
APPLE_CLIENT_ID=com.seudominio.web
APPLE_TEAM_ID=ABCDE12345
APPLE_KEY_ID=FGHIJ67890
# Conteúdo do .p8 baixado no passo 5, com \n literais no lugar de quebras
# de linha reais (mesmo padrão de outras chaves privadas em env var de uma
# linha só):
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBM...\n-----END PRIVATE KEY-----"
```

Frontend (só o Services ID — as outras 3 chaves nunca vão ao navegador):
```env
NEXT_PUBLIC_APPLE_CLIENT_ID=com.seudominio.web
```

Sem `APPLE_CLIENT_ID`, `POST /auth/apple` responde 401 em vez de pular a
verificação do identityToken — ver `apple.provider.ts`. Sem qualquer uma
das outras 3 (`APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY`), o mesmo
endpoint responde 401 em vez de pular a troca do authorization code — ver
`apple-token-exchange.service.ts`.

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