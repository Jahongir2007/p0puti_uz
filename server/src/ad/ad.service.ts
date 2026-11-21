import { Injectable } from '@nestjs/common';
import { PostAdInterface } from './interface/postAd.interface.js';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service.js';
import { MetricsService } from '../infrastructure/metrics/metrics.service.js';
import { db } from '../prisma/db.js';
// import { Temporal } from '@js-temporal/polyfill';
import { Temporal } from 'temporal-polyfill';
import { tashkentToInstant, Cursor, encodeCursor, decodeCursor, serialize } from '../utils/helpers.js';
import { not } from '@prisma/orm-postgres/orm-client';
import { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { UpdateAdInterface } from './interface/updateAd.interface.js';
import { AdType } from './enum/adType.enum.js';

@Injectable()
export class AdService {
    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly metrics: MetricsService,
    ){}
    async postTelegramUserAd(adData: PostAdInterface, userId: bigint){
        const postAdForDriver = async (adData: PostAdInterface, userId: bigint) => {
            if(
                adData.vehicleId === undefined || adData.vehicleId === null || 
                adData.allowLuggage === undefined || adData.allowLuggage === null || 
                adData.calculatedArrivalTime === undefined || adData.calculatedArrivalTime === null
            ){
                    return {
                        success: false,
                        code: 'INVALID_INPUT',
                        message: "Make sure all input fields are valid"
                    }
            }
            const timer = this.metrics.start('AdService.postTelegramUserAd.role=driver');
            try{
                adData.userId = userId;
                const departureTime = tashkentToInstant(
                    adData.date,
                    adData.time,
                );

                let arrivalTime = tashkentToInstant(
                    adData.date,
                    adData.calculatedArrivalTime,
                );

                const departureDate = Temporal.PlainDate.from(adData.date)
                    .toZonedDateTime({ timeZone: 'Asia/Tashkent', plainTime: '00:00' })
                    .toInstant();

                if (Temporal.Instant.compare(departureTime, Temporal.Now.instant()) <= 0) {
                    // throw new BadRequestException("Departure time is already passed");
                    return { success: false, code: 'AD_IN_PAST', message: 'Departure time is already passed' }
                }

                // if (Temporal.Instant.compare(arrivalTime, departureTime) <= 0) {
                //     arrivalTime = arrivalTime.add({ hours: 24 });
                // }

                // console.log({
                //     dep: departureDate.constructor.name,
                //     depTime: departureTime.constructor.name,
                //     arr: arrivalTime.constructor.name,
                //     sameClass: departureDate instanceof Temporal.Instant,
                // });

                // console.log(JSON.stringify(adData));

                const t1 = this.metrics.start('AdService.overlapCheck.role=driver');
                const existingAd = await db.orm.public.Ads
                    .where({ userId: BigInt(adData.userId), departureDate })   // equality only
                    .where((ad) => ad.departureTime.lt(arrivalTime))
                    .where((ad) => ad.arrivalTime.gt(departureTime))
                    .first();
                t1.end();
                
                if (existingAd) {
                    // console.log('User already has an ad for the same time range:', existingAd);
                    return { success: false, code: 'AD_DUPLICATE', message: "User already has an ad for the same time range" };
                }

                const t2 = this.metrics.start('AdService.vehicleCheck');
                try{
                    const vehicle = await db.orm.public.Vehicles
                        .where({ 
                            id: BigInt(adData.vehicleId), 
                            userId: BigInt(adData.userId), 
                            deletedAt: null
                        })
                        .first();

                    if(!vehicle){
                        return {
                            success: false,
                            code: 'VEHICLE_NOT_FOUND',
                            message: 'Vehicle not found'
                        }
                    }
                }catch(err: unknown){
                    console.error("Error in AdService.vehicleCheck: ", err);
                    return { success: false, message: "Something went wrong" }
                }finally{
                    t2.end();
                }
    
                const t3 = this.metrics.start('AdService.publish.role=driver');
                await this.rabbitMQ.publish(
                    'ads',
                    {
                        type: 'POST_AD',
                        data: adData
                    }
                )
                t3.end();

                return { success: true, message: "Ad posted successfully" };
            }catch(err: any){
                console.error("Error in AdService.postTelegramUserAd:", err);
                return { success: false, error: err.message };
            }finally{
                timer.end();
            }
        }

        const postAdForPassenger = async (adData: PostAdInterface, userId: bigint) => {
            const timer = this.metrics.start('AdService.postTelegramUserAd.role=passenger');
            try{
                adData.userId = userId;
                const departureTime = tashkentToInstant(
                    adData.date,
                    adData.time,
                );

                const departureDate = Temporal.PlainDate.from(adData.date)
                    .toZonedDateTime({ timeZone: 'Asia/Tashkent', plainTime: '00:00' })
                    .toInstant();

                const t1 = this.metrics.start('AdService.overlapCheck.role=passenger');
                const windowStart = departureTime.subtract({ hours: 1 });
                const windowEnd   = departureTime.add({ hours: 1 });

                const tooClose = await db.orm.public.Ads
                    .where({ userId: BigInt(adData.userId), departureDate })
                    .where((ad) => ad.departureTime.gt(windowStart))
                    .where((ad) => ad.departureTime.lt(windowEnd))
                    .first();
                t1.end();

                if(tooClose){
                    return { success: false, code: 'AD_TOO_CLOSE', message: "User already has an ad for the time less than an hour" };
                }

                const t2 = this.metrics.start('AdService.publish.role=passenger');
                await this.rabbitMQ.publish(
                    'ads',
                    {
                        type: 'POST_AD',
                        data: adData
                    }
                );
                t2.end();

                return { success: true, message: "Ad posted successfully" };
            }catch(err: any){
                console.error("Error in AdService.postTelegramUserAd:", err);
                return { success: false, error: err.message };
            }finally{
                timer.end();
            }
        }

        switch(adData.role){
            case "driver":
                return await postAdForDriver(adData, userId);
            case "passenger":
                return await postAdForPassenger(adData, userId);
        }
    }

    async getLatestAdsForTelegramUser(cursor?: string, limit = 10) {
        const timer = this.metrics.start('AdService.getLatestAdsForTelegramUser');
        try {
            const take = Math.min(Math.max(limit, 1), 50);
            const now = Temporal.Now.instant();

            // Decode the cursor first, so a bad cursor fails before any query runs.
            let after: { t: Temporal.Instant; id: bigint } | undefined;
            if (cursor) {
                const c = decodeCursor(cursor);
                after = { t: Temporal.Instant.from(c.t), id: BigInt(c.id) };
            }

            const ordered = await db.orm.public.Ads
                .where((ad) => ad.departureTime.gt(now))
                .orderBy([
                    (ad) => ad.departureTime.asc(),
                    (ad) => ad.id.asc(),
                ])
                .include('user', (u) =>
                    u.select('firstName', 'lastName', 'username', 'photoUrl', 'phone'),
                )
                .include('vehicle', (v) =>
                    v.select('brand', 'model', 'color', 'plateNumber'),
                )

            // Keyset pagination: .cursor() goes after orderBy. Ascending order means
            // "greater than the cursor". Give a value for EVERY orderBy column,
            // otherwise you get an incomplete keyset.
            const paged = after
                ? ordered.cursor({ departureTime: after.t, id: after.id })
                : ordered;

            const rows = await paged
                .limit(take + 1)   // one extra row tells us if there is a next page
                .all();            // await gives Row[] directly

            const hasMore = rows.length > take;
            const page = hasMore ? rows.slice(0, take) : rows;
            const last = page.at(-1);

            return {
                success: true as const,
                data: serialize(page) as Record<string, unknown>[],
                nextCursor: hasMore && last
                    ? encodeCursor({ t: last.departureTime!.toString(), id: String(last.id) })
                    : null,
            };
        } catch (err: unknown) {
            console.error('Error in AdService.getLatestAdsForTelegramUser:', err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        } finally {
            timer.end();
        }
    }

    async getAdByIdForTelegramUser(id: string){
        const timer = this.metrics.start('AdService.getAdByIdForTelegramUser');
        try{
            if (!/^\d+$/.test(id)) {
                return { success: false as const, error: 'Invalid ad id' };
            }

            const adId = BigInt(id);

            const ad = await db.orm.public.Ads
                .include('user', (u) =>
                    u.select('firstName', 'lastName', 'username', 'photoUrl', 'phone'),
                )
                .where({ id: adId })
                .first();

            if (!ad) {
                return { success: false as const, error: 'Ad not found' };
            }

            const now = Temporal.Now.instant();
            const related = await db.orm.public.Ads
            .where({
                fromLocation: ad.fromLocation,
                toLocation: ad.toLocation,
                type: ad.type,
                status: 'ACTIVE',
            })
            .where((a) => a.id.neq(adId))
            .where((a) => a.departureTime.gte(now))
            .orderBy((a) => a.departureTime.asc())
            .limit(10)
            .all();

            if (related.length < 10) {
                const excludeIds = [adId, ...related.map((a) => a.id)];

                const more = await db.orm.public.Ads
                    .where({
                        fromLocation: ad.fromLocation,
                        type: ad.type,
                        status: 'ACTIVE',
                    })
                    .where((a) => not(a.id.in(excludeIds)))
                    .where((a) => a.departureTime.gte(now))
                    .orderBy((a) => a.departureTime.asc())
                    .limit(10 - related.length)
                    .all();

                related.push(...more);
            }

            console.log("Ad:", ad);
            console.log("related:", related);

            return {
                success: true as const,
                data: serialize({ ad, related }) as { ad: Record<string, unknown>; related: Record<string, unknown>[] },
            };
        }catch(err: unknown){
            console.error('Error in AdService.getAdByIdForTelegramUser:', err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        }finally{
            timer.end();
        }
    }

    async searchAds(
        fromLocation: Varchar<500>,
        toLocation: Varchar<500>,
        date: string,
        passengers: number = 1,
        cursor?: string,
        limit: number = 10,
        type?: AdType
    ) {
        const timer = this.metrics.start('AdService.searchAds');
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return { success: false as const, error: 'Invalid date, expected YYYY-MM-DD' };
            }
            if (cursor && !/^\d+$/.test(cursor)) {
                return { success: false as const, error: 'Invalid cursor' };
            }

            const take = Math.min(Math.max(limit, 1), 50);
            const seats = Math.max(Number(passengers) || 1, 1);

            // whole day in Tashkent time (UTC+5, no DST)
            const dayStart = Temporal.Instant.from(`${date}T00:00:00+05:00`);
            const dayEnd = dayStart.add({ hours: 24 });

            // if searching today, don't show rides that already left
            const now = Temporal.Now.instant();
            const from = Temporal.Instant.compare(now, dayStart) > 0 ? now : dayStart;

            let query = db.orm.public.Ads
                .include('user', (u) =>
                    u.select('firstName', 'lastName', 'username', 'photoUrl', 'phone'),
                )
                .include('vehicle', (v) =>
                    v.select('brand', 'model', 'color', 'plateNumber'),
                )
                .where({
                    fromLocation,
                    toLocation,
                    status: 'ACTIVE',
                })
                .where((a) => a.departureTime.gte(from))
                .where((a) => a.departureTime.lt(dayEnd))
                .where((a) => a.seats.gte(seats));

            if (cursor) {
                const cursorId = BigInt(cursor);
                query = query.where((a) => a.id.gt(cursorId));
            }

            if (type) {
                query = query.where({ type });
            }

            const rows = await query
                .orderBy((a) => a.id.asc())
                .limit(take + 1)
                .all();

            const hasMore = rows.length > take;
            const page = hasMore ? rows.slice(0, take) : rows;
            const lastAd = page.at(-1);

            console.log(
                {
                    success: true as const,
                    data: serialize(page) as Record<string, unknown>[],
                    // BigInt can't go into JSON → send cursor as a string
                    nextCursor: hasMore && lastAd ? String(lastAd.id) : null,
                }
            )

            return {
                success: true as const,
                data: serialize(page) as Record<string, unknown>[],
                // BigInt can't go into JSON → send cursor as a string
                nextCursor: hasMore && lastAd ? String(lastAd.id) : null,
            };
        } catch (err: unknown) {
            console.error('Error in AdService.searchAds:', err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        } finally {
            timer.end();
        }
    }

    async getTelegramUserAds(userId: bigint, cursor?: string, limit: number = 10){
        const timer = this.metrics.start('AdService.getTelegramUserAds');
        try{
            if (cursor && !/^\d+$/.test(cursor)) {
                return { success: false as const, error: 'Invalid cursor' };
            }
            const take = Math.min(Math.max(limit, 1), 50);
            
            let query = db.orm.public.Ads
                .where({
                    userId,
                    status: 'ACTIVE'
                });
            
            if(cursor){
                const cursorId = BigInt(cursor);
                query = query.where((a) => a.id.lt(cursorId));
            }

            const rows = await query
                .orderBy((row) => row.id.desc())
                .limit(take + 1)
                .all();

            const hasMore = take < rows.length;
            const page = hasMore ? rows.slice(0, take) : rows;
            const lastAd = page.at(-1);

            return {
                success: true as const,
                data: serialize(page) as Record<string, unknown>[],
                // BigInt can't go into JSON → send cursor as a string
                nextCursor: hasMore && lastAd ? String(lastAd.id) : null,
            };
        }catch(err: unknown){
            console.error('Error in AdService.getTelegramUserAds:', err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        }finally{
            timer.end();
        }
    }

    async updateTelegramUserAdById(userId: bigint, adId: bigint, updateAdData: UpdateAdInterface){
        const timer = this.metrics.start('AdService.updateTelegramUserAdById');
        try{
            if(updateAdData.price < 0){
                return {
                    success: false as const,
                    error: "VALIDATION_ERROR"
                };
            }

            updateAdData.id = adId;
            updateAdData.userId = userId;

            await this.rabbitMQ.publish(
                'ads',
                {
                    type: 'UPDATE_AD',
                    data: updateAdData
                }
            );

            return {
                success: true as const,
                message: "Update ad job is queued"
            }
        }catch(err: unknown){
            console.error('Error in updateTelegramUserAdById', err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        }finally{
            timer.end();
        }
    }

    async deleteTelegramUserAdById(userId: bigint, adId: bigint){
        const timer = this.metrics.start("AdService.deleteTelegramUserAdById");
        try{
            const deleteAdDate = { id: adId, userId }

            await this.rabbitMQ.publish('ads', {
                type: "DELETE_AD",
                data: deleteAdDate
            });

            return {
                success: true as const,
                message: "Delete ad job is queued"
            }
        }catch(err: unknown){
            console.error("Error in deleteTelegramUserAdById", err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        }finally{
            timer.end();
        }
    }
}
