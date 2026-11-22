import { Module } from '@nestjs/common';
import { AdWorkerModule } from './workers/ad/ad.module.js';
import { DbWarmup } from './infrastructure/database/db.warmup.js';
import { ScheduleModule } from '@nestjs/schedule';
import { AdExpirationModule } from './workers/ad-expiration/ad-expiration.module.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';

@Module({
    imports: [
        AdWorkerModule, 
        ScheduleModule.forRoot(), 
        AdExpirationModule,
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })
    ],
    providers: [DbWarmup],
})
export class WorkerModule {}