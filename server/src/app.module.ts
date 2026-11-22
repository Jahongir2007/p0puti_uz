import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { AdModule } from './ad/ad.module.js';
import { RabbitMQModule } from './infrastructure/rabbitmq/rabbitmq.module.js';
import { MetricsModule } from './infrastructure/metrics/metrics.module.js';
import { DbWarmup } from './infrastructure/database/db.warmup.js';
import { validateEnv } from './config/env.validation.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    AuthModule,
    UserModule,
    VehicleModule,
    AdModule,
    RabbitMQModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DbWarmup],
})
export class AppModule {}
