# Backlog de Remediação do Code Review

## Objetivo

Este backlog contém somente o trabalho necessário para resolver os achados, observações de segurança e lacunas de validação registrados no code review de 22/09/2026.

Relatório de origem: `.codex/quality/code-review/reports/2026-09-22T163222Z-full-system.md`

O backlog foi escrito para execução por um agente de código, especialmente Claude. Cada história deve resultar em código funcional, testes automatizados e evidência de validação. Não adicionar funcionalidades de produto que não sejam necessárias para encerrar um item do review.

## Resultado esperado

Ao concluir todos os épicos:

- nenhum endpoint social emitirá JWT a partir de identidade não verificada;
- o cadastro público não poderá conceder roles privilegiadas;
- somente administradores poderão verificar psicólogos;
- desativação e mudança de role terão efeito imediato no backend;
- migrations preservarão check-ins existentes e funcionarão com banco populado;
- frontend e backend compilarão, o lint passará e a sessão será restaurada corretamente;
- dependências de produção não terão vulnerabilidades críticas ou altas sem mitigação documentada;
- autenticação, RBAC, isolamento de dados, vínculos e migrations possuirão cobertura automatizada;
- configuração de token e CORS estará adequada para dados sensíveis.

## Regras de execução para o Claude

1. Ler antes de implementar:
   - `IA/00-SEGURANCA.md`
   - `IA/02-ARQUITETURA-SISTEMA.md`
   - `IA/03-PADROES-DESENVOLVIMENTO.md`
   - este backlog;
   - o relatório de code review referenciado acima, se disponível.
2. Executar os épicos na ordem indicada na seção “Ordem recomendada”.
3. Trabalhar em uma história por vez e manter o escopo da história.
4. Antes de alterar uma migration já existente, verificar se ela foi aplicada em algum ambiente compartilhado. Nunca reescrever silenciosamente uma migration aplicada.
5. Não usar mocks de identidade em endpoints públicos.
6. Não confiar em role, status ou identidade vindos do frontend.
7. Não considerar middleware do Next.js como fronteira de autorização da API.
8. Adicionar testes negativos para toda correção de segurança.
9. Rodar os comandos de validação da história e registrar resultados no PR/commit.
10. Atualizar o status da história neste arquivo apenas depois que todos os critérios de aceite passarem.
11. Não commitar credenciais, tokens, payloads reais ou dados pessoais.
12. Não executar `npm audit fix --force` nem upgrades major automáticos sem avaliar compatibilidade.

## Convenção de status

- `TODO`: não iniciado.
- `DOING`: em execução.
- `BLOCKED`: depende de decisão, credencial ou ambiente externo.
- `DONE`: implementação, testes e validações concluídos.

## Ordem recomendada

1. CR-EPIC-01 — Conter falhas críticas de identidade e privilégio.
2. CR-EPIC-02 — Tornar autorização e revogação efetivas.
3. CR-EPIC-03 — Proteger dados e migrations.
4. CR-EPIC-04 — Recuperar a integridade do frontend.
5. CR-EPIC-05 — Atualizar dependências e configuração de segurança.
6. CR-EPIC-06 — Consolidar testes e gates de qualidade.

As histórias `CR-01.1`, `CR-01.2`, `CR-01.3`, `CR-02.1`, `CR-02.2`, `CR-03.1`, `CR-04.1` e `CR-04.2` são bloqueadoras de release.

---

## CR-EPIC-01 — Identidade e privilégios confiáveis

### Objetivo do épico

Eliminar emissão de tokens para identidades não verificadas e impedir que usuários públicos concedam privilégios ou selos de confiança a si mesmos.

### CR-01.1 — Desabilitar autenticação social simulada

- **Status:** DONE
- **Evidência:** `SocialAuthService` removido (consumia claims fabricadas pelo controller); `POST /auth/google` e `POST /auth/apple` agora respondem `503 Service Unavailable` com mensagem genérica, sem ler o corpo da requisição nem tocar em `AuthService`/banco. `createSocialUser`/`CreateSocialUserDto` removidos de `users.service.ts` (ficaram órfãos). Teste E2E de controller em `apps/backend/src/modules/auth/auth.controller.spec.ts` (4 casos, todos verdes) prova que nenhum dos dois endpoints emite `access_token` mesmo com corpo malicioso/vazio. `rg -n "mockGoogleUser|mockAppleUser|user@gmail\.com|user@icloud\.com" apps` sem resultados de implementação. `npx tsc --noEmit` e `npm run build` limpos no backend. Frontend não alterado: os botões de login social já eram inertes (mostravam apenas um alerta, sem chamar a API).
- **Prioridade:** P1 — bloqueador de release
- **Origem:** social login gera JWT sem validar o token Google/Apple.
- **User story:** Como responsável pela segurança, quero que endpoints sociais incompletos não emitam tokens, para que ninguém assuma uma identidade simulada ou compartilhada.
- **Escopo:**
  - remover ou bloquear `POST /api/v1/auth/google` e `POST /api/v1/auth/apple` enquanto não houver validação real;
  - remover os objetos hard-coded de usuário Google/Apple;
  - impedir que `SocialAuthService` receba claims fabricadas pelo controller;
  - ajustar frontend para não oferecer ações sociais indisponíveis, se atualmente visíveis.
- **Critérios de aceite:**
  - uma requisição anônima com qualquer `token` não retorna `access_token`;
  - os emails fixos `user@gmail.com` e `user@icloud.com` não aparecem no fluxo de autenticação;
  - nenhum usuário é criado ou reutilizado por esses endpoints;
  - a resposta de indisponibilidade não expõe detalhes internos;
  - testes E2E provam que ambos os endpoints não emitem JWT.
- **Validação mínima:**
  - `npm test -- --runInBand` no backend;
  - teste E2E dos dois endpoints;
  - `rg -n "mockGoogleUser|mockAppleUser|user@gmail.com|user@icloud.com" apps` sem resultados de implementação.
- **Dependências:** nenhuma.
- **Fora de escopo:** implementar OAuth completo sem credenciais e requisitos aprovados.

### CR-01.2 — Restringir cadastro público à role PATIENT

- **Status:** DONE
- **Evidência:** `role` removido de `RegisterDto` e de `CreateUserDto` (usado só pelo cadastro público); `UsersService.create` agora grava `role: Role.PATIENT` hard-coded, sem ler nada do payload. O `ValidationPipe` global (`forbidNonWhitelisted: true`) já configurado em `main.ts` rejeita com 400 qualquer propriedade extra (`role`, `isActive`, `verified`, `id`, ...) antes mesmo de chegar no service. Endpoint administrativo (`AdminUsersService.createUser`) usa Prisma diretamente, caminho separado, não afetado. Testes novos: `register.controller.spec.ts` (7 casos: payload válido sem role, `role: ADMIN/PSYCHOLOGIST/GUARDIAN` → 400 e `UsersService.create` nunca chamado, mass-assignment de `isActive/verified/id` → 400) e `users.service.spec.ts` (2 casos: `role` sempre persistido como `PATIENT`, inclusive se algo tentar contrabandear `role: ADMIN` no objeto). 13/13 testes verdes na suíte completa. Frontend não precisou de alteração: nunca enviava `role` no cadastro.
- **Prioridade:** P1 — bloqueador de release
- **Origem:** registro público aceita `PSYCHOLOGIST` e `GUARDIAN`.
- **User story:** Como administrador, quero que todo cadastro público nasça como paciente, para que roles privilegiadas sejam concedidas somente por fluxo administrativo.
- **Escopo:**
  - remover `role` do `RegisterDto` público;
  - definir `Role.PATIENT` no backend, sem depender do payload;
  - manter criação de outras roles exclusivamente nos endpoints administrativos protegidos;
  - rejeitar propriedades extras por meio do `ValidationPipe` global já configurado.
- **Critérios de aceite:**
  - cadastro válido sem role cria usuário `PATIENT`;
  - payload com `role: "ADMIN"`, `"PSYCHOLOGIST"` ou `"GUARDIAN"` recebe 400;
  - não existe mass assignment de `role`, `isActive`, `verified` ou campos administrativos;
  - endpoint administrativo continua criando roles permitidas apenas para ADMIN;
  - testes cobrem todos os valores privilegiados e o caminho feliz.
- **Validação mínima:** build e testes do backend.
- **Dependências:** nenhuma.

### CR-01.3 — Separar perfil profissional de verificação administrativa

- **Status:** DONE
- **Evidência:** `verified` removido de `UpdatePsychologistProfileDto`; `PsychologistService.updateProfile` não escreve mais `verified` no `data` do Prisma (removido da chamada, não só do valor). `ValidationPipe` global rejeita com 400 qualquer `verified` enviado no PATCH de perfil. Endpoint `PATCH /psychologist/verify/:id` (admin-only, `@Roles(Role.ADMIN)`) não foi alterado. Novo `psychologist.controller.spec.ts` (5 casos): PATCH de perfil com `verified` → 400 e service nunca chamado; PATCH de perfil sem `verified` → 200 e service chamado sem o campo; ADMIN verifica perfil com sucesso; PSYCHOLOGIST e PATIENT recebem 403 no endpoint de verificação. 18/18 testes verdes na suíte completa. Frontend não precisou de alteração: o formulário de perfil já não enviava `verified` no payload.
- **Prioridade:** P1 — bloqueador de release
- **Origem:** psicólogo pode enviar `verified` no próprio PATCH.
- **User story:** Como paciente, quero confiar que o selo de psicólogo verificado só pode ser concedido por um administrador.
- **Escopo:**
  - remover `verified` do DTO de atualização do próprio psicólogo;
  - impedir atualização de `verified` no método self-service, mesmo se o campo escapar da validação;
  - manter verificação apenas no endpoint administrativo;
  - registrar claramente a separação entre dados editáveis pelo profissional e dados controlados pela plataforma.
- **Critérios de aceite:**
  - psicólogo não consegue alterar `verified` por nenhum endpoint self-service;
  - envio de `verified` no PATCH do perfil recebe 400;
  - administrador autenticado ainda consegue verificar um perfil;
  - usuário não administrador recebe 403 no endpoint de verificação;
  - testes unitários e E2E cobrem todos os casos.
- **Validação mínima:** build e testes do backend.
- **Dependências:** CR-01.2.

### CR-01.4 — Restringir descoberta e convites a psicólogos verificados

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** qualquer conta com role `PSYCHOLOGIST` pode enumerar pacientes por email e enviar convites.
- **User story:** Como paciente, quero ser encontrado e convidado somente por profissionais verificados, reduzindo exposição de dados pessoais e abuso.
- **Escopo:**
  - exigir perfil profissional existente, ativo e verificado para busca e criação de vínculo;
  - aplicar a regra no backend, não apenas na interface;
  - retornar erro uniforme que não revele estado interno do profissional;
  - manter limite de resultados e validação mínima da busca.
- **Critérios de aceite:**
  - psicólogo sem perfil ou não verificado recebe 403 na busca e no convite;
  - psicólogo verificado executa os fluxos normalmente;
  - paciente inativo não aparece e não pode receber novo convite;
  - testes negativos provam que não há enumeração por conta não verificada.
- **Validação mínima:** build e testes do backend.
- **Dependências:** CR-01.3.

---

## CR-EPIC-02 — Autorização atual e revogação efetiva

### Objetivo do épico

Garantir que role e status atuais do banco sejam usados pelo backend e que desativação ou rebaixamento tenham efeito imediato.

### CR-02.1 — Bloquear login de usuário inativo

- **Status:** DONE
- **Evidência:** `AuthService.validateUser` agora retorna `null` (→ 401 genérico via `LocalStrategy`) tanto para senha errada/conta inexistente quanto para conta com `isActive: false`, mesmo com senha correta — as três respostas externas são indistinguíveis, sem mensagem diferenciada. Testes novos: `auth.service.spec.ts` (4 casos unitários: ativo+senha certa retorna usuário sem `passwordHash`, inativo+senha certa retorna `null`, senha errada retorna `null`, conta inexistente retorna `null`) e `login.controller.spec.ts` (4 casos E2E via `POST /auth/login` real com Passport/LocalStrategy: ativo loga e recebe token, inativo recebe 401 sem token, senha errada recebe 401 no mesmo formato, conta inexistente idem). 26/26 testes verdes na suíte completa.
- **Prioridade:** P1 — bloqueador de release
- **Origem:** `validateUser` verifica senha, mas não `isActive`.
- **User story:** Como administrador, quero que um usuário desativado não consiga criar uma nova sessão.
- **Escopo:**
  - rejeitar login local de usuário inativo;
  - aplicar a mesma regra a qualquer fluxo social futuro;
  - usar mensagem externa genérica para não facilitar enumeração de contas;
  - preservar diferença de diagnóstico apenas em logs seguros, se necessária.
- **Critérios de aceite:**
  - usuário ativo com senha correta autentica;
  - usuário inativo com senha correta recebe 401 e nenhum JWT;
  - senha incorreta e conta inexistente também recebem resposta externa equivalente;
  - testes unitários e E2E cobrem os casos.
- **Validação mínima:** build e testes do backend.
- **Dependências:** CR-01.1.

### CR-02.2 — Resolver role e status atuais em toda requisição autenticada

- **Status:** DONE
- **Evidência:** `JwtStrategy.validate` agora usa `payload.sub` só como identificador e busca o usuário atual via `UsersService.findById` a cada requisição autenticada; lança `UnauthorizedException` se o usuário não existir mais ou `isActive` for `false`. `req.user.role`/`ageGroup`/`email` passam a vir sempre do banco, nunca do payload do token. Testes novos: `jwt.strategy.spec.ts` (4 casos unitários: role do banco prevalece sobre claim `ADMIN` obsoleta do token, 401 para usuário desativado, 401 para usuário removido, nenhum campo do payload vaza pro resultado) e `session-freshness.e2e.spec.ts` (4 casos E2E cruciais: **o mesmo token JWT**, assinado uma única vez como ADMIN ativo, primeiro acessa uma rota admin-only com sucesso; depois que o banco marca o usuário como PATIENT, o mesmo token recebe 403 na rota admin-only; depois que o banco desativa o usuário, o mesmo token recebe 401; depois que o usuário é removido do banco, o mesmo token recebe 401 — tudo sem gerar um token novo, provando revogação imediata). 34/34 testes verdes na suíte completa.
- **Prioridade:** P1 — bloqueador de release
- **Origem:** `JwtStrategy` confia por sete dias em role e status presentes no token.
- **User story:** Como administrador, quero que uma desativação ou mudança de role tenha efeito na próxima chamada à API.
- **Escopo:**
  - consultar o usuário atual durante a validação JWT;
  - rejeitar usuário inexistente ou inativo;
  - preencher `req.user.role` e demais atributos autorizativos com dados atuais do banco;
  - não confiar na role do token para decisões de autorização;
  - manter `sub` como identificador e validar que o usuário existe.
- **Critérios de aceite:**
  - token emitido quando o usuário era ADMIN perde acesso administrativo logo após rebaixamento;
  - token de usuário recém-desativado recebe 401 na chamada seguinte;
  - token de usuário removido recebe 401;
  - usuário ativo mantém acesso compatível com sua role atual;
  - testes E2E demonstram mudança de role e desativação usando o mesmo token antigo.
- **Validação mínima:** build, testes unitários e E2E do backend.
- **Dependências:** CR-02.1.

---

## CR-EPIC-03 — Integridade de dados e migrations

### Objetivo do épico

Garantir evolução segura do schema sem perda do histórico emocional.

### CR-03.1 — Corrigir a migration dos campos de check-in com backfill

- **Status:** TODO
- **Prioridade:** P1 — bloqueador de release
- **Origem:** migration remove três colunas e adiciona três campos obrigatórios sem backfill.
- **User story:** Como usuário, quero que meus check-ins existentes sejam preservados durante uma atualização do banco.
- **Pré-condição obrigatória:** descobrir e documentar se `20260407142459_update_emotional_checkin_fields` já foi aplicada em ambientes compartilhados.
- **Estratégia de execução:**
  - se nunca foi aplicada fora de bancos descartáveis, substituir o SQL por uma migração segura e recriar somente ambientes descartáveis;
  - se já foi aplicada, não alterar checksum silenciosamente: preparar plano compatível de roll-forward/baseline e documentar limitações de recuperação;
  - validar explicitamente a regra de negócio para mapear `stress` em `anxietyLevel`.
- **Escopo técnico esperado:**
  - adicionar novos campos como nullable ou usar renomeação segura;
  - copiar `mood` para `moodScore` e `energy` para `energyLevel`;
  - copiar `stress` para `anxietyLevel` somente após confirmar equivalência semântica;
  - validar ausência de nulos;
  - aplicar `NOT NULL`;
  - remover colunas antigas somente depois da validação.
- **Critérios de aceite:**
  - migration executa do zero em banco vazio;
  - migration executa sobre a migration anterior com registros existentes;
  - quantidade de registros antes e depois é idêntica;
  - valores dos três scores são preservados conforme mapeamento aprovado;
  - rollback ou procedimento de recuperação está documentado;
  - nenhuma migration aplicada é reescrita sem plano explícito.
- **Validação mínima:** teste automatizado com PostgreSQL 16 e fixture populada.
- **Dependências:** decisão sobre histórico de aplicação e equivalência `stress`/`anxietyLevel`.

### CR-03.2 — Criar teste permanente de migrations com banco populado

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** não existe rehearsal automatizado de schema evolution.
- **User story:** Como equipe, quero validar migrations contra dados representativos para impedir regressões destrutivas.
- **Escopo:**
  - subir PostgreSQL descartável;
  - aplicar migrations até a versão imediatamente anterior;
  - inserir fixture de usuário, check-in, diário, vínculos e consentimentos;
  - aplicar todas as migrations restantes;
  - verificar integridade, relacionamentos e contagem.
- **Critérios de aceite:**
  - teste falha em perda de linha, campo obrigatório nulo ou relacionamento quebrado;
  - teste roda de forma repetível localmente e no CI;
  - dados da fixture são sintéticos e não sensíveis.
- **Validação mínima:** comando documentado no README/CI.
- **Dependências:** CR-03.1.

---

## CR-EPIC-04 — Frontend compilável e sessão estável

### Objetivo do épico

Restaurar build, type-check, lint e comportamento correto da autenticação no navegador.

### CR-04.1 — Corrigir todos os erros atuais de TypeScript e build

- **Status:** TODO
- **Prioridade:** P1 — bloqueador de release
- **Origem:** imports inexistentes, tipo não exportado e callbacks incompatíveis na administração.
- **User story:** Como equipe de entrega, quero que o frontend compile para produção sem ignorar erros.
- **Escopo:**
  - substituir imports inexistentes de `RoleBadge` e `AgeGroupBadge` pelo módulo real ou criar exports coerentes;
  - substituir/definir `UserWithDetails` de acordo com a resposta real da API;
  - alinhar callbacks passados a `UsersTable` com as assinaturas declaradas;
  - eliminar `any` usado apenas para contornar contratos de role;
  - não habilitar `ignoreBuildErrors`.
- **Critérios de aceite:**
  - `npx tsc --noEmit` passa;
  - `npm run build` passa, descontando apenas indisponibilidade externa comprovada e tratada em CR-04.4;
  - telas de lista e detalhe de usuários mantêm ações funcionais;
  - nenhum import aponta para arquivo inexistente.
- **Validação mínima:** type-check, lint e build do frontend.
- **Dependências:** nenhuma.

### CR-04.2 — Corrigir restauração e atualização da sessão

- **Status:** TODO
- **Prioridade:** P1 — bloqueador de release
- **Origem:** `AuthProvider` acessa `authHelpers.tokenStorage`, propriedade inexistente.
- **User story:** Como usuário autenticado, quero recarregar a página sem ser desconectado por erro interno.
- **Escopo:**
  - usar uma API única e tipada para ler o token;
  - remover referências à propriedade inexistente;
  - garantir que `refreshUser` atualize o usuário sem regravar token de modo inseguro ou desnecessário;
  - limpar a sessão somente em falha autenticativa real.
- **Critérios de aceite:**
  - login seguido de reload preserva a sessão válida;
  - `refreshUser` funciona com token válido;
  - 401 limpa a sessão e redireciona uma única vez;
  - falha de rede temporária não é tratada automaticamente como credencial inválida, salvo decisão documentada;
  - testes de componente cobrem inicialização, sucesso, 401 e falha de rede.
- **Validação mínima:** testes frontend, type-check, lint e build.
- **Dependências:** CR-04.1 e contrato de CR-02.2.

### CR-04.3 — Corrigir ordem dos hooks no histórico de check-ins

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** retorno condicional ocorre antes de `useEffect`.
- **User story:** Como usuário não autenticado, quero ser redirecionado sem erro de renderização do React.
- **Escopo:**
  - declarar hooks incondicionalmente no topo;
  - executar redirect dentro de efeito ou fluxo compatível com App Router;
  - impedir chamadas de dados antes da autenticação confirmada.
- **Critérios de aceite:**
  - regra `react-hooks/rules-of-hooks` passa;
  - transições loading → autenticado e loading → anônimo não lançam erro;
  - chamadas de check-ins não ocorrem para usuário anônimo;
  - teste de componente cobre as duas transições.
- **Validação mínima:** testes frontend e `npm run lint`.
- **Dependências:** CR-04.2.

### CR-04.4 — Tornar o build independente do download de fonte

- **Status:** TODO
- **Prioridade:** P3
- **Origem:** `next/font` tenta baixar Inter durante o build e falha em ambiente offline.
- **User story:** Como responsável pelo build, quero gerar o frontend de forma determinística sem depender do Google Fonts.
- **Escopo:** usar fonte local versionada ou stack de fontes do sistema, preservando layout e licença.
- **Critérios de aceite:**
  - build passa sem acesso a `fonts.googleapis.com`;
  - não há regressão visual material;
  - licença da fonte local, se usada, está preservada.
- **Validação mínima:** build frontend com rede indisponível.
- **Dependências:** CR-04.1.

---

## CR-EPIC-05 — Dependências e configuração defensiva

### Objetivo do épico

Reduzir exposição conhecida da cadeia de dependências e endurecer as fronteiras web identificadas no review.

### CR-05.1 — Atualizar dependências vulneráveis do frontend

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** audit encontrou vulnerabilidades críticas/altas em Next.js, Axios e cadeia PostCSS.
- **User story:** Como operador, quero executar o frontend em versões corrigidas e suportadas.
- **Escopo:**
  - executar audit atualizado;
  - atualizar Next.js para uma versão corrigida e compatível, no mínimo dentro da linha suportada escolhida;
  - atualizar Axios, PostCSS e transitivas corrigíveis;
  - regenerar lockfile de forma determinística;
  - adaptar código somente quando necessário para compatibilidade.
- **Critérios de aceite:**
  - zero vulnerabilidades críticas e altas de produção, ou exceção documentada com análise de alcance, mitigação, responsável e prazo;
  - type-check, lint, build e testes passam;
  - middleware, login, dashboard e rotas administrativas continuam funcionando;
  - `npm ci` reproduz a instalação.
- **Validação mínima:** `npm audit --omit=dev`, `npm ci`, type-check, lint, build e testes frontend.
- **Dependências:** CR-04.1 a CR-04.3.

### CR-05.2 — Atualizar dependências vulneráveis do backend

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** audit encontrou vulnerabilidades críticas/altas em dependências transitivas e no stack Nest/Express.
- **User story:** Como operador, quero executar a API em dependências corrigidas sem quebrar contratos.
- **Escopo:**
  - executar audit atualizado;
  - atualizar pacotes NestJS relacionados em conjunto;
  - atualizar dependências transitivas por upgrades suportados, sem overrides cegos;
  - revisar impactos em validação, Express, upload e Prisma;
  - regenerar lockfile.
- **Critérios de aceite:**
  - zero vulnerabilidades críticas e altas de produção, ou exceção formal equivalente à CR-05.1;
  - build e todos os testes passam;
  - endpoints de autenticação e CRUD mantêm contratos esperados;
  - `npm ci` reproduz a instalação.
- **Validação mínima:** `npm audit --omit=dev`, `npm ci`, build e testes backend.
- **Dependências:** CR-01, CR-02 e CR-03 concluídos para oferecer regressão adequada.

### CR-05.3 — Restringir CORS por ambiente

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** backend usa `app.enableCors()` sem allowlist.
- **User story:** Como responsável pela segurança, quero aceitar origens web explicitamente autorizadas.
- **Escopo:**
  - configurar allowlist via variável de ambiente validada;
  - permitir localhost apenas no ambiente de desenvolvimento;
  - definir métodos e headers necessários;
  - falhar de forma segura quando configuração de produção estiver ausente.
- **Critérios de aceite:**
  - origem autorizada recebe headers CORS esperados;
  - origem não autorizada não recebe permissão;
  - produção não usa wildcard;
  - preflight é testado.
- **Validação mínima:** testes E2E de CORS e build backend.
- **Dependências:** nenhuma.

### CR-05.4 — Migrar token para cookie seguro controlado pelo servidor

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** JWT é duplicado em localStorage e cookie legível por JavaScript; middleware apenas decodifica assinatura.
- **User story:** Como usuário, quero que minha sessão seja menos exposta a roubo por scripts no navegador.
- **Escopo:**
  - definir contrato de sessão baseado em cookie `HttpOnly`, `Secure` em produção e `SameSite` apropriado;
  - remover token de localStorage e escrita de cookie via JavaScript;
  - adicionar proteção CSRF compatível com o modelo escolhido;
  - garantir que autorização continue exclusivamente no backend;
  - alterar middleware para validar sessão por mecanismo confiável ou tratá-lo explicitamente apenas como UX.
- **Critérios de aceite:**
  - JavaScript do navegador não consegue ler o token;
  - login, reload, logout e expiração funcionam;
  - logout invalida/remove o cookie;
  - requisições mutáveis possuem proteção CSRF adequada;
  - token forjado não libera páginas restritas nem APIs;
  - testes E2E cobrem os fluxos.
- **Validação mínima:** testes backend/frontend e inspeção dos atributos do cookie.
- **Dependências:** CR-02.2, CR-04.2 e CR-05.3.

---

## CR-EPIC-06 — Testes e gates de qualidade

### Objetivo do épico

Transformar os invariantes do review em proteção contínua contra regressões.

### CR-06.1 — Criar suíte backend de autenticação e RBAC

- **Status:** TODO
- **Prioridade:** P1
- **Origem:** não existem testes automatizados no backend.
- **User story:** Como equipe, quero detectar regressões de autenticação e autorização antes do merge.
- **Cenários obrigatórios:**
  - cadastro público sempre PATIENT;
  - login ativo/inativo;
  - token expirado, usuário removido e token inválido;
  - role alterada usando token antigo;
  - ADMIN, PSYCHOLOGIST, PATIENT e GUARDIAN em rotas permitidas e proibidas;
  - psicólogo não pode verificar a si próprio;
  - endpoints sociais desabilitados não emitem JWT;
  - isolamento de journal e check-ins entre dois usuários.
- **Critérios de aceite:**
  - testes exercitam guards, controllers e banco de teste;
  - há casos positivos e negativos;
  - `npm test -- --runInBand` termina com sucesso e ao menos um teste executado;
  - testes não dependem de dados pessoais ou serviços externos.
- **Dependências:** CR-01 e CR-02.

### CR-06.2 — Criar suíte de vínculos e consentimentos

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** fluxos sensíveis de psicólogo, responsável e consentimento não têm regressão automatizada.
- **User story:** Como paciente, quero que somente participantes autorizados alterem meus vínculos e consentimentos.
- **Cenários obrigatórios:**
  - busca/convite apenas por psicólogo verificado;
  - somente paciente alvo ou admin aprova/rejeita vínculo;
  - transições válidas e repetidas de status;
  - usuário alheio não lê nem altera vínculo;
  - responsável só opera vínculo/consentimento compatível;
  - consentimento revogado deixa de ser considerado ativo.
- **Critérios de aceite:**
  - todos os cenários possuem testes negativos de autorização;
  - IDs de outros usuários não permitem IDOR;
  - suíte passa em PostgreSQL descartável.
- **Dependências:** CR-01.4 e CR-02.2.

### CR-06.3 — Criar suíte frontend para autenticação e rotas críticas

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** frontend não possui testes e já apresenta regressões de sessão/hooks.
- **User story:** Como equipe, quero validar login, restauração da sessão e autorização visual antes da entrega.
- **Cenários obrigatórios:**
  - login e logout;
  - reload com sessão válida;
  - expiração/401;
  - usuário anônimo em rota protegida;
  - cada role nas páginas permitidas/proibidas;
  - histórico de check-ins sem violação de hooks;
  - lista e detalhe administrativo;
  - fluxo de convite e resposta psicólogo-paciente.
- **Critérios de aceite:**
  - testes de componente cobrem providers e estados assíncronos;
  - ao menos um fluxo E2E cobre autenticação até dashboard;
  - nenhum teste depende de conta real ou internet pública.
- **Dependências:** CR-04 e CR-05.4.

### CR-06.4 — Implantar gate de CI para qualidade e segurança

- **Status:** TODO
- **Prioridade:** P2
- **Origem:** falhas de build, lint, testes ausentes e vulnerabilidades chegaram à branch revisada.
- **User story:** Como mantenedor, quero impedir merge de código que não compile ou viole os invariantes críticos.
- **Escopo do pipeline:**
  - instalação por `npm ci` em cada app;
  - build backend;
  - testes backend;
  - type-check frontend;
  - lint frontend;
  - testes frontend;
  - build frontend sem dependência externa de fonte;
  - teste de migrations com PostgreSQL 16;
  - audit de produção com política para critical/high.
- **Critérios de aceite:**
  - pipeline roda em pull requests e branch principal;
  - qualquer comando obrigatório com falha bloqueia merge;
  - exceções de audit exigem registro com prazo e responsável;
  - cache não compromete reprodutibilidade;
  - README documenta como reproduzir localmente.
- **Dependências:** CR-03.2, CR-05.1, CR-05.2, CR-06.1, CR-06.2 e CR-06.3.

---

## Definition of Done global

Uma história só pode ser marcada `DONE` quando:

- todos os critérios de aceite estão atendidos;
- testes positivos e negativos relevantes foram adicionados;
- comandos de validação passaram sem flags para ignorar erros;
- nenhuma credencial ou dado real foi adicionado;
- documentação afetada foi atualizada;
- mudanças de API ou banco têm estratégia de compatibilidade/migration;
- logs e mensagens de erro não expõem tokens, senhas ou dados clínicos;
- o diff foi revisado para evitar alterações fora do escopo;
- o status e as evidências foram atualizados neste backlog ou no PR correspondente.

## Matriz de rastreabilidade

| Item do code review | Histórias responsáveis |
|---|---|
| Social login sem validação | CR-01.1, CR-06.1 |
| Cadastro com roles privilegiadas | CR-01.2, CR-06.1 |
| Psicólogo altera `verified` | CR-01.3, CR-06.1 |
| Busca/convite por profissional não verificado | CR-01.4, CR-06.2 |
| Login de usuário inativo | CR-02.1, CR-06.1 |
| JWT mantém role/status antigos | CR-02.2, CR-06.1 |
| Corrida do último administrador | CR-02.3, CR-06.1 |
| Migration destrutiva de check-ins | CR-03.1, CR-03.2 |
| Frontend não compila | CR-04.1 |
| Sessão quebra no reload | CR-04.2, CR-06.3 |
| Ordem condicional de hooks | CR-04.3, CR-06.3 |
| Build depende do Google Fonts | CR-04.4 |
| Dependências frontend vulneráveis | CR-05.1, CR-06.4 |
| Dependências backend vulneráveis | CR-05.2, CR-06.4 |
| CORS irrestrito | CR-05.3 |
| Token em localStorage/cookie JS | CR-05.4, CR-06.3 |
| Ausência de testes | CR-03.2, CR-06.1, CR-06.2, CR-06.3 |
| Ausência de gates de qualidade | CR-06.4 |

## Checklist de encerramento do backlog

- [ ] Todas as histórias P1 estão `DONE`.
- [ ] Backend build e testes passam.
- [ ] Frontend type-check, lint, testes e build passam.
- [ ] Migration foi testada com banco PostgreSQL populado.
- [ ] Nenhum login social simulado permanece público.
- [ ] Usuário inativo e role revogada perdem acesso imediatamente.
- [ ] Cadastro público não controla role.
- [ ] Psicólogo não controla `verified`.
- [ ] Audit não possui critical/high sem exceção formal.
- [ ] CORS está restrito em produção.
- [ ] Token não está disponível em localStorage ou cookie legível por JavaScript.
- [ ] CI bloqueia regressões.
- [ ] Novo code review confirma o encerramento dos achados.
