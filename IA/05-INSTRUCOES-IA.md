# 🤖 INSTRUÇÕES PARA AGENTES IA - EMOTIONAL APP

## 🎯 DIRETRIZES FUNDAMENTAIS

### ⚡ ANTES DE QUALQUER INTERVENÇÃO
1. **LEIA TODOS OS DOCUMENTOS DA PASTA /IA** 
2. **Verifique o status dos containers:** `docker compose ps`
3. **Teste conexão do banco:** `curl -I http://localhost:3001/api/v1/health`
4. **Confirme JWT funcionando:** Teste com endpoints protegidos

### 🛡️ REGRAS INVIOLÁVEIS
- **NUNCA** altere ou delete o usuário de teste `[TEST_USER_EMAIL]`
- **SEMPRE** mantenha a estrutura de pastas existente
- **JAMAIS** modifique migrations already applied do Prisma
- **SEMPRE** use TypeScript em todo novo código
- **NUNCA** remova guards/validações de segurança existentes

## 📋 CONTEXTO OBRIGATÓRIO PARA ENTENDER

### 🏗️ Este é um projeto de SAÚDE MENTAL
**Sensibilidade:** Dados pessoais de bem-estar emocional
**Privacidade:** Cada usuário só acessa seus próprios dados
**Responsabilidade:** Implementações devem ser seguras e confiáveis

### 🔑 CREDENCIAIS E ACESSO
```bash
# Banco PostgreSQL
Host: localhost:5432
Database: [DATABASE_NAME]
User: [DB_USER]  
Password: [DB_PASSWORD]

# Usuário de teste
Email: [TEST_USER_EMAIL]
Senha: [TEST_PASSWORD]

# URLs principais
Backend: http://localhost:3001
Frontend: http://localhost:3000
Health: http://localhost:3001/api/v1/health
```

### 🗄️ ESTRUTURA DO BANCO (MEMORIZE)
```sql
users (
  id UUID PK,
  name VARCHAR,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,  
  created_at TIMESTAMP
)

emotional_checkins (
  id UUID PK,
  user_id UUID FK,
  mood INTEGER [1-10],
  energy INTEGER [1-10], 
  stress INTEGER [1-10],
  notes TEXT OPTIONAL,
  created_at TIMESTAMP
)

journal_entries (
  id UUID PK,
  user_id UUID FK,
  title VARCHAR,
  content TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP  
)
```

## 🔧 WORKFLOWS PARA MODIFICAÇÕES

### 🆕 Ao Adicionar Nova Funcionalidade
1. **Planejamento:**
   - Identifique se é backend, frontend ou full-stack
   - Verifique impacto na segurança
   - Considere isolamento por usuário

2. **Backend (NestJS):**
   ```typescript
   // SEMPRE seguir este padrão:
   @Controller('nova-feature')
   @UseGuards(JwtAuthGuard)  // OBRIGATÓRIO
   export class NovaFeatureController {
     @Post()
     create(@Request() req, @Body(ValidationPipe) dto) {
       return this.service.create(req.user.id, dto); // SEMPRE usar req.user.id
     }
   }
   ```

3. **Frontend (Next.js):**
   ```typescript
   // SEMPRE usar autenticação
   const { user, isAuthenticated } = useAuth();
   if (!isAuthenticated) redirect('/login');
   ```

### 🗃️ Ao Modificar Schema do Banco
1. **CUIDADO EXTREMO:** Dados existentes podem ser perdidos
2. **Processo obrigatório:**
   ```bash
   cd apps/backend
   npx prisma migrate dev --name descriptive-name
   npx prisma generate
   ```
3. **TESTE:** Sempre verifique se migrations foram aplicadas
4. **BACKUP:** Considere backup antes de mudanças estruturais

### 🔍 Ao Debuggar Problemas 
1. **Logs dos containers:**
   ```bash
   docker compose logs backend --tail 20
   docker compose logs frontend --tail 20
   ```

2. **Comandos de diagnóstico:**
   ```bash
   # Status dos containers
   docker compose ps
   
   # Health check
   curl -I http://localhost:3001/api/v1/health
   
   # Verificar dados no banco
   docker compose exec db psql -U [DB_USER] -d [DATABASE_NAME] -c "SELECT COUNT(*) FROM users;"
   ```

## 🚨 SITUAÇÕES DE EMERGÊNCIA

### ❌ Containers não sobem
1. `docker compose down`
2. `docker compose build --no-cache`  
3. `docker compose up`

### ❌ Erro de dependências
```bash
# Backend
docker compose exec backend npm install

# Frontend  
docker compose exec frontend npm install
```

### ❌ Problema de migrations
```bash
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma generate
```

### ❌ Banco corrompido
```bash
docker compose down
docker volume rm devops_[DB_SERVICE]_data
docker compose up  # Vai recriar o banco
# ATENÇÃO: Todos os dados serão perdidos!
```

## 📚 RECURSOS DE REFERÊNCIA

### 🔗 Endpoints Existentes (MEMORIZE)
```
AUTH:
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/profile

EMOTIONAL CHECKINS:
GET/POST/PATCH/DELETE /api/v1/emotional-checkins
GET /api/v1/emotional-checkins/stats
GET /api/v1/emotional-checkins/:id

JOURNAL ENTRIES:  
GET/POST/PATCH/DELETE /api/v1/journal-entries
GET /api/v1/journal-entries/search?q=termo
GET /api/v1/journal-entries/stats
GET /api/v1/journal-entries/:id
```

### 📁 Arquivos Críticos (NÃO MODIFICAR SEM CUIDADO)
- `apps/backend/prisma/schema.prisma` - Schema do banco
- `devOps/docker-compose.yml` - Configuração containers
- `apps/backend/src/main.ts` - Bootstrap da API
- `apps/frontend/providers/auth-provider.tsx` - Context de auth

## 💡 BOAS PRÁTICAS PARA IA

### ✅ SEMPRE FAZER
- Teste após cada modificação
- Mantenha consistência com padrões existentes  
- Use TypeScript em 100% do código novo
- Documente mudanças significativas
- Valide entrada de dados
- Implemente isolamento por usuário
- Siga padrões REST para APIs

### ❌ NUNCA FAZER
- Hardcode credenciais ou secrets
- Remova validações existentes
- Modifique dados de outros usuários
- Ignore errors ou exceptions
- Use `any` type no TypeScript
- Crie endpoints sem autenticação
- Faça deploy sem testar localmente

## 🎯 METAS PARA NOVAS IMPLEMENTAÇÕES

### 🔮 PRÓXIMAS PRIORIDADES
1. **OAuth Social:** Google + Apple login
2. **Dashboard Visual:** Gráficos de mood/energy
3. **Notificações:** Lembretes para checkins
4. **Análises:** Insights sobre padrões emocionais
5. **Export:** PDF/CSV dos dados do usuário

### 🧪 TESTES A IMPLEMENTAR
- Unit tests para services
- Integration tests para APIs
- E2E tests para user flows
- Automated CI/CD pipeline

## 📞 DEBUG E SUPORTE

### 🔍 Checklist de Problema
```bash
# 1. Containers rodando?
docker compose ps

# 2. Backend respondendo?
curl -I http://localhost:3001/api/v1/health

# 3. Frontend carregando?
curl -I http://localhost:3000

# 4. Banco acessível?
docker compose exec db psql -U [DB_USER] -l

# 5. Logs com erros?
docker compose logs --tail 50
```

### 📋 Informações para Reporte
- Versão do Docker: `docker --version`
- Status dos containers: `docker compose ps` 
- Logs específicos do erro
- Comandos executados antes do problema
- Browser e sistema operacional (para issues de frontend)

---
**📅 Criado:** 6 de abril de 2026  
**🤖 IMPORTANTE:** Estas instruções são OBRIGATÓRIAS para qualquer agente trabalhando neste projeto. Leia e releia antes de fazer alterações.