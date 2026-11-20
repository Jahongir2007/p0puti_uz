import { Varchar, Timestamptz } from "@prisma/orm-postgres/target/codec-types"

export interface PostAdInterface {
    role: "driver" | "passenger",
    from: Varchar<100>,
    to: Varchar<100>,
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
    calculatedArrivalTime?: Timestamptz | undefined
    allowGroupJoin?: boolean,
    userId?: bigint,
}