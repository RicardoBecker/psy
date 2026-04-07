# 📋 PROJETO OVERVIEW - EMOTIONAL APP

## 🎯 PROPÓSITO DO PROJETO
Sistema fullstack moderno para bem-estar emocional com:
- Registro de estados emocionais (mood, energy, stress)
- Diário pessoal digital
- Autenticação completa (email/senha + social auth)
- Dashboard para acompanhamento pessoal

## 🏗️ ARQUITETURA GERAL
```
┌─────────────────┬─────────────────┬─────────────────┐
│    FRONTEND     │     BACKEND     │    DATABASE     │
│   Next.js 14    │   NestJS + TS   │  PostgreSQL 16  │
│   React + TS    │   Prisma ORM    │   Docker Compose│
│   TailwindCSS   │   JWT Auth      │   5432 port     │
│   port: 3000    │   port: 3001    │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

## 🚀 FUNCIONALIDADES IMPLEMENTADAS
✅ **Autenticação Completa:**
- Registro com email/senha
- Login com JWT tokens
- Middleware de proteção de rotas
- Estrutura preparada para Google/Apple OAuth

✅ **CRUD Emotional Checkins:**
- Criar registros (mood: 1-10, energy: 1-10, stress: 1-10, notes)
- Listar todos do usuário
- Atualizar registros existentes
- Deletar registros
- Estatísticas (médias, totais)

✅ **CRUD Journal Entries:**
- Criar entradas do diário
- Listar todas do usuário
- Buscar por texto (título/conteúdo)
- Atualizar entradas
- Deletar entradas
- Estatísticas (total, por semana)

✅ **Infraestrutura:**
- Docker Compose completo
- PostgreSQL configurado
- Prisma migrations funcionando
- Volumes persistentes

## 🔑 CREDENCIAIS DE TESTE
**Usuário de Teste:**
- Email: `[TEST_USER_EMAIL]`
- Senha: `[TEST_PASSWORD]`

**Banco PostgreSQL:**
- Host: `localhost:5432`
- Database: `[DATABASE_NAME]`
- User: `[DB_USER]`
- Password: `[DB_PASSWORD]`

## 📊 DADOS NO BANCO
**Tabelas principais:**
- `users` - Usuários do sistema
- `emotional_checkins` - Registros emocionais
- `journal_entries` - Entradas do diário
- `_prisma_migrations` - Controle de versões do schema

## 🌐 ENDPOINTS API PRINCIPAIS
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/profile

GET/POST/PATCH/DELETE /api/v1/emotional-checkins
GET /api/v1/emotional-checkins/stats

GET/POST/PATCH/DELETE /api/v1/journal-entries  
GET /api/v1/journal-entries/search?q=termo
GET /api/v1/journal-entries/stats
```

## 🎨 FRONTEND PAGES
- `/` - Landing page pública
- `/login` - Página de login
- `/register` - Página de registro
- `/dashboard` - Dashboard protegida (pós-login)

## ⚡ STATUS ATUAL
✅ **FUNCIONANDO 100%:**
- Todo o backend está operacional
- Frontend com autenticação completa
- CRUD salvando no PostgreSQL
- Docker containers rodando
- Banco de dados persistente

🔧 **PRÓXIMOS PASSOS:**
- Implementar OAuth social (Google/Apple)
- Dashboard com gráficos e visualizações
- Expandir funcionalidades do frontend
- Testes automatizados
- Deploy em produção

---
**📅 Última atualização:** 6 de abril de 2026  
**🤖 Para agentes IA:** Leia outros documentos da pasta /IA para contexto completo