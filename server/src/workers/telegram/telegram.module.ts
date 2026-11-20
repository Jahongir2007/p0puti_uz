import { Module } from '@nestjs/common';
import { TelegramWorker } from './telegram.service.js';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module.js';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module.js';
import { TelegramModule } from '../../telegram/telegram.module.js';

@Module({
  providers: [TelegramWorker],
  imports: [RabbitMQModule, MetricsModule, TelegramModule]
})
export class TelegramWorkerModule {}
