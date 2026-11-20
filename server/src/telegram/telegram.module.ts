import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';
import { TelegramBot } from './telegram.bot.js';
import { TelegramEventsController } from './telegram.events.controller.js';

@Module({
  controllers: [
    TelegramEventsController,
  ],
  providers: [
    TelegramService,
    TelegramBot,
  ],
  exports: [
    TelegramService,
    TelegramBot
  ],
})
export class TelegramModule {}