import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe, BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: true,
    credentials: true,
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

  await app.listen(process.env.PORT ?? 3000);

  console.log("2️⃣ After listen");
  console.log("3️⃣ URL:", await app.getUrl());

  console.log(`Server running on ${await app.getUrl()}`);

  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}
await bootstrap();
