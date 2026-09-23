import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// 🔒 Padrão de origens de rede local (localhost + faixas privadas RFC 1918),
// em qualquer porta — permitido SÓ fora de produção, para não travar o
// acesso via IP na rede local (ver devOps/docker-compose.yml) durante o
// desenvolvimento.
const LOCAL_NETWORK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// 🔒 Monta as opções de CORS a partir do ambiente. Lança na inicialização
// se rodando em produção sem CORS_ALLOWED_ORIGINS configurado — falhar
// alto e cedo é mais seguro que subir aceitando qualquer origem (ou
// nenhuma, silenciosamente).
export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const isProduction = env.NODE_ENV === 'production';
  const allowedOrigins = parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS);

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS é obrigatório em produção (NODE_ENV=production) — ' +
        'defina uma lista separada por vírgulas das origens autorizadas do frontend.',
    );
  }

  return {
    origin(requestOrigin, callback) {
      // Requisições sem Origin (curl, apps mobile, server-to-server) não
      // são navegador — CORS não se aplica a elas; deixa passar.
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      if (!isProduction && LOCAL_NETWORK_ORIGIN.test(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origem não autorizada pelo CORS: ${requestOrigin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    // 🔒 CR-05.4: sessão agora é cookie HttpOnly — o navegador só envia/
    // recebe cookies em requisições cross-origin com credentials: true nos
    // dois lados (aqui e no fetch/axios do frontend), e só quando `origin`
    // reflete a origem exata da requisição (nunca "*", já garantido acima).
    credentials: true,
  };
}
