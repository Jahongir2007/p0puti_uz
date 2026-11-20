import { Module } from '@nestjs/common';
import { AdExpirationService } from './ad-expiration.service.js';
import { DbWarmup } from '../../infrastructure/database/db.warmup.js';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module.js';

@Module({
  imports: [MetricsModule],
  providers: [AdExpirationService, DbWarmup]
})
export class AdExpirationModule {}
