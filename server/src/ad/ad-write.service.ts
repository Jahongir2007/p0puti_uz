import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Temporal } from 'temporal-polyfill';
import { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { db } from '../prisma/db.js';
import { tashkentToInstant } from '../utils/helpers.js';
import { PostAdInterface } from './interface/postAd.interface.js';

// ---------- AD_WRITE_MODE ----------

// sync:  the API saves ads itself and answers with the real result.
// async: the API checks the ad, then a worker saves it from the `ads` queue.
export type AdWriteMode = 'sync' | 'async';

export function readAdWriteMode(config: ConfigService): AdWriteMode {
    const mode = config.get<string>('AD_WRITE_MODE') ?? 'async';
    if (mode !== 'sync' && mode !== 'async') {
        throw new Error(`AD_WRITE_MODE must be "sync" or "async", got "${mode}"`);
    }
    return mode;
}

// ---------- results ----------

export type AdErrorCode =
    | 'INVALID_INPUT'
    | 'AD_IN_PAST'
    | 'VEHICLE_NOT_FOUND'
    | 'AD_DUPLICATE'
    | 'AD_TOO_CLOSE'
    | 'AD_NOT_FOUND'
    | 'AD_DEPARTED';

export type AdError = { success: false; code: AdErrorCode; message: string };

const fail = (code: AdErrorCode, message: string): AdError => ({ success: false, code, message });

// An ad to create: the request body plus the author's id
export type NewAd = PostAdInterface & { userId: bigint | string };

// The database, or a transaction (both have `.orm`)
type Queryable = Pick<typeof db, 'orm'>;

@Injectable()
export class AdWriteService {
    // All the rules for a new ad. Read-only, so the API can run it before queueing.
    async check(ad: NewAd, q: Queryable = db): Promise<AdError | null> {
        const isDriver = ad.role === 'driver';

        if (isDriver && (ad.vehicleId == null || ad.allowLuggage == null || ad.calculatedArrivalTime == null)) {
            return fail('INVALID_INPUT', 'Make sure all input fields are valid');
        }

        let times: ReturnType<typeof this.times>;
        try {
            times = this.times(ad);
        } catch {
            return fail('INVALID_INPUT', 'Invalid date or time');
        }
        const { departureTime, arrivalTime } = times;

        if (Temporal.Instant.compare(departureTime, Temporal.Now.instant()) <= 0) {
            return fail('AD_IN_PAST', 'Departure time is already passed');
        }

        const userId = BigInt(ad.userId);

        if (isDriver) {
            const vehicle = await q.orm.public.Vehicles
                .where({ id: BigInt(ad.vehicleId), userId, deletedAt: null })
                .first();
            if (!vehicle) return fail('VEHICLE_NOT_FOUND', 'Vehicle not found');

            // Only ACTIVE ads count: a cancelled ad must not block posting the same trip again
            const overlapping = await q.orm.public.Ads
                .where({ userId, status: 'ACTIVE' })
                .where((a) => a.departureTime.lt(arrivalTime!))
                .where((a) => a.arrivalTime.gt(departureTime))
                .first();
            if (overlapping) return fail('AD_DUPLICATE', 'User already has an ad for the same time range');
        } else {
            const tooClose = await q.orm.public.Ads
                .where({ userId, status: 'ACTIVE' })
                .where((a) => a.departureTime.gt(departureTime.subtract({ hours: 1 })))
                .where((a) => a.departureTime.lt(departureTime.add({ hours: 1 })))
                .first();
            if (tooClose) return fail('AD_TOO_CLOSE', 'User already has an ad for the time less than an hour');
        }

        return null;
    }

    async create(ad: NewAd): Promise<{ success: true; adId: bigint } | AdError> {
        return db.transaction(async (tx) => {
            // Lock the user's row. If the same user posts twice at once (a double tap),
            // the second request waits here until the first has saved, then sees it as a duplicate.
            const lockUser = db.raw.sql`
                SELECT "id" FROM "users" WHERE "id" = ${BigInt(ad.userId)} FOR UPDATE
            `.returnsRow({ id: 'pg/int8@1' }).build();
            await tx.query(lockUser);

            const problem = await this.check(ad, tx);
            if (problem) return problem;

            const { departureDate, departureTime, arrivalTime } = this.times(ad);
            const isDriver = ad.role === 'driver';

            const created = await tx.orm.public.Ads.create({
                type: isDriver ? 'DRIVER' : 'PASSENGER',
                userId: BigInt(ad.userId),
                departureDate,
                departureTime,
                // The request allows 100 characters, the column 500: always fits
                fromLocation: ad.from as string as Varchar<500>,
                toLocation: ad.to as string as Varchar<500>,
                price: ad.price,
                seats: ad.seats,
                description: ad.note,
                ...(isDriver
                    ? { arrivalTime, vehicleId: BigInt(ad.vehicleId), luggageAllowed: ad.allowLuggage }
                    : { luggageAllowed: false }),
            });

            return { success: true as const, adId: created.id };
        });
    }

    async update(
        userId: bigint,
        adId: bigint,
        changes: { price: number; seats: number; description?: string },
    ): Promise<{ success: true } | AdError> {
        const ad = await db.orm.public.Ads.where({ id: adId, userId, status: 'ACTIVE' }).first();
        if (!ad) return fail('AD_NOT_FOUND', 'Ad not found');

        if (ad.departureTime && Temporal.Instant.compare(ad.departureTime, Temporal.Now.instant()) <= 0) {
            return fail('AD_DEPARTED', 'Ad has already departed');
        }

        const updated = await db.orm.public.Ads
            .where({ id: adId, userId, status: 'ACTIVE' })
            .update({
                price: changes.price,
                seats: changes.seats,
                ...(changes.description !== undefined && { description: changes.description as Varchar<1000> }),
                updatedAt: Temporal.Now.instant(),
            });

        return updated ? { success: true as const } : fail('AD_NOT_FOUND', 'Ad not found');
    }

    async cancel(userId: bigint, adId: bigint): Promise<{ success: true } | AdError> {
        const cancelled = await db.orm.public.Ads
            .where({ id: adId, userId, status: 'ACTIVE' })
            .update({ status: 'CANCELLED', deletedAt: Temporal.Now.instant() });

        return cancelled ? { success: true as const } : fail('AD_NOT_FOUND', 'Ad not found');
    }

    // Tashkent date + "HH:mm" → instants. Arrival earlier than departure means the next day.
    private times(ad: NewAd) {
        const departureDate = Temporal.PlainDate.from(ad.date)
            .toZonedDateTime({ timeZone: 'Asia/Tashkent', plainTime: '00:00' })
            .toInstant();
        const departureTime = tashkentToInstant(ad.date, ad.time);

        let arrivalTime = ad.calculatedArrivalTime ? tashkentToInstant(ad.date, ad.calculatedArrivalTime) : undefined;
        if (arrivalTime && Temporal.Instant.compare(arrivalTime, departureTime) <= 0) {
            arrivalTime = arrivalTime.add({ hours: 24 });
        }

        return { departureDate, departureTime, arrivalTime };
    }
}