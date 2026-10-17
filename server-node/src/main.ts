import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v3');
  // 监控上报带 base64 抓拍图，默认 100kb 太小；放宽到 20mb
  app.useBodyParser('json', { limit: '20mb' });
  app.enableCors({ origin: '*' });
  // 标识由 V3 Node 后端应答（用于架构切换的验证/审计）
  app.use((req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-V3-Backend', 'node');
    next();
  });
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '127.0.0.1');
  console.log(`[doo-node-v3] listening on 127.0.0.1:${port} (prefix /api/v3)`);
}
bootstrap();