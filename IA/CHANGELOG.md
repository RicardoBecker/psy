# 📋 CHANGELOG - EMOTIONAL APP

Todas as mudanças importantes neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Não Lançado]
### Planejado
- Modal de criação de usuários
- Modal de edição de perfil 
- Exportação de relatórios (PDF/Excel)
- Sistema de auditoria de ações
- Notificações por email
- Reset de senha administrativo

## [2.0.0] - 2024-12-18
### Adicionado
- 👥 **Sistema completo de administração de usuários**
  - Dashboard com estatísticas detalhadas
  - Interface CRUD para gerenciamento de usuários
  - Sistema de filtros avançados (busca, role, faixa etária, status)
  - Paginação inteligente com controles completos
  - Página de detalhes individuais de usuários
  
- 🔐 **Controles administrativos avançados**
  - Alteração de roles de usuários (ADMIN, PSYCHOLOGIST, PATIENT, GUARDIAN)
  - Ativação/desativação de contas
  - Visualização de métricas por faixa etária
  - Proteção com RolesGuard para endpoints admin

- 🎨 **Componentes de interface modulares**
  - UsersStats: Dashboard estatístico
  - UsersFilters: Sistema de filtros
  - UsersTable: Tabela responsiva de usuários
  - UsersPagination: Controles de paginação
  
- 🔧 **Backend robusto**
  - AdminModule com estrutura completa
  - 7 endpoints administrativos no AdminUsersController
  - DTOs validados para todas as operações
  - Queries Prisma otimizadas

### Técnico
- **Backend**: apps/backend/src/modules/admin/
- **Frontend**: apps/frontend/components/admin/ e /dashboard/admin/users/
- **API Client**: admin-api.ts com client TypeScript
- **Documentação**: admin-user-management.md completa

## [1.0.0] - 2024-04-06
### Adicionado
- 🔐 **Sistema de autenticação completo**
  - JWT authentication com Passport
  - Registro e login de usuários
  - Context provider para auth state
  - Guards de proteção de rotas

- 📊 **CRUD completo de funcionalidades principais**
  - EmotionalCheckins com escalas 1-10
  - JournalEntries com busca
  - Estatísticas e métricas
  - Validação rigorosa de DTOs

- 🏗️ **Infraestrutura base**
  - Docker Compose com PostgreSQL
  - NestJS backend configurado
  - Next.js 14 frontend
  - Prisma ORM com migrations

- 🎨 **Interface de usuário**
  - Landing page responsiva
  - Dashboard funcional
  - Formulários validados
  - Sistema de notificações

### Segurança
- Isolamento por usuário (req.user.id)
- Hash de senhas com bcrypt
- UUIDs para identificadores seguros  
- Validação de entrada em todos os endpoints
- CORS configurado

### Técnico
- **Stack**: NestJS + Next.js + PostgreSQL + Prisma
- **Auth**: JWT stateless
- **Styling**: TailwindCSS
- **Testing**: Curl endpoints + PostgreSQL direct validation

## [0.1.0] - 2024-03-01
### Adicionado
- ⚡ **Setup inicial do projeto**
  - Estrutura de diretórios
  - Configuração Docker
  - Setup básico NestJS e Next.js

---

## Tipos de Mudanças
- **Adicionado** para novas funcionalidades.
- **Alterado** para mudanças em funcionalidades existentes.  
- **Depreciado** para funcionalidades que serão removidas.
- **Removido** para funcionalidades removidas.
- **Corrigido** para correções de bugs.
- **Segurança** para vulnerabilidades.

## Convenções
- Todas as datas estão no formato ISO (YYYY-MM-DD)
- Funcionalidades principais são marcadas com emojis
- Links para documentação detalhada quando aplicável
- Separação clara entre funcionalidades de usuário e técnicas