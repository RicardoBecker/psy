# 🌐 Configuração de Login Social - TODO

Este documento descreve como finalizar a configuração dos logins sociais com Google e Apple.

## 📋 Status Atual

✅ **Implementado e Funcionando:**
- Estrutura completa no backend (endpoints, services, controllers)
- Estrutura completa no frontend (providers, API calls)
- Botões funcionais nas telas de login/registro
- Fluxo preparado para receber tokens

🚧 **Pendente de Configuração:**
- Credenciais OAuth do Google
- Credenciais do Apple Developer
- Validação real de tokens
- Configuração de domínios autorizados

---

## 🔍 Google OAuth Setup

### 1. Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative a **Google+ API** e **Google Identity API**
4. Vá em **Credentials** > **Create Credentials** > **OAuth client ID**
5. Configure **Authorized JavaScript origins**:
   - `http://localhost:3000` (desenvolvimento)
   - `https://seudominio.com` (produção)

### 2. Variáveis de Ambiente
Adicione no `.env` do backend:
```env
GOOGLE_CLIENT_ID=seu_google_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_google_client_secret
```

Adicione no `.env.local` do frontend:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu_google_client_id.googleusercontent.com
```

### 3. Instalar Dependências
Instale as dependências necessárias:

**Backend:**
```bash
cd apps/backend
npm install google-auth-library
```

**Frontend:**
```bash
cd apps/frontend  
npm install @google-cloud/local-auth google-auth-library
# ou usar react-google-login para facilitar
npm install react-google-login
```

### 4. Implementar Validação Real
No arquivo `social-auth.service.ts`, descomente e configure:

```typescript
// Substituir o mock por validação real:
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ticket = await client.verifyIdToken({
  idToken: token,
  audience: process.env.GOOGLE_CLIENT_ID,
});

const payload = ticket.getPayload();
const googleUser = {
  sub: payload.sub,
  email: payload.email,
  name: payload.name,
  picture: payload.picture,
};
```

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

1. **Configurar Google OAuth** seguindo os passos acima
2. **Configurar Apple Sign In** seguindo os passos acima  
3. **Testar em desenvolvimento** com domains localhost
4. **Configurar para produção** com domínios reais
5. **Implementar tratamento de erros** mais robusto
6. **Adicionar analytics** para acompanhar conversões

---

## ⚠️ Importante

- **Nunca commitar credenciais** no código
- **Usar variáveis de ambiente** para todas as chaves
- **Validar tokens no backend** - nunca confiar apenas no frontend
- **Configurar CORS** adequadamente para produção
- **Testar fluxo completo** antes do deploy

---

## 📞 Como Ativar

Quando estiver pronto:

1. Configure as variáveis de ambiente
2. Instale as dependências
3. Substitua os mocks pela validação real
4. Teste o fluxo completo
5. Remove os alerts dos botões sociais no frontend

Os botões já estão funcionais e prontos para receber a configuração real!