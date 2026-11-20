import { Module } from '@nestjs/common';
import { TelegramWorker } from './telegram.service.js';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module.js';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module.js';
import { TelegramBotModule } from '../../telegram/telegram-bot.module.js';

@Module({
  providers: [TelegramWorker],
  imports: [RabbitMQModule, MetricsModule, TelegramBotModule]
})
export class TelegramWorkerModule {}
