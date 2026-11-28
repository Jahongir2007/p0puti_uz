import './config/check-env.js'; // must stay the first import
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // CORS, the /api prefix and request validation (shared with the e2e tests)
  const config = configureApp(app);

  await app.listen(config.getOrThrow<number>('PORT'));

  console.log(`Server running on ${await app.getUrl()}`);
}
await bootstrap();
