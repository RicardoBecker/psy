# 🔒 PRÁTICAS DE SEGURANÇA - DOCUMENTAÇÃO IA

## ⚠️ IMPORTANTE: INFORMAÇÕES SENSÍVEIS

**⛔ NUNCA INCLUIR NA DOCUMENTAÇÃO:**
- ❌ Senhas reais de usuários
- ❌ Credenciais de banco de dados
- ❌ Nomes reais de bases de dados
- ❌ Tokens JWT reais
- ❌ Emails de usuários reais  
- ❌ IDs específicos de registros
- ❌ Variáveis de ambiente com valores reais
- ❌ URLs de conexão completas
- ❌ Chaves de API ou secrets

## ✅ PRÁTICAS SEGURAS

### 🏷️ Use Placeholders
```
❌ password: "[REAL_PASSWORD]"
✅ password: "[PASSWORD]"

❌ email: "admin@[DOMAIN].com"
✅ email: "[USER_EMAIL]"

❌ DATABASE_URL: "postgresql://[USER]:[PASS]@[HOST]:[PORT]/[DATABASE]"
✅ DATABASE_URL: "[DATABASE_CREDENTIALS]"
```

### 📝 Exemplos Genéricos
```
❌ ID específico: "aabb3c2c-fde4-4212-a92e-eac579b0a79d"
✅ Placeholder: "[UUID_EXAMPLE]"

❌ Token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
✅ Placeholder: "[JWT_TOKEN]"
```

### 🗄️ Banco de Dados
```bash
# ❌ Comando específico
docker exec db psql -U [USER] -d [DATABASE]

# ✅ Comando genérico
docker exec db psql -U [DB_USER] -d [DATABASE_NAME]
```

## 📋 CHECKLIST DE SEGURANÇA

Antes de qualquer commit ou documentação:

- [ ] ✅ Nenhuma senha real incluída
- [ ] ✅ Emails substituídos por placeholders
- [ ] ✅ UUIDs reais removidos
- [ ] ✅ Credenciais de banco substituídas
- [ ] ✅ Tokens e secrets removidos
- [ ] ✅ URLs de conexão sanitizadas
- [ ] ✅ Variáveis de ambiente mascaradas

## 🔧 PLACEHOLDERS PADRÃO

| Tipo | Placeholder Seguro |
|------|-------------------|
| **Email** | `[USER_EMAIL]` |
| **Senha** | `[PASSWORD]` |
| **UUID** | `[UUID]` ou `[USER_UUID]` |
| **Database** | `[DATABASE_NAME]` |
| **DB User** | `[DB_USER]` |
| **DB Password** | `[DB_PASSWORD]` |
| **JWT Token** | `[JWT_TOKEN]` |
| **JWT Secret** | `[JWT_SECRET]` |
| **API URL** | `[API_URL]` |

## 🚨 REVISÃO OBRIGATÓRIA

**Antes de cada commit:**
1. Revisar todos os arquivos `.md` da pasta `IA/`
2. Buscar por patterns suspeitos (emails, senhas, URLs)
3. Verificar se placeholders estão sendo usados
4. Confirmar que exemplos são genéricos

**Comando para verificar:**
```bash
grep -r -E "(admin123|@.*\.com|postgresql://|password.*:|token.*:)" IA/
# Resultado deve estar vazio!
```

---

## 📖 EXEMPLOS CORRETOS

### ✅ Documentação de API
```markdown
POST /api/v1/auth/login
{
  "email": "[USER_EMAIL]",
  "password": "[USER_PASSWORD]"
}
```

### ✅ Exemplos de Configuração
```yaml
environment:
  - DATABASE_URL=[DATABASE_CREDENTIALS]
  - JWT_SECRET=[JWT_SECRET_VALUE]
```

### ✅ Comandos de Exemplo
```bash
curl -X POST [API_URL]/auth/login \
  -H "Authorization: Bearer [JWT_TOKEN]"
```

---

⚡ **LEMBRETE:** Esta documentação é compartilhada e versionada. Qualquer informação sensível aqui pode comprometer a segurança do sistema!