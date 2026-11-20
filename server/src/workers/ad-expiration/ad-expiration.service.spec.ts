import { describe, it, expect, vi, afterEach } from 'vitest';

// Runs before the imports, so the @Cron decorator sees the real default schedule
vi.hoisted(() => {
  delete process.env.EXPIRE_ADS_CRON;
});

vi.mock('../../prisma/db', () => ({ db: {} })); // never load the real DB client

import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { AdExpirationService, EXPIRE_ADS_JOB, EXPIRE_ADS_TZ } from './ad-expiration.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

async function createModule(): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule({
    imports: [ScheduleModule.forRoot()],
    providers: [
      AdExpirationService,
      { provide: MetricsService, useValue: { start: () => ({ end() {} }) } },
    ],
  }).compile();
  await moduleRef.init(); // ← this is when the cron job gets registered
  return moduleRef;
}

describe('expire-past-ads schedule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    await moduleRef?.close(); // stops the cron job
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs every day at 00:01 Asia/Tashkent', async () => {
    moduleRef = await createModule();

    const job = moduleRef.get(SchedulerRegistry).getCronJob(EXPIRE_ADS_JOB);
    const [first, second] = job.nextDates(2).map((d) => d.setZone(EXPIRE_ADS_TZ));

    expect(first.toFormat('HH:mm')).toBe('00:01');
    expect(second.diff(first, 'hours').hours).toBe(24);
  });

  it('runs the job at 00:01, not before', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T00:00:50+05:00')); // 10 seconds before

    moduleRef = await createModule(); // cron registered with the real handleCron

    const service = moduleRef.get(AdExpirationService);
    const spy = vi.spyOn(service, 'expirePastAds').mockResolvedValue(0); // no DB

    await vi.advanceTimersByTimeAsync(5_000);   // → 00:00:55
    expect(spy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);  // → 00:01:05
    expect(spy).toHaveBeenCalledTimes(1);
  });
});