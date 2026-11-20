import { Varchar } from "@prisma/orm-postgres/target/codec-types"

export interface CreateVehicleInterface {
    brand: Varchar<100>,
    model: Varchar<100>,
    color: Varchar<50>,
    plateNumber: Varchar<20>
}