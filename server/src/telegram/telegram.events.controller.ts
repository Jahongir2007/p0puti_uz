import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TelegramBot } from './telegram.bot.js';
import { TelegramEventJob } from '../infrastructure/telegram/telegramEvent.interface.js';

type EventData<T extends TelegramEventJob['type']> =
  Extract<TelegramEventJob, { type: T }>['data'];

@Controller()
export class TelegramEventsController {
  constructor(private readonly telegramBot: TelegramBot) {}

  @EventPattern('user.created')
  async handleUserCreated(@Payload() data: { telegramId: string }) {
    await this.telegramBot.sendWelcomeMessage(data.telegramId);
  }

  @EventPattern('AD_CREATED')
  async handleAdCreated(@Payload() data: EventData<'AD_CREATED'>) {
    await this.telegramBot.sendAdCreatedMessage(data.telegramId, data);
  }

  @EventPattern('AD_DUPLICATE')
  async handleAdDuplicate(@Payload() data: EventData<'AD_DUPLICATE'>) {
    await this.telegramBot.sendAdDuplicateMessage(data.telegramId, data);
  }

  @EventPattern('AD_TOO_CLOSE')
  async handleAdTooClose(@Payload() data: EventData<'AD_TOO_CLOSE'>){
    await this.telegramBot.sendAdTooCloseMessage(data.telegramId, data);
  }
}