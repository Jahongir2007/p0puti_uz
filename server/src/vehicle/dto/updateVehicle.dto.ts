import { IsString, IsNotEmpty } from "class-validator";
import { Transform } from 'class-transformer';
import type { Varchar } from "@prisma/orm-postgres/target/codec-types"

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateVehicleDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  brand: Varchar<100>;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  model: Varchar<100>;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  color: Varchar<50>;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  plateNumber: Varchar<20>;
}