export type TrustProxySetting = boolean | number | string;

// 🔒 Code review PR #20 (KAN-159, P2): `req.ip` é usado como chave do rate
// limiter (AuthRateLimitGuard) — sem "trust proxy" configurado
// explicitamente no Express, duas topologias de produção quebram essa
// premissa de formas opostas:
//   - Direto (sem proxy) mas alguém tenta usar X-Forwarded-For: o padrão
//     do Express ("trust proxy" desligado) já é seguro — o cabeçalho é
//     ignorado, `req.ip` é sempre o socket TCP real. NADA a fazer aqui.
//   - Atrás de um proxy/ingress real SEM isto configurado: todo tráfego
//     aparenta vir do IP do proxy — o rate limit vira "todo mundo
//     compartilha um limite", bloqueio coletivo, não bypass.
//   - Atrás de proxy COM isto mal configurado (confiando em mais saltos
//     do que existem): um cliente malicioso pode forjar X-Forwarded-For e
//     ser tratado como se viesse de outro IP, esvaziando o rate limit por
//     IP.
//
// Resolução explícita via TRUST_PROXY_HOPS, documentada em
// IA/RATE_LIMITING_SETUP.md: ausente/vazio → undefined (não mexe no
// padrão seguro do Express — premissa operacional "produção é conexão
// direta"); valor numérico → número de saltos de proxy confiáveis a
// partir da borda (repassado como number para o Express); qualquer outro
// valor (ex.: "loopback", um IP/CIDR específico) é repassado como string,
// que é o formato que o próprio Express espera para esses casos.
export function resolveTrustProxySetting(
  env: NodeJS.ProcessEnv = process.env,
): TrustProxySetting | undefined {
  const raw = env.TRUST_PROXY_HOPS;
  if (!raw) return undefined;

  const asNumber = Number(raw);
  return Number.isNaN(asNumber) ? raw : asNumber;
}
