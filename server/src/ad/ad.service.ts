import { Injectable } from '@nestjs/common';
import { PostAdInterface } from './interface/postAd.interface.js';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service.js';
import { MetricsService } from '../infrastructure/metrics/metrics.service.js';
import { db } from '../prisma/db.js';
// import { Temporal } from '@js-temporal/polyfill';
import { Temporal } from 'temporal-polyfill';
import { encodeCursor, decodeCursor, serialize } from '../utils/helpers.js';
import { not } from '@prisma/orm-postgres/orm-client';
import { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { UpdateAdInterface } from './interface/updateAd.interface.js';
import { AdType } from './enum/adType.enum.js';
import { AdWriteMode, AdWriteService, readAdWriteMode, NewAd } from './ad-write.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdService {
    private readonly mode: AdWriteMode

    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly metrics: MetricsService,
        private readonly adWrite: AdWriteService,
        config: ConfigService
    ){
        this.mode = readAdWriteMode(config);
        console.log(`Ads are saved in ${this.mode} mode`);
    }

    async postTelegramUserAd(adData: PostAdInterface, userId: bigint){
        const timer = this.metrics.start(`AdService.postTelegramUserAd.mode=${this.mode}`);
        try{
            const ad: NewAd = { ...adData, userId };

            if (this.mode === 'sync') {
                const result = await this.adWrite.create(ad);
                if (!result.success) return result;
                return { success: true, queued: false, message: 'Ad posted', data: { id: String(result.adId) } };
            }

            // async: check now so the user gets an answer right away, then let the worker save it
            const problem = await this.adWrite.check(ad);
            if (problem) return problem;

            await this.rabbitMQ.publish('ads', { type: 'POST_AD', data: ad });
            return { success: true, queued: true, message: 'Ad queued' };
        }catch(err: unknown){
            console.error('Error in AdService.postTelegramUserAd:', err);
            return { success: false, message: 'Something went wrong' };
        }finally{
            timer.end();
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
                .where({ status: 'ACTIVE' })
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
        type?: AdType,
        time?: string
    ) {
        const timer = this.metrics.start('AdService.searchAds');
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return { success: false as const, error: 'Invalid date, expected YYYY-MM-DD' };
            }
            if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
                return { success: false as const, error: 'Invalid time, expected HH:MM' };
            }
            if (cursor && !/^\d+$/.test(cursor)) {
                return { success: false as const, error: 'Invalid cursor' };
            }

            const take = Math.min(Math.max(limit, 1), 50);
            const seats = Math.max(Number(passengers) || 1, 1);

            // whole day in Tashkent time (UTC+5, no DST)
            const dayStart = Temporal.Instant.from(`${date}T00:00:00+05:00`);
            const dayEnd = dayStart.add({ hours: 24 });

            const start = time ? Temporal.Instant.from(`${date}T${time}:00+05:00`) : dayStart;
            // if searching today, don't show rides that already left
            const now = Temporal.Now.instant();
            const from = Temporal.Instant.compare(now, start) > 0 ? now : start;

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
        const timer = this.metrics.start(`AdService.updateTelegramUserAdById.mode=${this.mode}`);
        try{
            if(updateAdData.price < 0){
                return { success: false as const, error: "VALIDATION_ERROR" };
            }

            if (this.mode === 'sync') {
                return await this.adWrite.update(userId, adId, updateAdData);
            }

            await this.rabbitMQ.publish('ads', {
                type: 'UPDATE_AD',
                data: { ...updateAdData, id: adId, userId },
            });
            return { success: true as const, queued: true, message: "Update ad job is queued" };
        }catch(err: unknown){
            console.error('Error in updateTelegramUserAdById', err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        }finally{
            timer.end();
        }
    }

    async deleteTelegramUserAdById(userId: bigint, adId: bigint){
        const timer = this.metrics.start(`AdService.deleteTelegramUserAdById.mode=${this.mode}`);
        try{
            if (this.mode === 'sync') {
                return await this.adWrite.cancel(userId, adId);
            }

            await this.rabbitMQ.publish('ads', {
                type: "DELETE_AD",
                data: { id: adId, userId },
            });
            return { success: true as const, queued: true, message: "Delete ad job is queued" };
        }catch(err: unknown){
            console.error("Error in deleteTelegramUserAdById", err);
            return { success: false as const, error: err instanceof Error ? err.message : String(err) };
        }finally{
            timer.end();
        }
    }
}
