import { IsString, IsNotEmpty, IsIn, IsInt, IsOptional, IsBoolean } from "class-validator";
import { Transform } from 'class-transformer';
import type { Varchar, Timestamptz } from "@prisma/orm-postgres/target/codec-types";

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PostAdDto {
    @IsIn(["driver", "passenger"])
    role: "driver" | "passenger";

    @Transform(trim)
    @IsNotEmpty()
    @IsString()
    from: Varchar<100>

    @Transform(trim)
    @IsNotEmpty()
    @IsString()
    to: Varchar<100>

    @Transform(trim)
    @IsNotEmpty()
    @IsString()
    date: Timestamptz

    @Transform(trim)
    @IsNotEmpty()
    @IsString()
    time: Timestamptz

    @Transform(trim)
    @IsNotEmpty()
    @IsInt()
    price: number

    @Transform(trim)
    @IsNotEmpty()
    @IsInt()
    seats: number

    @Transform(trim)
    @IsString()
    note: Varchar<1000>

    @IsOptional()
    @Transform(trim)
    // @IsNotEmpty()
    @IsInt()
    vehicleId: number

    @Transform(trim)
    @IsOptional()
    @IsString()
    carModel: string

    @IsOptional()
    @IsBoolean()
    // @IsNotEmpty()
    allowLuggage: boolean

    @IsOptional()
    @IsInt()
    @IsInt()
    estimatedDurationHours: number

    @IsOptional()
    @IsInt()
    @IsInt()
    estimatedDurationMinutes: number

    @IsOptional()
    @IsString()
    // @IsNotEmpty()
    calculatedArrivalTime: Timestamptz

    @IsOptional()
    @IsBoolean()
    allowGroupJoin: boolean
}