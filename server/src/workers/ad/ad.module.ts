import { Module } from '@nestjs/common';
import { AdWorker } from './ad.service.js';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module.js';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module.js';
import { DbWarmup } from '../../infrastructure/database/db.warmup.js';
import { AdWriteService } from '../../ad/ad-write.service.js';

@Module({
  imports: [RabbitMQModule, MetricsModule],
  providers: [AdWorker, DbWarmup, AdWriteService],
  exports: [AdWorker]
})
export class AdWorkerModule {}
