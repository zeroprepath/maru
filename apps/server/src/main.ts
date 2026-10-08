import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  // join-form.tsx가 브라우저에서 직접 POST /rooms/by-code/:code/guest-token을 부른다.
  app.enableCors();
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
