import { Module } from '@nestjs/common';
import { AdWorkerModule } from './workers/ad/ad.module.js';
import { DbWarmup } from './infrastructure/database/db.warmup.js';
import { ScheduleModule } from '@nestjs/schedule';
import { AdExpirationModule } from './workers/ad-expiration/ad-expiration.module.js';

@Module({
    imports: [AdWorkerModule, ScheduleModule.forRoot(), AdExpirationModule],
    providers: [DbWarmup],
})
export class WorkerModule {}