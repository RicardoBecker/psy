# 🏗️ ARQUITETURA DO SISTEMA - EMOTIONAL APP

## 📁 ESTRUTURA DE DIRETÓRIOS
```
psico/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── modules/  # Módulos funcionais
│   │   │   │   ├── auth/           # Autenticação JWT + Social
│   │   │   │   ├── users/          # Gestão de usuários
│   │   │   │   ├── emotional-checkins/  # CRUD emoções
│   │   │   │   └── journal-entries/     # CRUD diário
│   │   │   ├── prisma/   # Configuração Prisma
│   │   │   └── main.ts   # Entrada da aplicação
│   │   ├── prisma/       # Schema e migrations
│   │   └── package.json
│   └── frontend/         # Next.js App
│       ├── app/          # App Router (Next.js 14)
│       ├── components/   # Componentes reutilizáveis
│       ├── lib/          # Utilitários (api.ts, auth.ts)
│       ├── providers/    # Context providers
│       └── package.json
├── devOps/               # Docker e infraestrutura
│   ├── docker-compose.yml
│   ├── backend/Dockerfile
│   └── frontend/Dockerfile
└── IA/                   # Documentação para IA (esta pasta)
```

## 🔧 TECNOLOGIAS E VERSÕES

### Backend (NestJS)
- **Framework:** NestJS (Node.js)
- **Linguagem:** TypeScript
- **ORM:** Prisma
- **Autenticação:** JWT + Passport
- **Validação:** class-validator
- **Hash de senhas:** bcrypt
- **Porta:** 3001

### Frontend (Next.js)
- **Framework:** Next.js 14
- **Linguagem:** TypeScript
- **Estilo:** TailwindCSS
- **HTTP Client:** Axios
- **Estado:** React Context API
- **Porta:** 3000

### Banco de Dados
- **SGBD:** PostgreSQL 16 Alpine
- **ORM:** Prisma
- **Porta:** 5432
- **Database:** emotional_app

### Infraestrutura
- **Containerização:** Docker + Docker Compose
- **Volumes:** Persistência de dados
- **Network:** emotional_network (bridge)

## 🗄️ SCHEMA DO BANCO
```sql
-- Usuários do sistema
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  
  emotionalCheckins EmotionalCheckin[]
  journalEntries    JournalEntry[]
}

-- Registros emocionais
model EmotionalCheckin {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  mood      Int      // 1-10 scale
  energy    Int      // 1-10 scale  
  stress    Int      // 1-10 scale
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

-- Entradas do diário
model JournalEntry {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 🔐 SEGURANÇA IMPLEMENTADA
- **JWT Authentication:** Tokens seguros com expiração
- **Password Hashing:** bcrypt com salt rounds
- **Route Protection:** Guards no backend + middleware no frontend
- **User Isolation:** Cada usuário só acessa seus próprios dados
- **CORS:** Configurado para permitir frontend
- **Validation:** DTOs com class-validator
- **UUID:** Identificadores seguros (não sequenciais)

## 🌊 FLUXO DE AUTENTICAÇÃO
1. **Registro:** POST `/auth/register` → hash senha → salva no DB → retorna JWT
2. **Login:** POST `/auth/login` → valida senha → gera JWT → retorna token
3. **Proteção:** Todas as rotas protegidas exigem `Authorization: Bearer <token>`
4. **Frontend:** Context provider gerencia estado + localStorage

## 📊 PADRÕES DE API
**Estrutura de Resposta:**
```json
// Sucesso
{
  "id": "uuid",
  "data": {...},
  "user": { "id", "name", "email" }
}

// Erro
{
  "message": "Descrição do erro",
  "error": "ErrorType",
  "statusCode": 400
}
```

**Status Codes:**
- 200: GET com sucesso
- 201: POST criado com sucesso
- 400: Erro de validação
- 401: Não autorizado
- 404: Recurso não encontrado
- 500: Erro interno do servidor

## 🐳 DOCKER CONFIGURATION
**Services:**
- **backend:** NestJS na porta 3001
- **frontend:** Next.js na porta 3000
- **db:** PostgreSQL na porta 5432

**Volumes:**
- `postgres_data`: Dados persistentes do banco
- `backend_node_modules`: Cache de dependências backend
- `frontend_node_modules`: Cache de dependências frontend

**Networks:**
- `emotional_network`: Bridge network para comunicação entre containers

## 🔄 DESENVOLVIMENTO LOCAL
**Iniciar ambiente:**
```bash
cd devOps
docker compose up
```

**URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: localhost:5432

---
**📅 Última atualização:** 6 de abril de 2026  
**🤖 Para agentes IA:** Esta arquitetura está 100% funcional e testada