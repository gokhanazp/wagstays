-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "extrasCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "petCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "priceLines" JSONB;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "additionalPetPriceCents" INTEGER,
ADD COLUMN     "holidayPriceCents" INTEGER,
ADD COLUMN     "maxPetsPerBooking" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "puppyPriceCents" INTEGER;

-- CreateTable
CREATE TABLE "BookingPet" (
    "bookingId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,

    CONSTRAINT "BookingPet_pkey" PRIMARY KEY ("bookingId","petId")
);

-- CreateIndex
CREATE INDEX "BookingPet_petId_idx" ON "BookingPet"("petId");

-- AddForeignKey
ALTER TABLE "BookingPet" ADD CONSTRAINT "BookingPet_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPet" ADD CONSTRAINT "BookingPet_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "BookingPet" ENABLE ROW LEVEL SECURITY;

-- Existing bookings: their single pet becomes the booking's pet list.
INSERT INTO "BookingPet" ("bookingId", "petId") SELECT "id", "petId" FROM "Booking" ON CONFLICT DO NOTHING;
