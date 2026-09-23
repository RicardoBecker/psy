# 🚦 Rate Limiting de Autenticação (KAN-18)

## 📋 O que está limitado

`AuthRateLimitGuard` (`apps/backend/src/common/rate-limit/`) protege seis
endpoints de `AuthController`, cada um com seu próprio limite por IP — o
limite por identidade (e-mail no corpo, quando presente) é sempre a metade
do limite por IP:

| Endpoint | Limite por IP | Limite por identidade | Janela |
|---|---|---|---|
| `POST /auth/login` | 10 | 5 | 1 minuto |
| `POST /auth/register` | 10 | 5 | 1 minuto |
| `POST /auth/google` | 10 | — (sem e-mail pré-verificado) | 1 minuto |
| `POST /auth/apple` | 10 | — (sem e-mail pré-verificado) | 1 minuto |
| `POST /auth/forgot-password` | 5 | 2 | 1 minuto |
| `POST /auth/reset-password` | 10 | — (token, não e-mail) | 1 minuto |

`forgot-password` tem o limite mais apertado por ser o alvo clássico de
abuso (enumeração de contas, spam de e-mail).

## 🔒 Como funciona

- **Por IP**: qualquer atacante de um único endereço é limitado.
- **Por identidade**: uma conta específica sob ataque de IPs rotativos
  (proxies, botnets) continua limitada mesmo trocando de origem — o limite
  por identidade é sempre mais apertado que o por IP.
- **Resposta padronizada**: `429` com corpo
  `{ statusCode: 429, message: "Muitas tentativas. Tente novamente em alguns instantes.", retryAfter: <segundos> }`
  e header `Retry-After`.
- **Desbloqueio automático**: a janela é fixa (`windowMs`) — não existe
  "desbloquear manualmente", ela expira sozinha.
- **Contador em memória** (`RateLimitStore`), sem Redis. Funciona para uma
  instância única. **Limitação conhecida**: múltiplas instâncias atrás de
  um load balancer teriam contadores independentes (o limite efetivo vira
  `limite × nº de instâncias`) — se o projeto crescer para múltiplas
  instâncias, trocar `RateLimitStore` por um backend compartilhado (Redis)
  é o próximo passo natural.

## 📊 Métricas (KAN-80)

Sem uma stack de observabilidade real no projeto hoje (sem Prometheus,
Datadog, Sentry, etc.), a implementação é a mais honesta possível dentro
dessa limitação:

- **Log estruturado** a cada bloqueio: `[AuthRateLimit] 429 em <rota> — motivo=<ip|identity> ip=<ip>`.
  Nunca loga o e-mail em si (CR-02.1: registrar sem dados sensíveis).
- **Contador em memória** (`RateLimitMetricsService`), exposto para
  inspeção via `GET /admin/security/rate-limits` (requer role `ADMIN`) —
  retorna `{ blocks: [{ route, reason, count }] }`. Zera a cada
  deploy/restart; não é histórico persistente.

### Runbook de alertas (para quando o ambiente de produção tiver uma stack de logs)

Não existe painel/alerta configurado de verdade — isso depende da stack de
logs do ambiente de produção (ex.: CloudWatch, Datadog, Grafana Loki), que
não faz parte deste repositório. Quando essa stack existir, a regra
sugerida é:

> Alertar se houver **mais de 20 linhas `[AuthRateLimit] 429`** dos logs do
> backend em uma janela de **5 minutos**, agrupando por `ip` (possível
> ataque de força bruta de uma origem) OU por `motivo=identity` numa mesma
> rota em curto intervalo (possível conta específica sob ataque
> distribuído).

Até lá, `GET /admin/security/rate-limits` serve como verificação manual
("painel" na forma mais simples possível: um endpoint JSON, não uma UI).
