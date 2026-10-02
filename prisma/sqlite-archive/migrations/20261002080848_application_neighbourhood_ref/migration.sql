-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SitterApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingCode" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_REVIEW',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "neighbourhood" TEXT,
    "neighbourhoodId" TEXT,
    "experience" TEXT NOT NULL,
    "acceptsSmall" BOOLEAN NOT NULL DEFAULT false,
    "acceptsMedium" BOOLEAN NOT NULL DEFAULT false,
    "acceptsLarge" BOOLEAN NOT NULL DEFAULT false,
    "acceptsGiant" BOOLEAN NOT NULL DEFAULT false,
    "certFirstAid" BOOLEAN NOT NULL DEFAULT false,
    "certMedication" BOOLEAN NOT NULL DEFAULT false,
    "certPuppy" BOOLEAN NOT NULL DEFAULT false,
    "certBehaviour" BOOLEAN NOT NULL DEFAULT false,
    "homeType" TEXT NOT NULL,
    "smokeFree" BOOLEAN NOT NULL DEFAULT false,
    "noChildren" BOOLEAN NOT NULL DEFAULT false,
    "ownPets" BOOLEAN NOT NULL DEFAULT false,
    "fencedYard" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT NOT NULL,
    "idDocumentName" TEXT,
    "backgroundCheckName" TEXT,
    "meetGreetAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "sitterProfileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SitterApplication_neighbourhoodId_fkey" FOREIGN KEY ("neighbourhoodId") REFERENCES "Neighbourhood" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SitterApplication_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "SitterProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SitterApplication" ("acceptsGiant", "acceptsLarge", "acceptsMedium", "acceptsSmall", "backgroundCheckName", "bio", "certBehaviour", "certFirstAid", "certMedication", "certPuppy", "createdAt", "email", "experience", "fencedYard", "firstName", "homeType", "id", "idDocumentName", "lastName", "meetGreetAt", "neighbourhood", "noChildren", "ownPets", "phone", "reviewNotes", "reviewedAt", "sitterProfileId", "smokeFree", "status", "trackingCode", "userId") SELECT "acceptsGiant", "acceptsLarge", "acceptsMedium", "acceptsSmall", "backgroundCheckName", "bio", "certBehaviour", "certFirstAid", "certMedication", "certPuppy", "createdAt", "email", "experience", "fencedYard", "firstName", "homeType", "id", "idDocumentName", "lastName", "meetGreetAt", "neighbourhood", "noChildren", "ownPets", "phone", "reviewNotes", "reviewedAt", "sitterProfileId", "smokeFree", "status", "trackingCode", "userId" FROM "SitterApplication";
DROP TABLE "SitterApplication";
ALTER TABLE "new_SitterApplication" RENAME TO "SitterApplication";
CREATE UNIQUE INDEX "SitterApplication_trackingCode_key" ON "SitterApplication"("trackingCode");
CREATE UNIQUE INDEX "SitterApplication_sitterProfileId_key" ON "SitterApplication"("sitterProfileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
