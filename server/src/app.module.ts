import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './telegram/telegram.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { AdModule } from './ad/ad.module.js';
import { RabbitMQModule } from './infrastructure/rabbitmq/rabbitmq.module.js';
import { AdWorkerModule } from './workers/ad/ad.module.js';
import { MetricsModule } from './infrastructure/metrics/metrics.module.js';
import { DbWarmup } from './infrastructure/database/db.warmup.js';
import { TelegramWorkerModule } from './workers/telegram/telegram.module.js';
import { AdExpirationModule } from './workers/ad-expiration/ad-expiration.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    // ObserveModule.forRoot({
    //   appKey: 'YOUR_APP_KEY',
    //   appSecret: 'YOUR_APP_SECRET',
    //   serviceId: 'server',
    // }),
    ConfigModule.forRoot({
      isGlobal: true
    }),

    TelegramModule,

    AuthModule,

    UserModule,

    VehicleModule,

    AdModule,

    RabbitMQModule,

    AdWorkerModule,

    MetricsModule,

    TelegramWorkerModule,

    AdExpirationModule,
  ],
  controllers: [AppController],
  providers: [AppService, DbWarmup],
})
export class AppModule {}
