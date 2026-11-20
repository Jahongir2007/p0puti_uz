import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service.js';
import { MetricsService } from '../../infrastructure/metrics/metrics.service.js';
import { TelegramBot } from '../../telegram/telegram.bot.js';
import { TelegramEventJob } from '../../infrastructure/telegram/telegramEvent.interface.js';

@Injectable()
export class TelegramWorker implements OnModuleInit {
    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly metrics: MetricsService,
        private readonly telegramBot: TelegramBot,
    ) {}

    async onModuleInit() {
        await this.rabbitMQ.consume(
            'telegram_events',
            async (job: TelegramEventJob) => {
                const timer = this.metrics.start(`TelegramWorker.${job.type}`);
                try {
                    switch (job.type) {
                        case 'AD_DUPLICATE':
                            await this.telegramBot.sendAdDuplicateMessage(job.data.telegramId, job.data);
                            break;

                        case 'AD_CREATED':
                            await this.telegramBot.sendAdCreatedMessage(job.data.telegramId, job.data);
                            break;

                        case 'AD_TOO_CLOSE':
                            await this.telegramBot.sendAdTooCloseMessage(job.data.telegramId, job.data);
                            break;

                        case 'AD_IN_PAST':
                            await this.telegramBot.sendAdInPastMessage(job.data.telegramId, job.data);
                            break;
                        default: {
                            const _exhaustive: never = job;   // compile error if you add an event type and forget a case
                            console.warn('Unknown telegram event:', _exhaustive);
                        }
                    }
                } catch (err: any) {
                    // user blocked the bot or never started it: retrying will never help
                    if (err?.error_code === 403 || err?.response?.error_code === 403) {
                        console.warn('Cannot message user (blocked/not started):', job.data.telegramId);
                        return;                               // ack and move on
                    }
                    throw err;                                // consume() will nack(requeue=false)
                } finally {
                    timer.end();
                }
            },
            { prefetch: 5 },
        );
    }
}