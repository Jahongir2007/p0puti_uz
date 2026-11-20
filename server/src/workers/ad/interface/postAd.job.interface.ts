import { Varchar, Timestamptz } from "@prisma/orm-postgres/target/codec-types"

export interface PostAdJobInterface {
    type: 'POST_AD',
    data: {
        role: "driver" | "passenger",
        from: Varchar<500>,
        to: Varchar<500>,
        date: Timestamptz,
        time: Timestamptz,
        price: number,
        seats: number,
        note: Varchar<1000>,
        vehicleId: number,
        carModel?: string | undefined,
        allowLuggage: boolean
        estimatedDurationHours?: number | undefined,
        estimatedDurationMinutes?: number | undefined,
        calculatedArrivalTime: Timestamptz
        allowGroupJoin?: boolean,
        userId: bigint,
    }
}