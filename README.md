# 🧠 Emotional App - Documentação Completa

Uma plataforma moderna de acompanhamento emocional construída com arquitetura fullstack modular.

## 📋 Índice
- [🎯 Sobre o Projeto](#-sobre-o-projeto)
- [🏗️ Arquitetura do Sistema](#️-arquitetura-do-sistema)
- [📁 Estrutura de Diretórios](#-estrutura-de-diretórios)
- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [🚀 Como Executar](#-como-executar)
- [� Usuários de Teste](#-usuários-de-teste)
- [�📡 Documentação da API](#-documentação-da-api)
- [🗄️ Banco de Dados](#️-banco-de-dados)
- [🔧 Desenvolvimento](#-desenvolvimento)
- [🐳 Docker e DevOps](#-docker-e-devops)
- [🧪 Testes](#-testes)
- [🆘 Solução de Problemas](#-solução-de-problemas)

---

## 🎯 Sobre o Projeto

O **Emotional App** é um MVP de uma plataforma de bem-estar emocional que permite aos usuários:
- ✅ Realizar check-ins emocionais diários
- ✅ Manter um diário pessoal
- ✅ Acompanhar padrões emocionais ao longo do tempo
- ✅ Desenvolver práticas de autocuidado
- ✅ Autenticação segura com JWT
- ✅ Interface moderna e responsiva

### 🎨 Características Principais
- **Arquitetura Modular**: Backend e frontend completamente separados
- **Containerização**: Ambiente totalmente containerizado com Docker
- **Hot Reload**: Desenvolvimento com recarregamento automático
- **TypeScript**: Tipagem estática em todo o projeto
- **Banco Relacional**: PostgreSQL com Prisma ORM
- **API RESTful**: Endpoints bem definidos e documentados

---

## 🏗️ Arquitetura do Sistema

```mermaid
graph TB
    User[👤 Usuário] --> Frontend[🌐 Frontend - Next.js]
    Frontend --> Backend[⚙️ Backend - NestJS API]
    Backend --> DB[(🗄️ PostgreSQL)]
    
    subgraph "🐳 Docker Environment"
        Frontend
        Backend
        DB
        DevTools[🔧 DevOps Tools]
    end
    
    subgraph "🔗 External Tools"
        DBeaver[📊 DBeaver - DB Management]
        VSCode[💻 VS Code - Development]
    end
    
    DBeaver -.-> DB
    VSCode -.-> Frontend
    VSCode -.-> Backend
```

### 🔄 Fluxo de Dados
1. **Usuario** → Interage com a **Interface Web** (Next.js)
2. **Frontend** → Envia requisições para a **API REST** (NestJS)
3. **Backend** → Autentica/valida dados e acessa o **Banco** (PostgreSQL)
4. **Banco** → Retorna dados via **Prisma ORM**
5. **API** → Responde ao **Frontend** com JSON
6. **Interface** → Atualiza a **UI** para o usuário

---

## 📁 Estrutura de Diretórios

### 🗂️ Visão Geral
```
emotional-app/
├── 📱 apps/                    # Aplicações do projeto
│   ├── 🔧 backend/            # API REST em NestJS
│   └── 🎨 frontend/           # Interface em Next.js
├── 🐳 devOps/                 # Configurações Docker
│   ├── backend/               # Container do backend
│   ├── frontend/              # Container do frontend
│   └── docker-compose.yml     # Orquestração
├── 📄 .env.example            # Variáveis de ambiente
├── 🚫 .gitignore             # Arquivos ignorados
└── 📚 README.md              # Documentação
```

### 🔧 Backend (`apps/backend/`)

**Tecnologias**: NestJS + TypeScript + Prisma + PostgreSQL

```
backend/
├── 📂 src/                    # Código fonte
│   ├── 🎯 main.ts            # Entry point da aplicação
│   ├── 📦 app.module.ts      # Módulo raiz do NestJS
│   ├── 🎮 app.controller.ts  # Controller principal (health check)
│   ├── ⚙️ app.service.ts     # Serviço principal
│   ├── 🗃️ prisma/            # Configuração Prisma
│   │   ├── prisma.module.ts  # Módulo Prisma
│   │   └── prisma.service.ts # Serviço de conexão DB
│   └── 📁 modules/           # Módulos de negócio
│       ├── 🔐 auth/          # Autenticação JWT
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── 📝 dto/       # Data Transfer Objects
│       │   ├── 🛡️ guards/    # Guards de autenticação
│       │   └── 🔑 strategies/ # Estratégias Passport
│       ├── 👥 users/         # Gerenciamento de usuários
│       ├── 😊 emotional-checkins/ # Check-ins emocionais
│       └── 📖 journal-entries/    # Entradas do diário
├── 🗄️ prisma/               # Schema e migrações
│   └── schema.prisma        # Definição do banco
├── 📦 package.json          # Dependências e scripts
├── ⚙️ tsconfig.json         # Configuração TypeScript
└── 🏗️ nest-cli.json         # Configuração NestJS
```

#### 🎯 Arquivos Principais do Backend

| Arquivo | Função | Descrição |
|---------|--------|-----------|
| `main.ts` | Entry Point | Inicializa a aplicação NestJS na porta 3001 |
| `app.module.ts` | Módulo Raiz | Importa todos os módulos (Auth, Users, etc.) |
| `app.controller.ts` | Health Check | Endpoint `/api/v1/health` para monitoramento |
| `prisma/schema.prisma` | Schema DB | Definição das tabelas (User, EmotionalCheckin, JournalEntry) |
| `auth/auth.service.ts` | Autenticação | Login, registro e validação JWT |
| `users/users.service.ts` | Usuários | CRUD de usuários com hash de senha |

### 🎨 Frontend (`apps/frontend/`)

**Tecnologias**: Next.js 14 + TypeScript + TailwindCSS

```
frontend/
├── 📂 app/                   # App Router (Next.js 14)
│   ├── 🎨 globals.css       # Estilos globais + Tailwind
│   ├── 🏠 page.tsx          # Página inicial
│   └── 🖼️ layout.tsx        # Layout base da aplicação
├── 🧩 components/           # Componentes reutilizáveis
├── 🌍 public/               # Arquivos estáticos
├── 📦 package.json          # Dependências e scripts
├── ⚙️ tsconfig.json         # Configuração TypeScript
├── 🎨 tailwind.config.js    # Configuração Tailwind
├── 📮 postcss.config.js     # Configuração PostCSS
├── 🔧 next.config.js        # Configuração Next.js
└── 📄 next-env.d.ts         # Types do Next.js
```

#### 🎨 Arquivos Principais do Frontend

| Arquivo | Função | Descrição |
|---------|--------|-----------|
| `app/page.tsx` | Homepage | Página inicial com apresentação do produto |
| `app/layout.tsx` | Layout | Template base com metadata e font |
| `app/globals.css` | Estilos | CSS global + configuração Tailwind |
| `tailwind.config.js` | Tema | Configuração de cores e breakpoints |
| `next.config.js` | Build | Configurações de build do Next.js |

### 🐳 DevOps (`devOps/`)

**Tecnologias**: Docker + Docker Compose

```
devOps/
├── 🐳 docker-compose.yml    # Orquestração dos serviços
├── 🔧 backend/              # Configuração container backend
│   ├── 🐋 Dockerfile       # Imagem Node.js + dependências
│   └── 🚫 .dockerignore    # Arquivos ignorados no build
├── 🎨 frontend/             # Configuração container frontend
│   ├── 🐋 Dockerfile       # Imagem Node.js + Next.js
│   └── 🚫 .dockerignore    # Arquivos ignorados no build
└── 📚 README.md            # Documentação DevOps
```

#### 🐳 Serviços Docker

| Serviço | Porta | Função | Dependências |
|---------|-------|--------|--------------|
| **backend** | 3001 | API NestJS | db |
| **frontend** | 3000 | Interface Next.js | backend |
| **db** | 5432 | PostgreSQL 16 | - |

---

## 🛠️ Stack Tecnológica

### 🔧 Backend (API REST)
- **Runtime:** [Node.js 20](https://nodejs.org/) - Ambiente JavaScript server-side
- **Framework:** [NestJS](https://nestjs.com/) - Framework Node.js inspirado no Angular
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) - JavaScript com tipagem estática
- **ORM:** [Prisma](https://www.prisma.io/) - Toolkit de banco de dados moderno
- **Banco:** [PostgreSQL 16](https://www.postgresql.org/) - Banco relacional robusto
- **Auth:** [JWT](https://jwt.io/) + [Passport](http://www.passportjs.org/) - Autenticação segura
- **Hash:** [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Criptografia de senhas
- **Validação:** [class-validator](https://github.com/typestack/class-validator) - Validação de dados

### 🎨 Frontend (Interface Web)
- **Framework:** [Next.js 14](https://nextjs.org/) - React com App Router
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- **UI Library:** [React 18](https://react.dev/) - Biblioteca de componentes
- **Styling:** [TailwindCSS](https://tailwindcss.com/) - Framework CSS utilitário
- **Build:** [PostCSS](https://postcss.org/) + [Autoprefixer](https://autoprefixer.github.io/) - Processamento CSS

### 🐳 DevOps & Infraestrutura
- **Containers:** [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/)
- **Base Images:** [Node.js 20 Alpine](https://hub.docker.com/_/node) - Imagens leves
- **DB Management:** [DBeaver](https://dbeaver.io/) - Interface gráfica para banco
- **Hot Reload:** Volumes mapeados para desenvolvimento ativo

### 📊 Dependências Principais

#### Backend
```json
{
  "dependencies": {
    "@nestjs/core": "^10.0.0",     // Core do NestJS
    "@nestjs/jwt": "^10.1.1",      // JWT para NestJS
    "@prisma/client": "^5.6.0",    // Client Prisma
    "bcrypt": "^5.1.1",            // Hash de senhas
    "passport-jwt": "^4.0.1"       // Estratégia JWT
  },
  "devDependencies": {
    "prisma": "^5.6.0",            // CLI Prisma
    "typescript": "^5.1.3"         // Compilador TS
  }
}
```

#### Frontend
```json
{
  "dependencies": {
    "next": "14.0.0",              // Framework Next.js
    "react": "^18.0.0",            // React library
    "tailwindcss": "^3.3.0"       // CSS framework
  },
  "devDependencies": {
    "@types/react": "^18.2.45",    // Types React
    "typescript": "^5.3.3"         // Compilador TS
  }
}
```

---

## 🚀 Como Executar

### ⚡ Início Rápido (Recomendado)

```bash
# 1. Clone o repositório
git clone <seu-repositorio>
cd emotional-app

# 2. Navegue para a pasta DevOps
cd devOps

# 3. Execute a aplicação completa
docker compose up --build

# 🎉 Pronto! Acesse:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001/api/v1/health
# Database: localhost:5432
```

### 📋 Pré-requisitos

#### 🐳 Usando Docker (Recomendado - Mais Fácil)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- Portas **3000**, **3001** e **5432** disponíveis

#### 💻 Desenvolvimento Local (Avançado)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### 🔧 Comandos Detalhados

#### 🐳 Com Docker
```bash
# Navegar para DevOps
cd devOps

# ⬆️ Subir aplicação completa
docker compose up                    # Logs visíveis
docker compose up -d                 # Background (daemon)
docker compose up --build           # Rebuild + Start

# ⬇️ Parar aplicação
docker compose down                  # Parar containers
docker compose down -v              # Parar + limpar volumes

# 🔨 Build específico
docker compose build backend        # Rebuild apenas backend
docker compose build frontend       # Rebuild apenas frontend
docker compose build --no-cache     # Build sem cache

# 📋 Logs e monitoramento
docker compose logs -f              # Logs em tempo real
docker compose logs backend         # Logs apenas do backend
docker compose ps                   # Status dos containers
docker compose exec backend sh      # Acessar terminal do backend

# 🧹 Limpeza completa
docker compose down -v              # Parar + limpar volumes
docker system prune -f              # Limpar cache Docker
```

#### 💻 Desenvolvimento Local
```bash
# Backend
cd apps/backend
cp ../../.env.example .env           # Configurar variáveis
npm install                          # Instalar dependências
npx prisma migrate dev               # Executar migrações
npx prisma generate                  # Gerar client Prisma
npm run dev                          # Iniciar em modo dev (porta 3001)

# Frontend (em outro terminal)
cd apps/frontend
npm install                          # Instalar dependências  
npm run dev                          # Iniciar em modo dev (porta 3000)
```

### 🔐 Configuração de Ambiente

#### 📄 Arquivo `.env` (Para desenvolvimento local)
```bash
# Copie o arquivo exemplo
cp .env.example .env

# Edite as variáveis conforme necessário
nano .env  # ou vi, code, etc.
```

#### 🌍 Variáveis de Ambiente
| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `DATABASE_URL` | URL conexão PostgreSQL | `postgresql://postgres:postgres@db:5432/emotional_app` |
| `JWT_SECRET` | Chave secreta JWT | `changeme_in_production_please` |
| `PORT` | Porta do backend | `3001` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `NEXT_PUBLIC_API_URL` | URL da API para frontend | `http://localhost:3001/api/v1` |

---

## � Usuários de Teste

O sistema já possui usuários pré-configurados para testar todas as funcionalidades do RBAC (controle de acesso baseado em roles). Use estes usuários para explorar diferentes níveis de acesso:

### 🔑 Credenciais de Teste

#### 🛡️ **ADMIN** - Controle Total do Sistema
```
Email: admin@psico.com
Senha: admin123
Role: ADMIN
Descrição: Pode gerenciar usuários, alterar roles e acessar todas as funcionalidades
```

#### 🧠 **PSYCHOLOGIST** - Profissional de Psicologia
```
Email: maria@psicologo.com
Senha: psi123
Role: PSYCHOLOGIST
Descrição: Pode criar perfil profissional, gerenciar pacientes e solicitar vínculos
```

#### 👤 **PATIENT** - Paciente Adulto
```
Email: joao@paciente.com
Senha: paciente123
Role: PATIENT
AgeGroup: ADULT (nascido em 1990)
Descrição: Usuário padrão do sistema, pode fazer check-ins e manter diário
```

#### 👨‍👩‍👧 **GUARDIAN** - Responsável Legal
```
Email: ana@responsavel.com
Senha: resp123
Role: GUARDIAN
AgeGroup: ADULT (nascido em 1980)
Descrição: Pode gerenciar menores de idade e aprovar consentimentos
```

#### 👦 **ADOLESCENT** - Paciente Adolescente
```
Email: pedro@menor.com
Senha: menor123
Role: PATIENT
AgeGroup: ADOLESCENT (nascido em 2010 - 16 anos)
Descrição: Menor de idade que necessita aprovação do responsável
```

#### 👶 **CHILD** - Paciente Criança
```
Email: sofia@crianca.com
Senha: crianca123
Role: PATIENT
AgeGroup: CHILD (nascido em 2018 - 8 anos)
Descrição: Menor de idade que necessita aprovação e acompanhamento do responsável
```

### 🧪 Como Testar

#### 1. **Login com Diferentes Roles**
```bash
# Testar login como ADMIN
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@psico.com", "password": "admin123"}'

# Testar login como PSYCHOLOGIST  
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "maria@psicologo.com", "password": "psi123"}'
```

#### 2. **Testar Controle de Acesso**
- Faça login com cada usuário
- Copie o `access_token` da resposta
- Use o token para acessar endpoints protegidos

```bash
# Exemplo: Acessar endpoint que requer role ADMIN
curl -H "Authorization: Bearer SEU_TOKEN_AQUI" \
     http://localhost:3001/api/v1/users
```

#### 3. **Testar Sistema de Idade**
- Usuários menores de 18 anos (Pedro e Sofia) têm restrições especiais
- Responsáveis (Ana) podem gerenciar relacionamentos com menores
- Sistema automaticamente calcula `ageGroup` baseado na `birthDate`

### 🔐 Funcionalidades por Role

| Role | Funcionalidades Disponíveis |
|------|----------------------------|
| **ADMIN** | ✅ Gerenciar usuários<br>✅ Alterar roles<br>✅ Verificar psicólogos<br>✅ Visualizar todo sistema |
| **PSYCHOLOGIST** | ✅ Criar perfil profissional<br>✅ Solicitar vínculos com pacientes<br>✅ Gerenciar lista de pacientes |
| **PATIENT** | ✅ Check-ins emocionais<br>✅ Diário pessoal<br>✅ Solicitar acompanhamento psicológico |
| **GUARDIAN** | ✅ Gerenciar relacionamentos com menores<br>✅ Aprovar consentimentos<br>✅ Funcionalidades de PATIENT |

---

## �📡 Documentação da API

### 🏥 Health Check
```http
GET /api/v1/health
```
**Resposta:**
```json
{
  "status": "ok",
  "message": "Emotional App API está funcionando!",
  "timestamp": "2026-04-01T19:59:10.052Z",
  "environment": "development"
}
```

### 🔐 Autenticação

#### 📝 Registro de Usuário
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@exemplo.com", 
  "password": "123456"
}
```

**Resposta de Sucesso (201):**
```json
{
  "user": {
    "id": "uuid-v4",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "createdAt": "2026-04-01T10:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 🔑 Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "joao@exemplo.com",
  "password": "123456"
}
```

**Resposta de Sucesso (200):**
```json
{
  "user": {
    "id": "uuid-v4", 
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "createdAt": "2026-04-01T10:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 👤 Usuários

#### 📊 Perfil do Usuário
```http
GET /api/v1/users/profile
Authorization: Bearer <token-jwt>
```

**Resposta de Sucesso (200):**
```json
{
  "id": "uuid-v4",
  "name": "João Silva", 
  "email": "joao@exemplo.com",
  "createdAt": "2026-04-01T10:00:00.000Z"
}
```

### 😊 Emotional Check-ins (Em Desenvolvimento)
```http
GET    /api/v1/emotional-checkins     # Listar check-ins
POST   /api/v1/emotional-checkins     # Criar check-in
GET    /api/v1/emotional-checkins/:id # Obter check-in
PUT    /api/v1/emotional-checkins/:id # Atualizar check-in
DELETE /api/v1/emotional-checkins/:id # Deletar check-in
```

### 📖 Journal Entries (Em Desenvolvimento)
```http
GET    /api/v1/journal-entries     # Listar entradas
POST   /api/v1/journal-entries     # Criar entrada
GET    /api/v1/journal-entries/:id # Obter entrada
PUT    /api/v1/journal-entries/:id # Atualizar entrada  
DELETE /api/v1/journal-entries/:id # Deletar entrada
```

### 🔒 Autenticação Bearer Token
Para endpoints protegidos, inclua o JWT no header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ❌ Códigos de Erro Comuns
| Código | Significado | Causa |
|--------|-------------|-------|
| **400** | Bad Request | Dados inválidos na requisição |
| **401** | Unauthorized | Token JWT ausente ou inválido |
| **404** | Not Found | Endpoint ou recurso não encontrado |
| **409** | Conflict | Email já existe (registro) |
| **500** | Internal Server Error | Erro no servidor |

---

## 🗄️ Banco de Dados

### 📊 Schema PostgreSQL

#### 👤 Tabela `users`
```sql
CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 😊 Tabela `emotional_checkins`
```sql
CREATE TABLE emotional_checkins (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood       INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 10),
    energy     INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 10),
    stress     INTEGER NOT NULL CHECK (stress >= 1 AND stress <= 10),
    notes      TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 📖 Tabela `journal_entries`
```sql
CREATE TABLE journal_entries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🔗 Relacionamentos
- `User` **1:N** `EmotionalCheckin` (Um usuário pode ter muitos check-ins)
- `User` **1:N** `JournalEntry` (Um usuário pode ter muitas entradas)
- **Cascade Delete**: Ao deletar usuário, check-ins e entradas são removidos

### 🛠️ Comandos Prisma
```bash
# Gerar client após mudanças no schema
npx prisma generate

# Executar migrações
npx prisma migrate dev --name init

# Visualizar dados (Prisma Studio)
npx prisma studio

# Reset completo do banco
npx prisma migrate reset

# Ver status das migrações
npx prisma migrate status
```

### 🔌 Conexão com DBeaver
1. **Abrir DBeaver**
2. **Nova Conexão** → PostgreSQL
3. **Configurar:**
   - Host: `localhost`
   - Porta: `5432`
   - Database: `emotional_app`
   - Usuario: `postgres`
   - Senha: `postgres`

---

## 🔧 Desenvolvimento

### 📝 Workflow de Desenvolvimento

#### 🔄 Fluxo Padrão
```bash
# 1. Subir ambiente de desenvolvimento
cd devOps && docker compose up -d

# 2. Fazer alterações no código
# (Os arquivos são mapeados com hot reload)

# 3. Ver logs em tempo real
docker compose logs -f backend   # Backend
docker compose logs -f frontend  # Frontend

# 4. Testar mudanças
curl http://localhost:3001/api/v1/health
open http://localhost:3000

# 5. Parar quando terminar
docker compose down
```

#### 🆕 Adicionando Nova Feature

**Backend (NestJS):**
```bash
# 1. Acessar container do backend
docker compose exec backend sh

# 2. Gerar novo módulo
nest generate module nome-feature
nest generate controller nome-feature
nest generate service nome-feature

# 3. Implementar lógica de negócio
# 4. Atualizar schema Prisma se necessário
# 5. Testar endpoint
```

**Frontend (Next.js):**
```bash
# 1. Criar nova página
# apps/frontend/app/nova-pagina/page.tsx

# 2. Criar componentes reutilizáveis  
# apps/frontend/components/NovoComponente.tsx

# 3. Adicionar estilos Tailwind
# Usar classes utilitárias

# 4. Testar no navegador
# http://localhost:3000/nova-pagina
```

### 🧪 Scripts de Desenvolvimento

#### 🔧 Backend
```bash
cd apps/backend

# Desenvolvimento
npm run dev              # Modo desenvolvimento + watch
npm run start:debug      # Com debugger
npm run build            # Compilar TypeScript
npm run start:prod       # Produção

# Prisma
npm run prisma:generate  # Gerar client
npm run prisma:migrate   # Executar migrações  
npm run prisma:studio    # Interface visual
npm run prisma:push      # Push schema sem migração

# Testes
npm run test             # Testes unitários
npm run test:watch       # Watch mode
npm run test:cov         # Com coverage
npm run test:e2e         # Testes end-to-end

# Qualidade de Código
npm run lint             # ESLint
npm run format           # Prettier
```

#### 🎨 Frontend  
```bash
cd apps/frontend

# Desenvolvimento
npm run dev              # Modo desenvolvimento
npm run build            # Build otimizado
npm run start            # Servir build
npm run lint             # ESLint + Next.js rules
```

### 🔍 Debug e Monitoramento

#### 📊 Logs Úteis
```bash
# Logs em tempo real
docker compose logs -f

# Logs específicos
docker compose logs backend --tail 100
docker compose logs frontend --tail 50

# Monitoramento de recursos
docker stats

# Inspecionar containers
docker compose ps
docker compose exec backend sh
docker compose exec frontend sh
```

#### 🐛 Debug Comum
```bash
# Verificar status dos serviços
curl -f http://localhost:3001/api/v1/health
curl -f http://localhost:3000

# Testar conectividade do banco
docker compose exec db psql -U postgres -d emotional_app -c "SELECT version();"

# Ver variáveis de ambiente
docker compose exec backend printenv | grep -E "(DATABASE|JWT|PORT)"

# Rebuild quando necessário  
docker compose build --no-cache backend
docker compose up --force-recreate backend
```

---

## 🐳 Docker e DevOps

### 🏗️ Arquitetura de Containers

```mermaid
graph LR
    subgraph "🌐 Host"
        P3000[":3000"] --> Frontend
        P3001[":3001"] --> Backend  
        P5432[":5432"] --> Database
    end
    
    subgraph "🐳 Docker Network"
        Frontend[🎨 Frontend<br/>Next.js]
        Backend[⚙️ Backend<br/>NestJS]
        Database[(🗄️ PostgreSQL)]
        
        Frontend --> Backend
        Backend --> Database
    end
    
    subgraph "💾 Volumes"
        V1[backend_node_modules]
        V2[frontend_node_modules] 
        V3[postgres_data]
    end
    
    Backend -.-> V1
    Frontend -.-> V2
    Database -.-> V3
```

### 🐋 Dockerfile Explicado

#### 🔧 Backend Dockerfile
```dockerfile
# Base: Node.js 20 Alpine (leve)
FROM node:20-alpine

# Instalar deps do Sistema (OpenSSL para Prisma)
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat

WORKDIR /app

# Copiar manifesto de dependências
COPY package*.json ./

# Instalar dependências Node.js
RUN npm install

# Copiar código fonte
COPY . .

# Gerar client Prisma
RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "run", "dev"]
```

#### 🎨 Frontend Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código fonte
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### ⚙️ Docker Compose Explicado

```yaml
services:
  # 🔧 Backend - API NestJS
  backend:
    build: 
      context: ../apps/backend          # Pasta com código
      dockerfile: ../../devOps/backend/Dockerfile
    ports:
      - "3001:3001"                     # Porta host:container
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/emotional_app
      - JWT_SECRET=changeme_in_production_please
      - PORT=3001
      - NODE_ENV=development
    volumes:
      - ../apps/backend:/app            # Hot reload código
      - backend_node_modules:/app/node_modules  # Cache deps
    depends_on:
      - db                              # Espera DB iniciar
    networks:
      - emotional_network               # Rede isolada

  # 🎨 Frontend - Interface Next.js  
  frontend:
    build:
      context: ../apps/frontend
      dockerfile: ../../devOps/frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
      - NODE_ENV=development
    volumes:
      - ../apps/frontend:/app           # Hot reload código
      - frontend_node_modules:/app/node_modules  # Cache deps
      - /app/.next                      # Cache build Next.js
    depends_on:
      - backend                         # Espera backend iniciar
    networks:
      - emotional_network

  # 🗄️ Database - PostgreSQL
  db:
    image: postgres:16-alpine           # Imagem oficial
    restart: always                     # Restart automático
    ports:
      - "5432:5432"                     # Acesso externo (DBeaver)
    environment:
      - POSTGRES_DB=emotional_app
      - POSTGRES_USER=postgres  
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persistência
    networks:
      - emotional_network

# 💾 Volumes nomeados (persistem dados)
volumes:
  postgres_data:                        # Dados do PostgreSQL
  backend_node_modules:                 # Cache deps backend
  frontend_node_modules:                # Cache deps frontend

# 🔗 Rede isolada para comunicação entre containers  
networks:
  emotional_network:
    driver: bridge
```

### 🔄 Comandos Docker Avançados

```bash
# 🔍 Debugging
docker compose config                   # Validar compose
docker compose ps -a                    # Status detalhado
docker compose images                   # Imagens usadas
docker compose exec backend env         # Ver env variables

# 📊 Monitoramento
docker compose top                      # Processos rodando
docker stats $(docker compose ps -q)   # Uso de recursos  
docker compose logs --timestamps        # Logs com timestamp

# 🧹 Limpeza
docker compose down --remove-orphans    # Remove containers órfãos
docker compose down --volumes          # Remove volumes também
docker system prune -a                 # Limpeza completa Docker

# 🔄 Rebuild estratégico  
docker compose build --pull backend    # Rebuild + pull base image
docker compose up --force-recreate db  # Recriar só o banco
docker compose restart frontend        # Restart rápido
```

---

## 🧪 Testes

### 🎯 Tipos de Teste

#### 🔬 Backend - Testes Unitários
```bash
cd apps/backend

# Executar todos os testes
npm run test

# Watch mode (desenvolvimento)
npm run test:watch

# Coverage report
npm run test:cov

# Teste específico
npm run test auth.service.spec.ts
```

#### 🌐 Backend - Testes E2E
```bash
# Testes end-to-end
npm run test:e2e

# Teste de endpoints específicos
npm run test:e2e auth.e2e-spec.ts
```

#### 🎨 Frontend - Testes (A implementar)
```bash
cd apps/frontend

# Testes de componentes
npm run test

# Testes E2E (Playwright/Cypress)  
npm run test:e2e
```

### 🔍 Estrutura de Testes

```
backend/
├── src/
│   └── **/*.spec.ts        # Testes unitários
└── test/
    └── **/*.e2e-spec.ts    # Testes E2E

frontend/
├── __tests__/              # Testes Jest
├── cypress/                # Testes E2E Cypress  
└── playwright/             # Testes E2E Playwright
```

### 🧪 Exemplos de Teste

#### 🔧 Backend - Teste de Serviço
```typescript
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, PrismaService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com', 
      password: 'password123'
    };

    const result = await service.create(userData);
    
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
    expect(result.passwordHash).toBeUndefined(); // Não deve retornar senha
  });
});
```

#### 🌐 Backend - Teste E2E  
```typescript
// auth.e2e-spec.ts
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
        expect(res.body.user).toHaveProperty('id');
      });
  });
});
```

---

## 🆘 Solução de Problemas

### ❌ Problemas Comuns

#### 🐳 Docker

**Erro: "port already in use"**
```bash
# Verificar processos nas portas
lsof -i :3000  # Frontend
lsof -i :3001  # Backend  
lsof -i :5432  # Database

# Matar processo específico
kill -9 <PID>

# Ou parar containers Docker
docker compose down
```

**Erro: "no space left on device"** 
```bash
# Limpar cache Docker
docker system prune -a

# Remover volumes não utilizados
docker volume prune

# Remover imagens antigas
docker image prune -a
```

**Erro: Build falhou**
```bash
# Rebuild sem cache
docker compose build --no-cache

# Verificar logs detalhados
docker compose build --progress=plain backend

# Limpar e rebuilt
docker compose down -v
docker system prune -f
docker compose up --build
```

#### 🔧 Backend

**Erro: "Cannot connect to database"**
```bash
# Verificar se DB está rodando
docker compose ps db

# Testar conexão manual
docker compose exec db psql -U postgres -d emotional_app

# Verificar variáveis de ambiente
docker compose exec backend printenv | grep DATABASE_URL

# Aguardar DB inicializar
docker compose up db
# Aguardar ~30s, depois:
docker compose up backend
```

**Erro: "Prisma client not generated"**
```bash
# Regenerar client Prisma
docker compose exec backend npx prisma generate

# Ou rebuild container
docker compose build --no-cache backend
```

**Erro: "Port 3001 EADDRINUSE"**
```bash
# Verificar se já está rodando
curl http://localhost:3001/api/v1/health

# Matar processo na porta
lsof -ti:3001 | xargs kill -9

# Reiniciar container
docker compose restart backend
```

#### 🎨 Frontend

**Erro: "Module not found"**
```bash
# Reinstalar dependências
docker compose exec frontend npm install

# Ou rebuild
docker compose build --no-cache frontend
```

**Erro: "ECONNREFUSED backend"**
```bash
# Verificar se backend está rodando  
curl http://localhost:3001/api/v1/health

# Verificar variável de ambiente
docker compose exec frontend printenv | grep NEXT_PUBLIC_API_URL

# Aguardar backend inicializar
docker compose logs backend
```

### 🔧 Comandos de Diagnóstico

```bash
# 🩺 Health check completo
curl -f http://localhost:3001/api/v1/health && echo "✅ Backend OK"
curl -f http://localhost:3000 && echo "✅ Frontend OK"  
docker compose exec db pg_isready && echo "✅ Database OK"

# 📊 Status geral
docker compose ps                    # Status containers
docker compose logs --tail 20       # Últimos logs
docker stats --no-stream           # Uso de recursos

# 🔍 Debug específico
docker compose exec backend npm run test  # Testes backend
docker compose config --services         # Serviços configurados  
docker networks ls                       # Redes Docker
docker volumes ls                        # Volumes Docker

# 🧹 Reset completo (último recurso)
docker compose down -v               # Para tudo + remove volumes
docker system prune -a              # Limpa cache Docker
rm -rf apps/*/node_modules          # Remove node_modules local
docker compose up --build          # Rebuild completo
```

### 📞 Logs Importantes

#### ✅ Sucesso - Backend Iniciado
```
backend-1   | [Nest] 1  - LOG [NestApplication] Nest application successfully started +2ms
backend-1   | 🚀 Backend rodando na porta 3001
```

#### ✅ Sucesso - Frontend Iniciado  
```
frontend-1  | ▲ Next.js 14.0.0
frontend-1  | - Local:        http://localhost:3000
frontend-1  | ✓ Ready in 2.4s
```

#### ✅ Sucesso - Database Conectado
```
db-1        | LOG:  database system is ready to accept connections
backend-1   | [Nest] 1  - LOG [PrismaService] Prisma Client connected
```

#### ❌ Erro - Porta Ocupada
```
backend-1   | Error: listen EADDRINUSE: address already in use :::3001
```
**Solução:** `lsof -ti:3001 | xargs kill -9`

#### ❌ Erro - Banco Inacessível  
```
backend-1   | PrismaClientInitializationError: Can't reach database server
```
**Solução:** Verificar se container `db` está rodando

#### ❌ Erro - Variável de Ambiente
```
backend-1   | Error: JWT_SECRET is required
```
**Solução:** Verificar arquivo `.env` ou variáveis no docker-compose

---

## 📚 Recursos Adicionais

### 🔗 Links Úteis
- [Documentação NestJS](https://docs.nestjs.com/)
- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação Prisma](https://www.prisma.io/docs/)
- [Guia Docker](https://docs.docker.com/get-started/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### 🎯 Próximos Passos
- [ ] Implementar CRUD completo de emotional-checkins
- [ ] Implementar CRUD completo de journal-entries  
- [ ] Adicionar dashboard com gráficos
- [ ] Implementar notificações push
- [ ] Adicionar testes automatizados
- [ ] Configurar CI/CD
- [ ] Deploy em produção
- [ ] Adicionar monitoramento e logs
- [ ] Implementar cache (Redis)
- [ ] Adicionar rate limiting

### 🤝 Contribuindo
1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

**🏁 Projeto criado com ❤️ para acompanhamento emocional e bem-estar mental**

> 💡 **Dica**: Este README é um documento vivo. Mantenha-o atualizado conforme o projeto evolui!