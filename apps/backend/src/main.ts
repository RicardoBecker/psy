import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  const port = process.env.PORT || 3001;
  // 🌐 Bind explícito em todas as interfaces para ser acessível via IP na rede local
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend rodando na porta ${port} (acessível na rede local)`);
}

bootstrap();