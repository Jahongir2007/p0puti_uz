import { IsString, IsNotEmpty, IsIn, IsInt, IsOptional, IsBoolean, Matches, Min, Max, MaxLength } from "class-validator";
import { Transform } from 'class-transformer';
import type { Varchar, Timestamptz } from "@prisma/orm-postgres/target/codec-types";

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Same limits as the mini app's form: 1–8 seats, a price up to 10 million so'm
export const MAX_SEATS = 8;
export const MAX_PRICE = 10_000_000;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // YYYY-MM-DD
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;                     // HH:mm, 00:00–23:59

export class PostAdDto {
    @IsIn(["driver", "passenger"])
    role: "driver" | "passenger";

    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    from: Varchar<100>

    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    to: Varchar<100>

    @Transform(trim)
    @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
    date: Timestamptz

    @Transform(trim)
    @Matches(TIME, { message: 'time must be HH:mm (00:00–23:59)' })
    time: Timestamptz

    @IsInt()
    @Min(0)
    @Max(MAX_PRICE)
    price: number

    @IsInt()
    @Min(1)
    @Max(MAX_SEATS)
    seats: number

    @Transform(trim)
    @IsString()
    @MaxLength(1000)
    note: Varchar<1000>

    @IsOptional()
    @IsInt()
    @Min(1)
    vehicleId: number

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MaxLength(200)
    carModel: string

    @IsOptional()
    @IsBoolean()
    allowLuggage: boolean

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(48)
    estimatedDurationHours: number

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(59)
    estimatedDurationMinutes: number

    @IsOptional()
    @Matches(TIME, { message: 'calculatedArrivalTime must be HH:mm (00:00–23:59)' })
    calculatedArrivalTime: Timestamptz

    @IsOptional()
    @IsBoolean()
    allowGroupJoin: boolean
}