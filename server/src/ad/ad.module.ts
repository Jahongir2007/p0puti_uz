import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AdController } from './ad.controller.js';
import { AdService } from './ad.service.js';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module.js';
import { MetricsModule } from '../infrastructure/metrics/metrics.module.js';
import { AdWriteService } from './ad-write.service.js';

@Module({
  imports: [
    RabbitMQModule,

    MetricsModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],

  controllers: [AdController],

  providers: [AdService, AdWriteService],
})
export class AdModule {}