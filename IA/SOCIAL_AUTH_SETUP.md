# 🌐 Configuração de Login Social

Este documento descreve como configurar (credenciais reais) os logins sociais com Google e Apple. A implementação em si já está pronta — falta só o Client ID de cada provedor por ambiente.

## 📋 Status Atual

✅ **Google (KAN-15) — implementado:**
- Backend verifica o ID token do Google (assinatura, issuer, audience,
  expiração) via `google-auth-library`, sem trocar código nem usar client
  secret — ver `apps/backend/src/modules/auth/providers/google.provider.ts`.
- Frontend usa o Google Identity Services (carregado sob demanda) para obter
  o ID token e envia só isso ao backend — ver `apps/frontend/lib/google-identity.ts`.
- Contas: identidade vinculada via tabela `social_identities`; login com
  e-mail já existente só vincula quando o Google confirma `email_verified`.

🚧 **Apple — pendente (KAN-16):**
- Endpoint `POST /auth/apple` continua desabilitado (503) até essa história
  ser implementada.

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

## 🍎 Apple Sign In Setup

### 1. Apple Developer Account
1. Acesse [Apple Developer](https://developer.apple.com/)
2. Vá em **Certificates, Identifiers & Profiles**
3. Crie um **App ID** com **Sign In with Apple** habilitado
4. Crie um **Service ID** para web authentication
5. Configure **Return URLs**:
   - `http://localhost:3000/auth/apple/callback` (dev)
   - `https://seudominio.com/auth/apple/callback` (prod)

### 2. Variáveis de Ambiente  
Adicione no `.env` do backend:
```env
APPLE_CLIENT_ID=com.seudominio.app.service
APPLE_TEAM_ID=seu_team_id
APPLE_KEY_ID=sua_key_id
APPLE_PRIVATE_KEY_PATH=caminho/para/AuthKey_KEYID.p8
```

### 3. Instalar Dependências
```bash
cd apps/backend
npm install apple-signin-auth jsonwebtoken
```

```bash
cd apps/frontend
npm install apple-signin-auth
# ou usar biblioteca específica do React
npm install react-apple-login
```

### 4. Implementar Validação Real
No arquivo `social-auth.service.ts`:

```typescript
const appleSignin = require('apple-signin-auth');

const appleIdTokenClaims = await appleSignin.verifyIdToken(token, {
  audience: process.env.APPLE_CLIENT_ID,
  ignoreExpiration: false,
});

const appleUser = {
  sub: appleIdTokenClaims.sub,
  email: appleIdTokenClaims.email,
  name: appleIdTokenClaims.name || 'Usuário Apple',
};
```

---

## 🔄 Próximos Passos

1. **Configurar Google OAuth** com credenciais reais (Google já implementado, ver acima)
2. **Implementar e configurar Apple Sign In** (KAN-16, ainda não iniciado)
3. **Testar em desenvolvimento** com domains localhost
4. **Configurar para produção** com domínios reais

---

## ⚠️ Importante

- **Nunca commitar credenciais** no código
- **Usar variáveis de ambiente** para todas as chaves
- **Validar tokens no backend** - nunca confiar apenas no frontend (Google
  já segue isso; Apple seguirá o mesmo padrão quando implementado)
- **Configurar CORS** adequadamente para produção
- **Testar fluxo completo** antes do deploy