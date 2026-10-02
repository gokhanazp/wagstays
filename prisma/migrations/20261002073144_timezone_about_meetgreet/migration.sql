-- AlterTable
ALTER TABLE "SitterProfile" ADD COLUMN "about" TEXT;
ALTER TABLE "SitterProfile" ADD COLUMN "residentPetName" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "recurringWeekly" BOOLEAN NOT NULL DEFAULT false,
    "meetAndGreet" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "meetingAddress" TEXT,
    "leashPreference" TEXT,
    "otherAnimalsReaction" TEXT,
    "feedingRules" TEXT,
    "notes" TEXT,
    "gpsUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "vetClinic" TEXT,
    "vetPhone" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "protectionFeeCents" INTEGER NOT NULL DEFAULT 0,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("cardBrand", "cardLast4", "createdAt", "discountCents", "emergencyName", "emergencyPhone", "endAt", "feedingRules", "gpsUpdates", "id", "leashPreference", "meetingAddress", "notes", "otherAnimalsReaction", "ownerId", "petId", "protectionFeeCents", "recurringWeekly", "serviceFeeCents", "serviceId", "sitterId", "startAt", "status", "subtotalCents", "taxCents", "totalCents", "vetClinic", "vetPhone") SELECT "cardBrand", "cardLast4", "createdAt", "discountCents", "emergencyName", "emergencyPhone", "endAt", "feedingRules", "gpsUpdates", "id", "leashPreference", "meetingAddress", "notes", "otherAnimalsReaction", "ownerId", "petId", "protectionFeeCents", "recurringWeekly", "serviceFeeCents", "serviceId", "sitterId", "startAt", "status", "subtotalCents", "taxCents", "totalCents", "vetClinic", "vetPhone" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "taxRateBps" INTEGER NOT NULL DEFAULT 1300,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_City" ("createdAt", "currency", "id", "isActive", "lat", "lng", "name", "province", "provinceCode", "slug", "taxRateBps") SELECT "createdAt", "currency", "id", "isActive", "lat", "lng", "name", "province", "provinceCode", "slug", "taxRateBps" FROM "City";
DROP TABLE "City";
ALTER TABLE "new_City" RENAME TO "City";
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
