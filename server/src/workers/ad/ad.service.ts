import { Injectable, OnModuleInit } from '@nestjs/common';

import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service.js';
import { MetricsService } from '../../infrastructure/metrics/metrics.service.js';
import { db } from '../../prisma/db.js';
import { TelegramEventJob } from '../../infrastructure/telegram/telegramEvent.interface.js';
import { AdWriteService, NewAd } from '../../ad/ad-write.service.js';
import { PostAdJobInterface } from './interface/postAd.job.interface.js';
import { UpdateAdJobInterface } from './interface/updateAd.job.interface.js';
import { DeleteAdJobInterface } from './interface/deleteAd.job.interface.js';
import { AdJob } from './type/adJob.type.js';

// Saves ads from the `ads` queue (AD_WRITE_MODE=async). The rules live in AdWriteService,
// shared with the API, so both modes behave the same.
@Injectable()
export class AdWorker implements OnModuleInit {
    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly metrics: MetricsService,
        private readonly adWrite: AdWriteService,
    ) {}

    async onModuleInit() {
        await this.rabbitMQ.consume('ads', async (job: AdJob) => {
            switch (job.type) {
                case 'POST_AD':
                    return this.handlePost(job);
                case 'UPDATE_AD':
                    return this.handleUpdate(job);
                case 'DELETE_AD':
                    return this.handleDelete(job);
                default: {
                    const unhandled: never = job;
                    console.error('Unknown ad job:', unhandled);
                }
            }
        });
    }

    private async handlePost(job: PostAdJobInterface) {
        const timer = this.metrics.start(`AdWorker.POST_AD.role=${job.data.role}`);
        try {
            const ad = job.data as unknown as NewAd;
            const result = await this.adWrite.create(ad);

            const user = await db.orm.public.Users.where({ id: BigInt(ad.userId) }).first();
            if (!user) return;
            const telegramId = String(user.telegramId);
            const trip = { telegramId, from: ad.from, to: ad.to, date: ad.date, time: ad.time };

            // The user only learns the result from the bot, so turn it into a message
            let event: TelegramEventJob | null = null;
            if (result.success) {
                event = { type: 'AD_CREATED', data: { ...trip, adId: String(result.adId) } };
            } else if (result.code === 'AD_DUPLICATE') {
                event = { type: 'AD_DUPLICATE', data: { ...trip, arrivalTime: ad.calculatedArrivalTime ?? '' } };
            } else if (result.code === 'AD_TOO_CLOSE') {
                event = { type: 'AD_TOO_CLOSE', data: trip };
            } else if (result.code === 'AD_IN_PAST') {
                event = { type: 'AD_IN_PAST', data: trip };
            } else {
                console.warn(`POST_AD refused for user ${ad.userId}: ${result.code}`);
            }

            if (event) await this.rabbitMQ.publish('telegram_events', event);
        } catch (err: unknown) {
            console.error('Error in AdWorker.POST_AD:', err);
        } finally {
            timer.end();
        }
    }

    private async handleUpdate(job: UpdateAdJobInterface) {
        const timer = this.metrics.start('AdWorker.UPDATE_AD');
        try {
            const result = await this.adWrite.update(BigInt(job.data.userId), BigInt(job.data.id), job.data);
            if (!result.success) console.warn(`UPDATE_AD ${job.data.id}: ${result.code}`);
        } catch (err: unknown) {
            console.error('Error in AdWorker.UPDATE_AD:', err);
        } finally {
            timer.end();
        }
    }

    private async handleDelete(job: DeleteAdJobInterface) {
        const timer = this.metrics.start('AdWorker.DELETE_AD');
        try {
            const result = await this.adWrite.cancel(BigInt(job.data.userId), BigInt(job.data.id));
            if (!result.success) console.warn(`DELETE_AD ${job.data.id}: ${result.code}`);
        } catch (err: unknown) {
            console.error('Error in AdWorker.DELETE_AD:', err);
        } finally {
            timer.end();
        }
    }
}