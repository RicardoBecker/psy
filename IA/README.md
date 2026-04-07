# 📚 ÍNDICE DA DOCUMENTAÇÃO IA - EMOTIONAL APP

## 🎯 **COMO USAR ESTA PASTA**

Esta pasta contém **documentação especializada para agentes de IA** trabalhar neste projeto. 

**⚠️ OBRIGATÓRIO:** Qualquer agente IA deve ler TODOS os documentos antes de fazer alterações no código.

## 📋 **DOCUMENTOS DISPONÍVEIS**

### 📄 **01-PROJETO-OVERVIEW.md**
**O que contém:** Visão geral completa do projeto
- Propósito e funcionalidades
- Arquitetura high-level
- Status atual (o que está funcionando)
- Credenciais de teste
- Próximos passos

**Quando ler:** PRIMEIRO documento - para entender o projeto como um todo

### 🏗️ **02-ARQUITETURA-SISTEMA.md**  
**O que contém:** Detalhes técnicos da arquitetura
- Estrutura de diretórios completa
- Tecnologias e versões específicas
- Schema do banco de dados
- Padrões de segurança implementados
- Configurações do Docker

**Quando ler:** Antes de modificar infraestrutura ou adicionar módulos

### 📝 **03-PADROES-DESENVOLVIMENTO.md**
**O que contém:** Regras e convenções de código
- Nomenclatura e organização
- Padrões de controllers/services
- Templates de código obrigatórios
- Práticas de segurança
- Convenções de UI/UX

**Quando ler:** Antes de escrever qualquer código novo

### ✅ **04-ESTADO-ATUAL.md**
**O que contém:** Status detalhado do que funciona
- Funcionalidades 100% implementadas
- Testes realizados e aprovados
- Métricas de qualidade
- Últimas ações realizadas
- Limitações conhecidas

**Quando ler:** Para entender exatamente o que já está pronto

### 🤖 **05-INSTRUCOES-IA.md** ⭐ **MAIS IMPORTANTE**
**O que contém:** Instruções específicas para agentes IA
- Diretrizes fundamentais
- Regras invioláveis
- Workflows para modificações
- Procedimentos de emergência
- Checklist de debugging

**Quando ler:** OBRIGATÓRIO antes de qualquer intervenção

### 📅 **06-HISTORICO-DESENVOLVIMENTO.md**
**O que contém:** Cronologia completa do projeto
- Fases de desenvolvimento
- Problemas enfrentados e soluções
- Decisões técnicas tomadas
- Lições aprendidas
- Próximos marcos planejados

**Quando ler:** Para entender o contexto histórico e decisões passadas

## 🚨 **PROTOCOLO OBRIGATÓRIO PARA IA**

### 📖 **SEQUÊNCIA DE LEITURA:**
1. **05-INSTRUCOES-IA.md** (PRIMEIRO E MAIS IMPORTANTE)
2. **01-PROJETO-OVERVIEW.md** (Contexto geral)  
3. **04-ESTADO-ATUAL.md** (O que funciona agora)
4. **02-ARQUITETURA-SISTEMA.md** (Detalhes técnicos)
5. **03-PADROES-DESENVOLVIMENTO.md** (Como codificar)
6. **06-HISTORICO-DESENVOLVIMENTO.md** (Contexto histórico)

### ⚡ **ANTES DE QUALQUER ALTERAÇÃO:**
```bash
# 1. Verificar status dos containers
docker compose ps

# 2. Testar health do sistema
curl -I http://localhost:3001/api/v1/health

# 3. Confirmar usuário teste ainda existe
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "teste123"}'
```

### 🛡️ **REGRAS DE OURO:**
- **NUNCA** altere sem ler a documentação IA primeiro
- **SEMPRE** teste após cada modificação
- **JAMAIS** remova validações de segurança existentes
- **SEMPRE** mantenha isolamento por usuário
- **NUNCA** modifique dados do usuário teste

## 🔄 **ATUALIZAÇÕES DA DOCUMENTAÇÃO**

### 📝 **Quando Atualizar:**
- Após adicionar nova funcionalidade
- Quando resolver bugs importantes
- Ao modificar arquitetura
- Depois de mudanças de segurança

### 📋 **O que Atualizar:**
- **04-ESTADO-ATUAL.md:** Sempre após implementações
- **06-HISTORICO-DESENVOLVIMENTO.md:** Para registrar marcos
- **02-ARQUITETURA-SISTEMA.md:** Se mudar estrutura
- **03-PADROES-DESENVOLVIMENTO.md:** Se criar novos padrões
- **05-INSTRUCOES-IA.md:** Se descobrir novos procedimentos

## 🎯 **OBJETIVOS DESTA DOCUMENTAÇÃO**

### 🤖 **Para Agentes IA:**
- Entender completamente o projeto antes de atuar
- Manter consistência entre diferentes sessões
- Evitar retrabalho e regressões
- Seguir padrões estabelecidos
- Preservar funcionalidades existentes

### 👨‍💻 **Para Desenvolvedores:**
- Onboarding rápido de novos membros da equipe
- Referência técnica centralizada  
- Histórico de decisões arquiteturais
- Procedimentos de troubleshooting
- Visão completa do sistema

### 📊 **Para o Projeto:**
- Manter qualidade e consistência
- Facilitar manutenção futura
- Reduzir bugs e regressões
- Acelerar desenvolvimento
- Preservar conhecimento institucional

## 🔍 **COMO ENCONTRAR INFORMAÇÃO ESPECÍFICA**

### 🔧 **Preciso modificar código?**
→ **03-PADROES-DESENVOLVIMENTO.md** + **05-INSTRUCOES-IA.md**

### 🐛 **Sistema não está funcionando?**
→ **05-INSTRUCOES-IA.md** (seção "Situações de Emergência")

### 📊 **O que já foi implementado?**
→ **04-ESTADO-ATUAL.md**

### 🏗️ **Como funciona a arquitetura?**  
→ **02-ARQUITETURA-SISTEMA.md**

### 📅 **Por que foram tomadas certas decisões?**
→ **06-HISTORICO-DESENVOLVIMENTO.md**

### 🎯 **Qual o propósito geral do projeto?**
→ **01-PROJETO-OVERVIEW.md**

---

**📅 Criado:** 6 de abril de 2026  
**🤖 LEMBRE-SE:** Esta documentação é seu guia principal. Consulte sempre que tiver dúvidas!**  
**⚡ DICA:** Mantenha uma aba aberta com **05-INSTRUCOES-IA.md** durante todo o trabalho.**