# 🐳 DevOps - Docker Configuration

Esta pasta contém todas as configurações relacionadas ao Docker para o projeto Emotional App.

## 📁 Estrutura

```
devOps/
├── docker-compose.yml      # Orquestração de todos os serviços
├── backend/
│   ├── Dockerfile         # Container do backend NestJS
│   └── .dockerignore      # Arquivos ignorados no build
└── frontend/
    ├── Dockerfile         # Container do frontend Next.js
    └── .dockerignore      # Arquivos ignorados no build
```

## 🚀 Como Usar

### Executar o projeto completo

```bash
# A partir desta pasta (devOps)
docker compose up --build
```

### Comandos úteis

```bash
# Em background
docker compose up --build -d

# Parar serviços
docker compose down

# Rebuild específico
docker compose build backend
docker compose build frontend

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend

# Limpar volumes
docker compose down -v
```

## 🔧 Configuração

### Services definidos:

1. **backend** - API NestJS na porta 3001
2. **frontend** - Interface Next.js na porta 3000  
3. **db** - PostgreSQL na porta 5432

### Volumes:

- Hot reload ativado para backend e frontend
- Volume persistente para dados do PostgreSQL

### Networks:

- Rede isolada `emotional_network` para comunicação entre containers

---

**💡 Dica**: Sempre execute os comandos docker-compose a partir desta pasta para evitar problemas de path.