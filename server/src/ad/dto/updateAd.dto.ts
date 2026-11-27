import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from "class-validator";
import { Transform } from 'class-transformer';
import { MAX_PRICE, MAX_SEATS } from './postAd.dto.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateAdDto {
    @IsInt()
    @Min(0)
    @Max(MAX_PRICE)
    price: number

    @IsInt()
    @Min(1)
    @Max(MAX_SEATS)
    seats: number

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description: string
}