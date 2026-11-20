import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateAdDto {
    @IsNotEmpty()
    @IsNumber()
    price: number

    @IsNotEmpty()
    @IsNumber()
    seats: number

    @Transform(trim)
    @IsOptional()
    @IsString()
    description: string 
}