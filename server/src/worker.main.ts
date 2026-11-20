import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { WorkerModule } from './worker.module.js';
import { EXPIRE_ADS_JOB, EXPIRE_ADS_TZ } from './workers/ad-expiration/ad-expiration.service.js';

const logger = new Logger('Worker');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks(); // SIGTERM/Ctrl+C → onModuleDestroy → db.close()

  logger.log(`Worker ${process.pid} started`);

  const scheduler = app.get(SchedulerRegistry);
  if (scheduler.doesExist('cron', EXPIRE_ADS_JOB)) {
    const next = scheduler.getCronJob(EXPIRE_ADS_JOB).nextDate().setZone(EXPIRE_ADS_TZ);
    logger.log(`${EXPIRE_ADS_JOB} next run: ${next.toISO()}`);
  } else {
    logger.warn(`${EXPIRE_ADS_JOB} is not registered`);
  }
}

bootstrap().catch((err) => {
  logger.error('Worker failed to start', (err as Error).stack);
  process.exit(1);
});