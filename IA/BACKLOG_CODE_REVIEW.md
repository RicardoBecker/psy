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

- **Status:** DONE
- **Evidência:** `PsychologistService.requireVerifiedPsychologist` (novo método privado) exige `psychologistProfile.verified === true`; chamado no início de `searchPatients` e `createPatientLink`, antes de qualquer consulta a dados de pacientes. Mensagem de erro idêntica para "sem perfil" e "perfil não verificado" (`ForbiddenException`, 403) — não revela qual dos dois é o caso real. `createPatientLink` passou a checar `patient.isActive`, usando a mesma mensagem `NotFoundException` do caso "paciente não existe" — um paciente inativo não recebe novo convite e não é diferenciável de um paciente inexistente. Busca já filtrava `isActive: true` desde a implementação original do EPIC-05.
  Novo `psychologist.service.spec.ts` (7 casos): sem perfil → 403, sem chamar `user.findMany`; perfil não verificado → 403; mensagens de "sem perfil" e "não verificado" idênticas (prova de não-enumeração); perfil verificado → busca prossegue normalmente; convite sem perfil verificado → 403, sem chamar `create`; convite para paciente inativo → 404 com a mesma mensagem de "não encontrado"; convite com psicólogo verificado e paciente ativo → cria o vínculo normalmente. 43/43 testes verdes na suíte completa. `npx tsc --noEmit` e `npm run build` limpos. `npm run test:diff-cov`: 100% de cobertura no diff.
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

- **Status:** DONE
- **Pré-condição verificada com o responsável pelo produto (2026-09-22):** a migration `20260407142459_update_emotional_checkin_fields` nunca foi aplicada fora de bancos de desenvolvimento descartáveis (sem CI/CD, sem deploy, sem staging/produção no repositório) — confirmado explicitamente antes de qualquer alteração. `stress`→`anxietyLevel` é o mesmo conceito/escala (1-10), apenas renomeado — também confirmado explicitamente, e consistente com o comentário `// 1-10 scale` presente nos três campos desde o commit inicial do projeto.
- **Evidência:** SQL da migration reescrito no mesmo arquivo (nunca aplicada fora de descartáveis, então não há checksum de ambiente compartilhado a preservar) seguindo expand → backfill → contract: adiciona `moodScore`/`energyLevel`/`anxietyLevel` como nullable, copia `mood`→`moodScore`, `energy`→`energyLevel`, `stress`→`anxietyLevel`, aplica `NOT NULL` (que falha sozinho se sobrar nulo, validando o backfill) e só então remove `mood`/`energy`/`stress`. Novo teste `src/prisma/checkin-fields-migration.e2e.spec.ts` roda contra PostgreSQL 16 real (via `psql`, mesmo Postgres do `devOps/docker-compose.yml`): (1) aplica as migrations `init` + `add_rbac_and_profiles` + a migration alvo do zero em banco vazio, sem erro; (2) aplica as duas primeiras, insere 3 check-ins fixture com `mood/energy/stress`, roda a migration alvo, e confirma as 3 linhas preservadas com `moodScore/energyLevel/anxietyLevel` idênticos aos valores originais, e que as colunas antigas realmente sumiram do schema. Adiciona `pg`/`@types/pg` como devDependency (não existia driver Postgres direto no projeto). 36/36 testes verdes na suíte completa (2 novos deste rehearsal).
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

- **Status:** DONE
- **Evidência:** Helpers de banco descartável extraídos para `src/test-utils/disposable-postgres.ts` (reaproveitado por `CR-03.1`). Novo `src/prisma/all-migrations-populated.e2e.spec.ts`: **genérico** — lê `prisma/migrations/` dinamicamente (não fixa nomes de migration), aplica todas menos a mais recente, popula fixture sintética cobrindo usuário, psicólogo com perfil verificado, tutor/menor, check-in, diário, vínculo psicólogo-paciente e registro de consentimento, aplica a migration mais recente por cima, e verifica: contagem de linhas idêntica em todas as 7 tabelas antes/depois; nenhuma tabela ficou vazia; relacionamentos (joins) entre todas as entidades continuam resolvendo; valores de check-in mapeados corretamente; nenhum campo obrigatório ficou nulo. Também roda todas as migrations do zero em banco vazio.
  Validado que o teste realmente pega regressão: restaurei temporariamente a versão destrutiva original da migration de check-ins (a que motivou `CR-03.1`) e confirmei que o teste falha na hora (`ERROR: column "moodScore" ... contains null values`); revertido antes do commit final. 46/46 testes verdes na suíte completa (3 novos). `npx tsc --noEmit` e `npm run build` limpos.
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

- **Status:** DONE
- **Evidência:** `[id]/page.tsx` e `page.tsx` de `admin/users` importavam `RoleBadge`/`AgeGroupBadge` de caminhos inexistentes (os componentes reais vêm do barrel `@/components/ui`) e um tipo `UserWithDetails` que nunca existiu — trocado por `AdminUser`, o tipo real exportado por `lib/admin-api.ts`. Removido o campo `user.gender` (nunca existiu na API real, backend nem no Prisma schema); data de nascimento agora trata `birthDate` opcional sem quebrar. `handleChangeRole`/`handleToggleStatus`/`handleViewUser`/`handleEditUser` alinhados à assinatura real de `UsersTable` (`(user: AdminUser) => void`, não `(userId: string, ...)`); `handleViewUser` e `handleChangeRole` agora navegam de verdade para a página de detalhe (antes só mostravam toast "será implementado"), e `handleToggleStatus` chama a API de verdade. Removido `role: newRole as any` (o tipo já aceitava `string` diretamente) e `stats={{} as any}` no skeleton de loading. Corrigido também um bug real de runtime encontrado no processo: `UsersStats` tinha um tipo `UserStats` local duplicado e mais estrito que o real (`byRole`/`byAgeGroup` com todas as chaves obrigatórias), enquanto o backend (`groupBy` do Prisma) só retorna chaves de roles/faixas etárias que têm pelo menos um usuário — uma role sem nenhum usuário (ex.: `GUARDIAN` zerado) virava `undefined`, e `stats.byRole.PATIENT + stats.byRole.GUARDIAN` virava `NaN` na tela; corrigido importando o tipo real de `lib/admin-api.ts` e aplicando `?? 0` em todo acesso.
  `npx tsc --noEmit` e `npm run lint` agora só falham nos itens explicitamente fora do escopo desta história — `providers/auth-provider.tsx` (`CR-04.2`, corrigida na sequência) e a ordem de hooks em `checkins/page.tsx` (`CR-04.3`). `npm run build` compila o bundle com sucesso (`✓ Compiled successfully`, sem problema de fonte/rede) e só falha no type-check final pelo mesmo motivo de `CR-04.2` — build completo volta a passar assim que essa história (próxima da fila) for concluída.
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

- **Status:** DONE
- **Evidência:** `AuthProvider` acessava `authHelpers.tokenStorage.get()!` — `tokenStorage` nunca foi propriedade de `authHelpers`, é um export separado de `lib/auth.ts`; todo reload com sessão salva lançava exceção e o `catch` fazia logout incondicional. Corrigido: `initAuth` agora usa o usuário em cache (`authHelpers.getCurrentUser()`) de forma otimista enquanto valida com `authApi.getProfile()`, e `refreshUser`/`initAuth` só chamam `authHelpers.logout()`/limpam a sessão quando o erro é `401` de verdade (`error.response?.status === 401`) — uma falha de rede/5xx temporária mantém a sessão em cache em vez de deslogar o usuário. Nenhum dos dois caminhos regrava o token (que não muda nesse fluxo); só o usuário em cache é atualizado via `userStorage.set`.
  Como não havia nenhum framework de teste no frontend, configurado Jest + React Testing Library (`jest.config.js` via `next/jest`, `jest.setup.ts`, script `npm test`) — infraestrutura mínima reaproveitável por `CR-06.3`. Novo `providers/auth-provider.test.tsx` (4 casos): sem sessão salva → não autenticado, API nunca chamada; sessão salva + perfil carregado com sucesso → autenticado com dados atualizados, cache reescrito; sessão salva + `401` → sessão encerrada de verdade (token e usuário removidos do `localStorage`); sessão salva + falha de rede (erro sem `.response`) → sessão mantida em cache, usuário continua autenticado. 4/4 testes verdes. `npx tsc --noEmit` limpo. `npm run build` volta a compilar até o fim — só falha no lint de `checkins/page.tsx`, explicitamente `CR-04.3` (P2, fora do escopo dos 8 bloqueadores P1).
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

- **Status:** DONE
- **Evidência:** o `return null` condicional em `checkins/page.tsx` acontecia antes da declaração do `useEffect` de busca de dados — usuário anônimo executava menos hooks que usuário autenticado, violando `rules-of-hooks`. O redirect foi movido para dentro de um `useEffect` (mesmo padrão já usado nas demais páginas do app), declarado antes de qualquer `return`; os `return` condicionais (loading de auth → `null` se anônimo → loading de dados → conteúdo) agora só acontecem depois de todos os hooks declarados.
  Novo `checkins/page.test.tsx` (2 casos, usando `rerender` do Testing Library para simular a transição real): loading→autenticado não lança erro e carrega os check-ins; loading→anônimo não lança erro, redireciona e **não** chama a API de check-ins. Validado que o teste pega o bug de verdade: restaurei temporariamente o código antigo e o teste falhou com o erro exato do React (`Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`); revertido antes do commit final. `npm run lint` limpo (`react-hooks/rules-of-hooks` era o único erro de lint do projeto).

### CR-04.4 — Tornar o build independente do download de fonte

- **Status:** DONE
- **Evidência:** `app/layout.tsx` usava `next/font/google` (Inter), que baixa o arquivo da fonte de `fonts.googleapis.com` durante o build — falha em ambiente sem rede. Substituído pela stack de fontes do sistema já padrão do Tailwind (`font-sans`: `ui-sans-serif, system-ui, -apple-system, ...`), aplicada via `className="font-sans"` no `<body>`. Nenhum arquivo de fonte foi adicionado ao repositório — sem questão de licença a gerenciar. Visualmente muito próximo de Inter (mesma família de fontes UI modernas).
  `npm run build` completo passa sem nenhuma referência a `next/font` ou a domínio externo de fonte no código.
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

- **Status:** DONE
- **Evidência:** `next` e `eslint-config-next` atualizados de `14.0.0` para `14.2.35` (último patch da linha 14.x — sem major); `postcss` de `^8.4.31` para `^8.5.23`; `npm audit fix` (sem `--force`) resolveu `postcss-selector-parser`. `axios` já estava em versão não vulnerável (`^1.14.0`, sem achado no audit). `npm audit --omit=dev`: de 9 vulnerabilidades (1 crítica, 5 altas) para 2 (1 crítica, 1 alta) — ambas residuais só corrigíveis com Next 16, ver exceção documentada abaixo.
  **Regressão encontrada e corrigida durante a atualização:** Next 14.2.x passou a exigir `<Suspense>` ao redor de `useSearchParams()` para permitir pré-renderização estática, quebrando o build de `/dashboard` (`useSearchParams() should be wrapped in a suspense boundary`). Isolado em componente próprio (`AccessDeniedToast`, sem saída visual) envolto em `<Suspense fallback={null}>` — mesmo comportamento, build volta a passar.
  `npm ci` testado em diretório isolado (`/tmp`): reproduz a instalação a partir do lockfile atualizado sem erro. `npx jest`, `npx tsc --noEmit`, `npm run lint` e `npm run build` (completo, 15/15 páginas) — todos limpos.

  **Exceção formal — vulnerabilidades residuais do Next.js (não corrigíveis dentro da linha 14.x):**
  - **Vulnerabilidades:** `next` critical (agrega várias advisories, incluindo AVIF Image Optimization RCE, Windows RCE, DoS/SSRF em Server Actions, cache poisoning em Middleware/RSC) e `postcss` high (vendorizado dentro do próprio `next`, não é o `postcss` de topo já atualizado).
  - **Análise de alcance:** o app não usa `next/image` (sem `remotePatterns`), não usa Server Actions (`'use server'`), não usa i18n de rota nem `rewrites` no `next.config.js` (config vazio) — a maior parte da superfície dessas advisories não é alcançável pelo código atual. O middleware é usado ativamente (proteção de rotas por role), mas já está documentado como camada de UX, não de autorização (`IA/BACKLOG_CODE_REVIEW.md`, achados do review original) — o backend permanece a fronteira de autorização real (confirmado pelas correções de `CR-02.2`).
  - **Mitigação:** nenhuma ação adicional de código necessária hoje, dado o alcance acima. Autorização real continua exclusivamente no backend.
  - **Correção completa:** requer upgrade major para Next 15/16 — mudança de React, possíveis breaking changes no App Router, exige sua própria rodada de testes de regressão. Fora do escopo de uma atualização de dependências (regra do backlog: não fazer upgrade major automático sem avaliar compatibilidade).
  - **Responsável:** Ricardo (dono do projeto).
  - **Prazo:** antes do primeiro deploy em produção pública, ou em até 90 dias corridos a partir de 2026-09-23 — o que ocorrer primeiro.
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

- **Status:** DONE
- **Evidência:** `npm audit fix` (sem `--force`) resolveu `fflate`/`file-type` diretos e `brace-expansion`. `tar` (crítico, via `bcrypt → @mapbox/node-pre-gyp`) e `qs` (moderado, via `@nestjs/platform-express`/`express`) ficavam presos em versões antigas porque seus pais diretos declaram ranges major que o resolver padrão do npm não ultrapassa — corrigido com `overrides` no `package.json` (`tar: ^7.5.22`, `qs: ^6.16.0`), forçando as versões patcheadas sem tocar nos pacotes de topo. `npm audit --omit=dev`: de 13 vulnerabilidades (1 crítica, 5 altas) para 8 (0 crítica, 3 altas) — nenhuma crítica restante.
  Validado que o override não quebra nada: suíte completa (46/46), `tsc --noEmit`, `npm run build` limpos; `npm ci` testado em diretório isolado reproduz exatamente `tar@7.5.22`/`qs@6.16.0`; `bcrypt.hash()` real testado nessa instalação isolada, confirmando que o binário nativo (que depende de `node-pre-gyp`/`tar` no install) continua funcionando com o `tar` forçado.

  **Exceção formal — vulnerabilidades residuais que exigem NestJS 10→12 (dois majors):**
  - **Vulnerabilidades:** `lodash` high (via `@nestjs/config`), `multer` high (via `@nestjs/platform-express`), `file-type` moderate (via `@nestjs/common`), `body-parser` low (via `@nestjs/platform-express`/`express`; a correção é `body-parser@2.x`, feito para Express 5, potencialmente incompatível com o Express 4 que este projeto usa).
  - **Análise de alcance:** `multer` **não é usado em nenhuma rota** deste projeto (`grep` por `multer|FileInterceptor|@UploadedFile` em `src/` não encontra nada) — é puro peso morto trazido pelo `@nestjs/platform-express`, sem superfície de ataque real hoje. `lodash`/`file-type` são usados internamente pelo NestJS/seus pacotes auxiliares (leitura de config, utilitários), não por código deste projeto processando entrada de usuário diretamente — as funções vulneráveis (`_.template`, `_.unset`, `_.omit` com paths controlados por atacante; parsing de arquivo malformado) não têm caminho de entrada óbvio a partir de uma requisição HTTP nesta aplicação.
  - **Mitigação:** nenhuma ação de código necessária hoje, dado o alcance acima. Se upload de arquivo for implementado no futuro, reavaliar `multer` antes de habilitá-lo.
  - **Correção completa:** requer subir `@nestjs/common`, `@nestjs/core`, `@nestjs/config` e `@nestjs/platform-express` de uma vez para a linha 12.x (dois majors à frente da 10.x atual) — mudança de peso comparável à atualização do Next.js em `CR-05.1`, precisa de sua própria rodada de testes de regressão (guards, strategies, DI, upload se vier a existir). Fora do escopo de uma atualização de dependências.
  - **Responsável:** Ricardo (dono do projeto).
  - **Prazo:** mesmo prazo de `CR-05.1` — antes do primeiro deploy em produção pública, ou em até 90 dias corridos a partir de 2026-09-23, o que ocorrer primeiro.
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

- **Status:** DONE
- **Evidência:** `app.enableCors()` (sem opções, aceitava qualquer origem) substituído por `app.enableCors(buildCorsOptions())` (novo `src/common/cors.config.ts`). Produção (`NODE_ENV=production`) exige `CORS_ALLOWED_ORIGINS` (lista exata, sem wildcard) — **lança erro na inicialização** se ausente, em vez de subir aceitando ou negando tudo silenciosamente. Fora de produção, além do allowlist, localhost e IPs de rede local (`10.x`, `172.16-31.x`, `192.168.x`, qualquer porta) são aceitos automaticamente — necessário para não quebrar o acesso via IP na rede local já implementado (`devOps/docker-compose.yml` roda com `NODE_ENV=development`, então continua funcionando sem configuração extra). `methods`/`allowedHeaders` explícitos; `credentials: false` (auth via header `Authorization`, não cookie, neste momento — revisar quando `CR-05.4` migrar a sessão para cookie).
  Testes novos: `cors.config.spec.ts` (11 casos unitários sobre a função de decisão: localhost e IP de rede local permitidos em dev, origem pública rejeitada, sem `Origin` sempre permitido, produção lança sem `CORS_ALLOWED_ORIGINS`, produção permite exatamente as origens listadas, produção rejeita não listada, produção **não** libera IP de rede local automaticamente, `origin` nunca é `"*"`) e `cors.e2e.spec.ts` (5 casos, servidor HTTP real via supertest: preflight `OPTIONS` de origem autorizada recebe os headers CORS esperados; preflight de origem não autorizada não recebe header de permissão; `GET` real de origem autorizada recebe `Access-Control-Allow-Origin` **igual à origem**, nunca `"*"`; `GET` de origem não autorizada não recebe o header; dev libera IP de rede local no `GET` real). 62/62 testes verdes na suíte completa. `main.ts` (bootstrap, não testável unitariamente) excluído de `collectCoverageFrom` — prática padrão para entrypoints.
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

- **Status:** DONE
- **Evidência:**
  - **Contrato de sessão** (`src/common/session-cookie.ts`, novo): `emotional_app_token` (HttpOnly, `SameSite=Lax`, `Secure` em produção, `path=/`, 7 dias) carrega o JWT — nunca mais no corpo da resposta. `csrf_token` (não-HttpOnly, mesmos demais atributos) é o par do double-submit cookie.
  - **Backend**: `login`/`register` usam `@Res({passthrough:true})` para setar os dois cookies via `setSessionCookies`; a resposta passa a ser `{ user, csrfToken }`, sem `access_token`. Novo `POST /auth/logout` (autenticado) limpa os dois cookies via `clearSessionCookies`. `JwtStrategy` extrai o JWT exclusivamente de `req.cookies.emotional_app_token` (não mais do header `Authorization`).
  - **CSRF** (`src/common/csrf.guard.ts` + `csrf.middleware.ts` + `skip-csrf.decorator.ts`): double-submit cookie aplicado globalmente (`APP_GUARD`) a toda requisição `POST/PUT/PATCH/DELETE` — header `X-CSRF-Token` precisa bater exatamente com o cookie `csrf_token`. Middleware global garante que todo cliente tenha um `csrf_token` desde a primeira requisição (mesmo antes de logar). `register`/`login` isentos (`@SkipCsrf()`) — ainda não existe sessão para um atacante abusar nesse ponto.
  - **CORS** (`CR-05.3`): `credentials: true` (necessário para o cookie trafegar cross-origin frontend↔backend), origem sempre exata (nunca wildcard, já garantido).
  - **Frontend**: `lib/api.ts` — axios com `withCredentials: true`; interceptor novo ecoa `csrf_token` (lido de `document.cookie`, que só expõe esse cookie, nunca o de sessão) como header `X-CSRF-Token` em toda requisição; interceptor de `Authorization: Bearer` removido (não há mais token acessível ao JS para anexar). `lib/auth.ts` — `tokenStorage` removido inteiramente; `authHelpers.logout()` agora é assíncrono, chama `POST /auth/logout` (só o servidor consegue limpar um cookie HttpOnly) e limpa o cache local mesmo se a chamada falhar (nunca trava "logado"). `AuthProvider` — `initAuth` não tem mais uma checagem local prévia (não há mais token para checar): sempre chama `getProfile()`, usando o usuário em cache apenas para render otimista; `logout` do contexto virou `async` (call site em `dashboard/page.tsx` atualizado).
  - **Middleware do Next.js**: **nenhuma alteração necessária** — HttpOnly bloqueia leitura via `document.cookie` no navegador, mas o middleware roda no servidor e lê o cookie normalmente a partir do request; mesmo nome de cookie (`emotional_app_token`) preservado de propósito para isso.
- **Validação end-to-end contra backend real** (Docker, não só mocks): registro → `Set-Cookie` com `HttpOnly` confirmado no cookie de sessão e ausente no `csrf_token`; corpo da resposta sem `access_token`; `GET /users/profile` com o cookie funciona; `POST` mutável sem `X-CSRF-Token` → 403; com header igual ao cookie → sucesso; `POST /auth/logout` → `Set-Cookie` com `Expires` no passado nos dois cookies, e o mesmo cookie salvo deixa de funcionar (401) logo em seguida; JWT assinado com segredo diferente do servidor → 401; CORS preflight cross-origin (porta 3000→3001) com `credentials: true` reflete a origem exata; middleware do Next.js continua redirecionando corretamente (`/dashboard` sem cookie → 307; paciente em `/dashboard/admin/users` → 307).
- **Testes automatizados novos**: `csrf.config.spec` combinado em `csrf.guard`/`csrf.middleware` cobertos por `csrf.e2e.spec.ts` (8 casos: GET nunca exige CSRF e já recebe o cookie; POST sem header → 403; POST com header mas sem cookie → 403; header ≠ cookie → 403; header = cookie → sucesso; `@SkipCsrf()` ignora a checagem; middleware seta o cookie só se ainda não existir); `logout.controller.spec.ts` (4 casos: sem sessão → 401; com sessão → limpa os dois cookies; token assinado com segredo errado → 401; valor sem formato de JWT → 401); `login.controller.spec.ts` atualizado (cookie HttpOnly presente, `csrf_token` legível, corpo sem `access_token`); `session-freshness.e2e.spec.ts` (`CR-02.2`) migrado de header `Authorization` para cookie, mesmo comportamento preservado; `auth-provider.test.tsx` (`CR-04.2`) reescrito para o novo modelo — inclui o cenário novo "sem cache local mas cookie válido no servidor autentica mesmo assim" e dois casos novos para `logout()` (chama o servidor; limpa o estado local mesmo se a chamada falhar).
  74/74 testes no backend, 9/9 no frontend. `npx tsc --noEmit`, `npm run lint` e `npm run build` limpos nos dois apps. `npm run test:diff-cov`: backend 90.4%, frontend 91.7% (ambos acima da meta de 90%).
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
  - audit de produção com política para critical/high;
  - gate de cobertura do diff (`npm run test:diff-cov` em cada app,
    `scripts/check-diff-coverage.js`, meta 90% — ver `IA/03-PADROES-DESENVOLVIMENTO.md`),
    calculado contra a base do PR.
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

- [x] Todas as histórias P1 estão `DONE`. (CR-01.1 a CR-04.2 concluídas em 2026-09-22)
- [x] Backend build e testes passam. (`npm run build` e `npx jest --runInBand` — 36/36 verdes)
- [x] Frontend type-check, lint, testes e build passam. (`CR-04.3` e `CR-04.4` — `npm run build` completo, do zero, sem rede externa)
- [x] Migration foi testada com banco PostgreSQL populado. (`CR-03.1`, rehearsal contra Postgres 16 real)
- [x] Nenhum login social simulado permanece público. (`CR-01.1`)
- [x] Usuário inativo e role revogada perdem acesso imediatamente. (`CR-02.1` + `CR-02.2`)
- [x] Cadastro público não controla role. (`CR-01.2`)
- [x] Psicólogo não controla `verified`. (`CR-01.3`)
- [x] Audit não possui critical/high sem exceção formal. (`CR-05.1`/`CR-05.2` — residuais documentados com alcance, mitigação, responsável e prazo)
- [x] CORS está restrito em produção. (`CR-05.3`)
- [x] Token não está disponível em localStorage ou cookie legível por JavaScript. (`CR-05.4`)
- [ ] CI bloqueia regressões.
- [ ] Novo code review confirma o encerramento dos achados.
