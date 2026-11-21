import {
    Injectable,
    OnModuleInit,
} from '@nestjs/common';

import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service.js';
import { MetricsService } from '../../infrastructure/metrics/metrics.service.js';
import { db } from '../../prisma/db.js';
import { PostAdJobInterface } from './interface/postAd.job.interface.js';
import { tashkentToInstant } from '../../utils/helpers.js';
import { Temporal } from 'temporal-polyfill';
import { TelegramEventJob } from '../../infrastructure/telegram/telegramEvent.interface.js';
import { UpdateAdJobInterface } from './interface/updateAd.job.interface.js';
import { AdJob } from './type/adJob.type.js';
import { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { DeleteAdJobInterface } from './interface/deleteAd.job.interface.js';

@Injectable()
export class AdWorker implements OnModuleInit {

    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly metrics: MetricsService,
    ) {}

    async onModuleInit() {
        await this.rabbitMQ.consume('ads', async (job: AdJob) => {
            switch(job.type){
                case 'POST_AD':
                    return job.data.role === 'driver'
                        ? this.handlePostDriver(job)
                        : this.handlePostPassenger(job);
                case 'UPDATE_AD':
                    return this.handleUpdateAd(job);
                case 'DELETE_AD':
                    return this.handleDeleteAd(job);
                default: {
                    const unhandled: never = job;
                    console.error('Unknown ad job:', unhandled);
                }
            }
        });
    }

    private async handlePostDriver(job: PostAdJobInterface){
        const user = await db.orm.public.Users
            .where({ id: BigInt(job.data.userId) })
            .first();
        // console.log(
        //     'Processing Telegram ad:',
        //     job.data,
        // );
        const departureTime = tashkentToInstant(
            job.data.date,
            job.data.time,
        );
                    
        let arrivalTime = tashkentToInstant(
            job.data.date,
            job.data.calculatedArrivalTime,
        );
                    
        const departureDate = Temporal.PlainDate.from(job.data.date)
            .toZonedDateTime({ timeZone: 'Asia/Tashkent', plainTime: '00:00' })
            .toInstant();
                    
        // console.log({
        //     dep: departureDate.constructor.name,
        //     depTime: departureTime.constructor.name,
        //     arr: arrivalTime.constructor.name,
        //     sameClass: departureDate instanceof Temporal.Instant,
        // });

        const vehicle = await db.orm.public.Vehicles
            .where({ id: BigInt(job.data.vehicleId), userId: BigInt(job.data.userId), deletedAt: null})
            .first();

        if(!vehicle){
            console.warn(`POST_AD: vehicle ${job.data.vehicleId} is not an active vehicle of user ${job.data.userId}`);
            return;
        }

        if (Temporal.Instant.compare(departureTime, Temporal.Now.instant()) <= 0) {
            // throw new BadRequestException("Departure time is already passed");
            await this.rabbitMQ.publish('telegram_events', {
                type: 'AD_IN_PAST',
                data: {
                    telegramId: String(user?.telegramId),
                    from: job.data.from,
                    to: job.data.to,
                    date: job.data.date,
                    time: job.data.time
                },
            } satisfies TelegramEventJob);
            return;
        }

        if (Temporal.Instant.compare(arrivalTime, departureTime) <= 0) {
            arrivalTime = arrivalTime.add({ hours: 24 });
        }

        const timer = this.metrics.start('AdWorker.onModuleInit.POST_AD.role=driver');
            try{
                const existingAd = await db.orm.public.Ads
                    .where({ userId: BigInt(job.data.userId), departureDate })   // equality only
                    .where((ad) => ad.departureTime.lt(arrivalTime))
                    .where((ad) => ad.arrivalTime.gt(departureTime))
                    // .include('user')
                    .first();
                    
                    if (existingAd) {
                        // console.log('User already has an ad for the same time range:', existingAd);
                        await this.rabbitMQ.publish('telegram_events', {
                            type: 'AD_DUPLICATE',
                            data: {
                                telegramId: String(user?.telegramId),
                                from: job.data.from,
                                to: job.data.to,
                                date: job.data.date,
                                time: job.data.time,
                                arrivalTime: job.data.calculatedArrivalTime,
                            },
                        } satisfies TelegramEventJob);
                        return;
                    }

                    const newAd = await db.orm.public.Ads.create({
                        type: job.data.role.toUpperCase() as "DRIVER" | "PASSENGER",
                        userId: BigInt(job.data.userId),
                        departureDate,
                        departureTime,
                        arrivalTime,
                        fromLocation: job.data.from,
                        toLocation: job.data.to,
                        price: job.data.price,
                        seats: job.data.seats,
                        description: job.data.note,
                        vehicleId: BigInt(job.data.vehicleId),
                        // carModel: job.data.carModel,
                        luggageAllowed: job.data.allowLuggage,
                        // estimatedDurationHours: job.data.estimatedDurationHours,
                        // estimatedDurationMinutes: job.data.estimatedDurationMinutes,
                    });

            await this.rabbitMQ.publish('telegram_events', {
                type: 'AD_CREATED',
                data: {
                    telegramId: String(user?.telegramId),
                    adId: String(newAd.id),              // BigInt -> string
                    from: job.data.from,
                    to: job.data.to,
                    date: job.data.date,
                    time: job.data.time,
                },
            } satisfies TelegramEventJob);
        }catch(err: any){
            console.error("Error in AdWorker.onModuleInit.POST_AD.role=driver:", err);
        }finally{
            timer.end();
        }
    }

    private async handlePostPassenger(job: PostAdJobInterface){
        const timer = this.metrics.start('AdWorker.onModuleInit.POST_AD.role=passenger');
        try{
            const user = await db.orm.public.Users
                .where({ id: BigInt(job.data.userId) })
                .first();
            // console.log("Job data:", job.data);s
            const departureTime = tashkentToInstant(
                job.data.date,
                job.data.time,
            );

            if(Temporal.Instant.compare(departureTime, Temporal.Now.instant()) <= 0){
                await this.rabbitMQ.publish('telegram_events', {
                    type: 'AD_IN_PAST',
                    data: {
                        telegramId: String(user?.telegramId),
                        from: job.data.from,
                        to: job.data.to,
                        date: job.data.date,
                        time: job.data.time
                    },
                } satisfies TelegramEventJob);
                return;
            }

            const departureDate = Temporal.PlainDate.from(job.data.date)
                .toZonedDateTime({ timeZone: 'Asia/Tashkent', plainTime: '00:00' })
                .toInstant();

            const windowStart = departureTime.subtract({ hours: 1 });
            const windowEnd   = departureTime.add({ hours: 1 });

            const tooClose = await db.orm.public.Ads
                .where({ userId: BigInt(job.data.userId) })
                .where((ad) => ad.departureTime.gt(windowStart))
                .where((ad) => ad.departureTime.lt(windowEnd))
                .first();

            if (tooClose) {
                // throw new Error('You must leave at least 1 hour between your ads.');
                await this.rabbitMQ.publish("telegram_events", {
                    type: 'AD_TOO_CLOSE',
                    data: {
                        telegramId: String(user?.telegramId),
                        from: job.data.from,
                        to: job.data.to,
                        date: job.data.date,
                        time: job.data.time,
                        // arrivalTime: job.data.calculatedArrivalTime,
                    },
                })
                return;
            }

            const newAd = await db.orm.public.Ads.create({
                type: job.data.role.toUpperCase() as "DRIVER" | "PASSENGER",
                userId: BigInt(job.data.userId),
                departureDate,
                departureTime,
                fromLocation: job.data.from,
                toLocation: job.data.to,
                price: job.data.price,
                seats: job.data.seats,
                description: job.data.note,
                luggageAllowed: false
                // vehicleId: BigInt(job.data.vehicleId),
                // carModel: job.data.carModel,
                // luggageAllowed: job.data.allowLuggage,
                // estimatedDurationHours: job.data.estimatedDurationHours,
                // estimatedDurationMinutes: job.data.estimatedDurationMinutes,
            });

            await this.rabbitMQ.publish('telegram_events', {
                type: 'AD_CREATED',
                data: {
                    telegramId: String(user?.telegramId),
                    adId: String(newAd.id),              // BigInt -> string
                    from: job.data.from,
                    to: job.data.to,
                    date: job.data.date,
                    time: job.data.time,
                },
            } satisfies TelegramEventJob);
        }catch(err: any){
            console.error("Error in AdWorker.onModuleInit.POST_AD.role=passenger:", err);
        }finally{
            timer.end();
        }
    }

    private async handleUpdateAd(job: UpdateAdJobInterface){
        const timer = this.metrics.start("AdWorker.UPDATE_AD");
        try{
            const adId = BigInt(job.data.id);
            const userId = BigInt(job.data.userId);
            
            const ad = await db.orm.public.Ads
                .where({ id: adId, userId, status: 'ACTIVE' })
                .first();

            if (!ad) {
                console.warn(`UPDATE_AD: ad ${adId} not found for user ${userId}`);
                return;
            }

            if (Temporal.Instant.compare(ad.departureTime, Temporal.Now.instant()) <= 0) {
                console.warn(`UPDATE_AD: ad ${adId} has already departed`);
                return;
            }

            const updated = await db.orm.public.Ads
                .where({ id: adId, userId })
                .update({
                    price: job.data.price,
                    seats: job.data.seats,
                    description: job.data.description as Varchar<1000>,
                });

            if (!updated) {
                console.warn(`UPDATE_AD: ad ${adId} was not updated`);
            }
        }catch(err: unknown){
            console.error("Error in AdWorker.onModuleInit.UPDATE_AD", err);
        }finally{
            timer.end();
        } 
    }

    private async handleDeleteAd(job: DeleteAdJobInterface){
        const timer = this.metrics.start("AdWorker.DELETE_AD");
        try{
            const adId = BigInt(job.data.id);
            const userId = BigInt(job.data.userId);

            const ad = await db.orm.public.Ads
                .where({ id: adId, userId, status: 'ACTIVE' })
                .first();

            if(!ad){
                console.warn(`DELETE_AD: ad ${adId} for user ${userId} not found`);
                return;
            }
            const deleted = await db.orm.public.Ads
                .where({ id: adId, userId, status: 'ACTIVE' })
                .update({
                    status: "CANCELLED",
                    deletedAt: Temporal.Now.instant()
                });
            
            if(!deleted){
                console.warn(`DELETE_AD: ad ${adId} was not deleted`);
            }
        }catch(err: unknown){
            console.error("Error in AdWorker.onModuleInit.DELETE_AD", err);
        }finally{
            timer.end();
        }
    }
}