# 📝 PADRÕES DE DESENVOLVIMENTO - EMOTIONAL APP

## 🎯 CONVENÇÕES GERAIS
- **Linguagem:** TypeScript em todo o projeto
- **Nomenclatura:** camelCase para variáveis, PascalCase para classes/components
- **Idioma:** Português para UX, inglês para código
- **Commits:** Mensagens descritivas em português

## 🗂️ ORGANIZAÇÃO DE ARQUIVOS

### Backend (NestJS)
```
src/
├── modules/              # Módulos funcionais
│   ├── auth/            # Autenticação
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── social-auth.service.ts
│   │   ├── guards/      # Guards de proteção
│   │   ├── strategies/  # Passport strategies
│   │   └── auth.module.ts
│   ├── users/           # Gestão de usuários
│   ├── emotional-checkins/  # CRUD emoções
│   └── journal-entries/     # CRUD diário
├── prisma/              # Configuração Prisma
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── main.ts              # Bootstrap da aplicação
```

### Frontend (Next.js)
```
app/                     # App Router Next.js 14
├── (auth)/              # Grupo de rotas de autenticação
│   ├── login/
│   └── register/
├── dashboard/           # Dashboard protegida
├── globals.css
└── layout.tsx

components/              # Componentes reutilizáveis
lib/                     # Utilitários
├── api.ts               # Cliente HTTP com Axios
└── auth.ts              # Utilitários de autenticação

providers/               # Context Providers
└── auth-provider.tsx    # Context de autenticação global
```

## 🔧 PADRÕES DE CÓDIGO

### Controllers (NestJS)
```typescript
@Controller('api-path')
@UseGuards(JwtAuthGuard)  // Sempre proteger com JWT
export class ExampleController {
  @Post()
  create(
    @Request() req,           // Usuário logado
    @Body(ValidationPipe) dto // Validação automática
  ) {
    return this.service.create(req.user.id, dto);
  }
}
```

### Services (NestJS)
```typescript
@Injectable()
export class ExampleService {
  constructor(private readonly prisma: PrismaService) {}
  
  async create(userId: string, dto: CreateDto) {
    return this.prisma.model.create({
      data: { userId, ...dto },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
  }
}
```

### DTOs (Validação)
```typescript
export class CreateExampleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  rating: number;
}
```

### Frontend Components
```typescript
interface ComponentProps {
  // Props sempre tipadas
}

export default function Component({ prop }: ComponentProps) {
  // Hooks no topo
  const { user, login } = useAuth();
  
  // Handlers
  const handleSubmit = async (data: FormData) => {
    // Implementação
  };

  return (
    // JSX limpo e semântico
  );
}
```

## 🔐 SEGURANÇA - PADRÕES OBRIGATÓRIOS

### Backend
1. **Sempre usar Guards:** `@UseGuards(JwtAuthGuard)`
2. **Validação em todos os endpoints:** `@Body(ValidationPipe)`
3. **Isolamento por usuário:** Sempre usar `req.user.id`
4. **DTOs para validação:** Nunca aceitar dados sem validar
5. **UUIDs em Parse:** `@Param('id', ParseUUIDPipe)`

### Frontend
1. **Verificação de auth:** Sempre usar `useAuth()`
2. **Interceptors HTTP:** Tokens automáticos via Axios
3. **Redirect de login:** Middleware para rotas protegidas
4. **Estados de loading:** Sempre mostrar feedback

## 📊 PADRÕES DE DADOS

### Responses da API
```typescript
// Sucesso - sempre incluir user relacionado
{
  "id": "uuid",
  "userId": "uuid", 
  "data": {...},
  "createdAt": "ISO date",
  "user": {
    "id": "uuid",
    "name": "string", 
    "email": "string"
  }
}

// Listas - sempre ordenar por data (desc)
[
  { /* item mais recente */ },
  { /* item anterior */ }
]
```

### Naming no Banco
- **Tabelas:** snake_case (users, emotional_checkins, journal_entries)
- **Colunas:** snake_case com @map no Prisma
- **IDs:** sempre UUID
- **Timestamps:** created_at, updated_at

## 🎨 UI/UX PATTERNS

### Estilo
- **Framework:** TailwindCSS
- **Cores:** Sistema consistente (primary, secondary, etc.)
- **Responsividade:** Mobile-first
- **Acessibilidade:** Labels, ARIA, contraste

### Estados da Interface
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Sempre mostrar:
if (loading) return <div>Carregando...</div>;
if (error) return <div className="error">{error}</div>;
```

## 📝 DOCUMENTAÇÃO OBRIGATÓRIA

### Comentários no Código
```typescript
// 🔐 Middleware de autenticação
export class JwtAuthGuard {}

// 📊 Calcula estatísticas dos últimos 30 registros
async getStats(userId: string) {}
```

### README em cada módulo
- Propósito do módulo
- Endpoints disponíveis
- DTOs aceitos
- Exemplos de uso

## 🧪 TESTES
1. **Unit Tests:** Jest para services (backend) e componentes (frontend, via React Testing Library)
2. **Integration/E2E Tests:** Endpoints da API via supertest; migrations via PostgreSQL descartável
3. **E2E Tests:** Fluxos completos no frontend

### 📊 Meta de cobertura: 90% no código novo/alterado (não no projeto inteiro)

O projeto **não** exige 90% de cobertura em todo o código já existente de uma vez —
hoje isso quebraria tudo sem dar tempo de evoluir gradualmente. A meta vale sobre o
**diff**: toda linha cobrível que um PR adiciona ou altera precisa estar coberta por
teste em pelo menos 90% dos casos.

Antes de abrir um PR, rode dentro do app alterado:

```bash
npm run test:diff-cov
```

Isso roda a suíte com cobertura e compara com `origin/main` via
`scripts/check-diff-coverage.js`, reportando exatamente quais linhas alteradas
ficaram sem teste. Falha (exit 1) se o percentual do diff ficar abaixo de 90%.
Um PR que não toca nenhuma linha cobrível (só docs, config, migrations etc.)
passa trivialmente.

Ainda não está plugado em CI — é responsabilidade de `CR-06.4` em
`IA/BACKLOG_CODE_REVIEW.md`. Até lá, é um passo manual antes de cada PR.

## 🔎 CODE REVIEW E RESOLUÇÃO DE DIVERGÊNCIAS

O PR e o respectivo card são a fonte de verdade da conversa técnica. O responsável
pelo produto **não deve atuar como mensageiro** entre o agente que implementa e o
agente que revisa.

### Fluxo obrigatório

1. Todo finding deve ser publicado no PR correspondente e conter prioridade,
   localização, comportamento esperado, cenário reproduzível, impacto e direção
   da correção.
2. O implementador deve responder no próprio PR com a correção ou com uma
   contestação técnica acompanhada de evidência verificável.
3. Divergências não são decididas por opinião, autoridade ou afirmação de que
   “foi corrigido”. A decisão deve se apoiar, nesta ordem, em:
   - teste de regressão reproduzível;
   - contrato ou critério de aceite da história;
   - documentação oficial da tecnologia ou integração;
   - comportamento observado em ambiente controlado.
4. Toda correção de finding P0, P1 ou P2 deve incluir teste de regressão no nível
   adequado. Concorrência, transações, migrations, integrações externas e
   topologia de rede devem usar teste de integração ou infraestrutura real quando
   mocks não conseguirem provar a invariável.
5. CI verde é necessário, mas não substitui os critérios de aceite do review.
   Um teste que apenas confirma o comportamento defeituoso não encerra o finding.
6. O card permanece em **Correções de review** enquanto existir finding P0, P1 ou
   P2 aberto. Ele só avança depois de novo review confirmar a correção e seus
   testes.
7. Aprovação, merge e conclusão no Jira são etapas separadas. Nenhuma delas deve
   ser inferida somente porque houve commit de correção ou CI verde.

### Contrato mínimo do teste de aceite

O teste deve demonstrar primeiro o cenário que falhava, executar a ação pela
interface pública mais próxima do uso real e comprovar o resultado esperado e os
efeitos persistidos. Quando o risco envolver concorrência, o teste deve disparar
operações realmente simultâneas contra o banco ou serviço utilizado em produção.

## 🚀 DEPLOYMENT PATTERNS
1. **Environment Variables:** Sempre usar .env
2. **Build Process:** Docker multi-stage
3. **Health Checks:** Endpoint /health
4. **Migrations:** Sempre via Prisma
5. **Logs:** Estruturados e informativos

---
**📅 Última atualização:** 28 de setembro de 2026
**🤖 Para agentes IA:** SEMPRE seguir estes padrões ao modificar código
