import './config/check-env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseOrigins } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const config = app.get(ConfigService);
  app.enableCors({
    origin: parseOrigins(config.getOrThrow<string>('ALLOWED_ORIGINS')),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // browsers may cache the preflight answer for a day
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.log(
          JSON.stringify(errors, null, 2)
        );

        return new BadRequestException(errors);
      },
    }),
  );

  console.log("1️⃣ Before listen");

  await app.listen(config.getOrThrow<number>('PORT'));

  console.log("2️⃣ After listen");
  console.log("3️⃣ URL:", await app.getUrl());

  console.log(`Server running on ${await app.getUrl()}`);

  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}
await bootstrap();
