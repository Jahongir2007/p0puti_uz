import { Varchar } from "@prisma/orm-postgres/target/codec-types"

export type SearchAdsByFromLocationAndToLocationType = {
    fromLocation: Varchar<500>,
    toLocation: Varchar<500>,
    id?: object
}