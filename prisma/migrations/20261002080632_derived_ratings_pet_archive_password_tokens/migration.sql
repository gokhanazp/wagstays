-- AlterTable
ALTER TABLE "Pet" ADD COLUMN "archivedAt" DATETIME;

-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SitterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "about" TEXT,
    "residentPetName" TEXT,
    "cityId" TEXT NOT NULL,
    "neighbourhoodId" TEXT NOT NULL,
    "locationNote" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "serviceRadiusKm" REAL NOT NULL DEFAULT 3,
    "serviceAreaNote" TEXT,
    "avatarUrl" TEXT NOT NULL,
    "cardPhotoUrl" TEXT,
    "mapPhotoUrl" TEXT,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "isSuperSitter" BOOLEAN NOT NULL DEFAULT false,
    "instantBook" BOOLEAN NOT NULL DEFAULT false,
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "backgroundChecked" BOOLEAN NOT NULL DEFAULT false,
    "firstAidCertified" BOOLEAN NOT NULL DEFAULT false,
    "vetKnowledge" BOOLEAN NOT NULL DEFAULT false,
    "professionalTrainer" BOOLEAN NOT NULL DEFAULT false,
    "responseTimeMins" INTEGER NOT NULL DEFAULT 60,
    "repeatClientPct" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "importedReviewCount" INTEGER NOT NULL DEFAULT 0,
    "importedRating" REAL NOT NULL DEFAULT 0,
    "ratingCommunication" REAL NOT NULL DEFAULT 0,
    "ratingReliability" REAL NOT NULL DEFAULT 0,
    "ratingCare" REAL NOT NULL DEFAULT 0,
    "completedBookings" INTEGER NOT NULL DEFAULT 0,
    "homeType" TEXT,
    "homeTitle" TEXT,
    "homeNote" TEXT,
    "hasYard" BOOLEAN NOT NULL DEFAULT false,
    "smokeFree" BOOLEAN NOT NULL DEFAULT true,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "hasOtherPets" BOOLEAN NOT NULL DEFAULT false,
    "otherPetsNote" TEXT,
    "acceptsSmall" BOOLEAN NOT NULL DEFAULT true,
    "acceptsMedium" BOOLEAN NOT NULL DEFAULT true,
    "acceptsLarge" BOOLEAN NOT NULL DEFAULT false,
    "acceptsGiant" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredBadge" TEXT,
    "featuredBadgeIcon" TEXT,
    "credential" TEXT,
    "highlight" TEXT,
    "highlightIcon" TEXT,
    "quote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SitterProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SitterProfile_neighbourhoodId_fkey" FOREIGN KEY ("neighbourhoodId") REFERENCES "Neighbourhood" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SitterProfile" ("about", "acceptsGiant", "acceptsLarge", "acceptsMedium", "acceptsSmall", "avatarUrl", "backgroundChecked", "bio", "cardPhotoUrl", "cityId", "completedBookings", "createdAt", "credential", "displayName", "featured", "featuredBadge", "featuredBadgeIcon", "firstAidCertified", "hasChildren", "hasOtherPets", "hasYard", "headline", "highlight", "highlightIcon", "homeNote", "homeTitle", "homeType", "id", "idVerified", "instantBook", "isSuperSitter", "lat", "lng", "locationNote", "mapPhotoUrl", "neighbourhoodId", "otherPetsNote", "professionalTrainer", "quote", "rating", "ratingCare", "ratingCommunication", "ratingReliability", "repeatClientPct", "residentPetName", "responseTimeMins", "reviewCount", "serviceAreaNote", "serviceRadiusKm", "slug", "smokeFree", "status", "userId", "vetKnowledge", "yearsExperience") SELECT "about", "acceptsGiant", "acceptsLarge", "acceptsMedium", "acceptsSmall", "avatarUrl", "backgroundChecked", "bio", "cardPhotoUrl", "cityId", "completedBookings", "createdAt", "credential", "displayName", "featured", "featuredBadge", "featuredBadgeIcon", "firstAidCertified", "hasChildren", "hasOtherPets", "hasYard", "headline", "highlight", "highlightIcon", "homeNote", "homeTitle", "homeType", "id", "idVerified", "instantBook", "isSuperSitter", "lat", "lng", "locationNote", "mapPhotoUrl", "neighbourhoodId", "otherPetsNote", "professionalTrainer", "quote", "rating", "ratingCare", "ratingCommunication", "ratingReliability", "repeatClientPct", "residentPetName", "responseTimeMins", "reviewCount", "serviceAreaNote", "serviceRadiusKm", "slug", "smokeFree", "status", "userId", "vetKnowledge", "yearsExperience" FROM "SitterProfile";
DROP TABLE "SitterProfile";
ALTER TABLE "new_SitterProfile" RENAME TO "SitterProfile";
CREATE UNIQUE INDEX "SitterProfile_userId_key" ON "SitterProfile"("userId");
CREATE UNIQUE INDEX "SitterProfile_slug_key" ON "SitterProfile"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_tokenHash_key" ON "PasswordToken"("tokenHash");
