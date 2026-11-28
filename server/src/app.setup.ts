import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseOrigins } from './config/env.validation.js';

// IDs are BigInt in the database. Without this, JSON.stringify throws on them
// (API responses, JWT payloads, RabbitMQ messages). Applied as soon as this file loads.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
    return this.toString();
};

// Everything main.ts sets up on the app, shared with the e2e tests so they test the real thing
export function configureApp(app: INestApplication) {
    const config = app.get(ConfigService);

    // Only the mini app's own site may call the API from a browser.
    // Login uses an Authorization header, not cookies, so credentials stay off.
    app.enableCors({
        origin: parseOrigins(config.getOrThrow<string>('ALLOWED_ORIGINS')),
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400, // browsers may cache the preflight answer for a day
    });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            exceptionFactory: (errors) => {
                console.log(JSON.stringify(errors, null, 2));
                return new BadRequestException(errors);
            },
        }),
    );

    return config;
}
