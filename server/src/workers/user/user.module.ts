import { Module } from '@nestjs/common';
import { UserWorkerService } from './user.service.js';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module.js';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module.js';

@Module({
  imports: [RabbitMQModule, MetricsModule],
  providers: [UserWorkerService]
})
export class UserWorkerModule {}
