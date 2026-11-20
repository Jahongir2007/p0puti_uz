ALTER TABLE "vehicles"
DROP CONSTRAINT "uq_vehicles_plate_number";

CREATE UNIQUE INDEX "uq_vehicles_active_plate_number"
ON "vehicles" ("plate_number")
WHERE "deleted_at" IS NULL;