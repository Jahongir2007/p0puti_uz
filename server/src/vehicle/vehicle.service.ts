import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateVehicleInterface } from './interface/createVehicle.interface.js';
import { UpdateVehicleInterface } from './interface/updateVehicle.interface.js';
import { Temporal } from "@js-temporal/polyfill";

@Injectable()
export class VehicleService {
    async getTelegramUserVehiclesByUserId(userId: bigint){
        console.log("User Id:", userId);
        let userVehicles = await db.orm.public.Vehicles
            .where({
                userId: BigInt(userId),
                deletedAt: null
            })
            .all();

        return userVehicles
    }

    async createTelegramUserVehicle(vehicleData: CreateVehicleInterface, userId: bigint){
        let userVehicle = await db.orm.public.Vehicles
            .select("id")
            .where({
                plateNumber: vehicleData.plateNumber,
                deletedAt: null
            })
            .first();
        
        if(userVehicle){
            return {
                success: true,
                data: {
                    message: "This plate number is already exists"
                }
            }
        }

        let vehicle = await db.orm.public.Vehicles.create({
            userId: BigInt(userId),
            color: vehicleData.color,
            brand: vehicleData.brand,
            plateNumber: vehicleData.plateNumber,
            model: vehicleData.model
        });

        return vehicle;
    }

    async updateTelegramUserVehicle(
        vehicleData: UpdateVehicleInterface,
        userId: bigint,
        vehicleId: bigint,
    ) {
        return await db.transaction(async (tx) => {
            const lockQuery = db.raw.sql`
                SELECT "id"
                FROM "vehicles"
                WHERE "id" = ${vehicleId}
                    AND "user_id" = ${userId}
                FOR UPDATE
            `.returnsRow({
                id: 'pg/int8@1',
            }).build();

            const vehicles = await tx.query(lockQuery);

            if (vehicles.length === 0) {
                return {
                    success: false,
                    data: {
                    message: "User vehicle is not found",
                    },
                };
            }

            const updatedVehicle = await tx.orm.public.Vehicles
            .where({
                id: vehicleId,
            })
            .update({
                brand: vehicleData.brand,
                model: vehicleData.model,
                color: vehicleData.color,
                plateNumber: vehicleData.plateNumber,
            });

            return {
                success: true,
                data: updatedVehicle,
            };
        });
    }

    async deleteTelegramUserVehicle(userId: bigint, vehicleId: bigint){
        return await db.transaction(async (tx) => {
            const lockQuery = db.raw.sql`
                SELECT "id"
                FROM "vehicles"
                WHERE "id" = ${vehicleId}
                    AND "user_id" = ${userId}
                FOR UPDATE
            `.returnsRow({
                id: 'pg/int8@1',
            }).build();

            const vehicles = await tx.query(lockQuery);

            if (vehicles.length === 0) {
                return {
                    success: false,
                    data: {
                    message: "User vehicle is not found",
                    },
                };
            }

            const deletedVehicle = await tx.orm.public.Vehicles
                .where({
                    id: vehicleId,
                    userId: BigInt(userId),
                })
                .update({
                    deletedAt: Temporal.Now.instant()
                });

            return {
                success: true,
                data: deletedVehicle,
            };
        });
    }
}
