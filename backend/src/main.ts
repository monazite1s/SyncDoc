import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { CollaborationHocuspocus } from './modules/collaboration/collaboration.hocuspocus';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);

  // 启动 Hocuspocus WebSocket 服务器（独立端口）
  const wsPort = configService.get<number>('WS_PORT', 3002);
  const hocuspocusServer = app.get(CollaborationHocuspocus);
  await hocuspocusServer.start(wsPort);

  // 优雅关闭
  const shutdown = async (signal: string) => {
    console.log(`收到 ${signal} 信号，正在关闭服务器...`);
    await hocuspocusServer.shutdown();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
