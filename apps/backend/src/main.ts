import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { buildCorsOptions } from './common/cors.config';
import { resolveTrustProxySetting } from './common/trust-proxy.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🔒 Code review PR #20 (KAN-159, P2): ver trust-proxy.config.ts para o
  // racional completo. Sem TRUST_PROXY_HOPS configurado, mantém o padrão
  // seguro do Express (ignora X-Forwarded-For, usa o socket real) — a
  // premissa operacional é conexão direta até essa variável ser definida.
  const trustProxySetting = resolveTrustProxySetting();
  if (trustProxySetting !== undefined) {
    app.set('trust proxy', trustProxySetting);
  }

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors(buildCorsOptions());

  const port = process.env.PORT || 3001;
  // 🌐 Bind explícito em todas as interfaces para ser acessível via IP na rede local
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend rodando na porta ${port} (acessível na rede local)`);
}

bootstrap();