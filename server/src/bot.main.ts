import { NestFactory } from '@nestjs/core';
import './config/check-env.js';
import { BotModule } from './bot.module.js';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(BotModule);
    app.enableShutdownHooks();  
}
bootstrap().catch((err) => {
    console.error('Bot failed to start', err);
    process.exit(1);
});