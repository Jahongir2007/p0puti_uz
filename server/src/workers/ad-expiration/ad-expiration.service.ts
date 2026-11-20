import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AdStatus } from './enum/adStatus.enum.js';
import { MetricsService } from '../../infrastructure/metrics/metrics.service.js';
import { db } from '../../prisma/db.js';
import { Temporal } from 'temporal-polyfill';

export const EXPIRE_ADS_JOB = 'expire-past-ads';
export const EXPIRE_ADS_TZ = 'Asia/Tashkent'

@Injectable()
export class AdExpirationService {
    constructor(
        private readonly metrics: MetricsService
    ){}

    @Cron(process.env.EXPIRE_ADS_CRON ?? '1 0 * * *', {
        name: 'expire-past-ads',
        timeZone: EXPIRE_ADS_TZ,
    })
    async handleCron() {
        try {
            await this.expirePastAds();
        } catch (err) {
            console.error(`${EXPIRE_ADS_JOB} failed`, (err as Error).stack);
        }
    }

    async expirePastAds(now: Temporal.Instant = Temporal.Now.instant()): Promise<number>{
        const timer = this.metrics.start("AdExpirationService");
        try{
            const count = await db.orm.public.Ads
                .where((ad) => ad.status.eq(AdStatus.ACTIVE))
                .where((ad) => ad.deletedAt.isNull())
                .where((ad) => ad.departureTime.lt(now))
                .updateAndCount({ status: AdStatus.EXPIRED, updatedAt: now });

            console.log(`Expired ${count} ads`);
            return count;
        }finally{
            timer.end();
        }
    }
}
