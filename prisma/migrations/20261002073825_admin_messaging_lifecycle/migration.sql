-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "wagShieldFeeCents" INTEGER NOT NULL DEFAULT 350,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 225,
    "wagPointsDiscountCents" INTEGER NOT NULL DEFAULT 300,
    "vetCoverageCents" INTEGER NOT NULL DEFAULT 500000,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@wagstays.ca',
    "supportPhone" TEXT NOT NULL DEFAULT '+1 (416) 555-0142',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerReadAt" DATETIME,
    "sitterReadAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "confirmedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "sitterNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("cardBrand", "cardLast4", "createdAt", "discountCents", "emergencyName", "emergencyPhone", "endAt", "feedingRules", "gpsUpdates", "id", "leashPreference", "meetAndGreet", "meetingAddress", "notes", "otherAnimalsReaction", "ownerId", "petId", "protectionFeeCents", "recurringWeekly", "serviceFeeCents", "serviceId", "sitterId", "startAt", "status", "subtotalCents", "taxCents", "totalCents", "vetClinic", "vetPhone") SELECT "cardBrand", "cardLast4", "createdAt", "discountCents", "emergencyName", "emergencyPhone", "endAt", "feedingRules", "gpsUpdates", "id", "leashPreference", "meetAndGreet", "meetingAddress", "notes", "otherAnimalsReaction", "ownerId", "petId", "protectionFeeCents", "recurringWeekly", "serviceFeeCents", "serviceId", "sitterId", "startAt", "status", "subtotalCents", "taxCents", "totalCents", "vetClinic", "vetPhone" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sitterId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "petLabel" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "verifiedBooking" BOOLEAN NOT NULL DEFAULT true,
    "walkSummary" TEXT,
    "walkPhotoUrl" TEXT,
    "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
    "bookingId" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("authorAvatar", "authorId", "authorName", "body", "createdAt", "featuredOnHome", "id", "petLabel", "rating", "sitterId", "verifiedBooking", "walkPhotoUrl", "walkSummary") SELECT "authorAvatar", "authorId", "authorName", "body", "createdAt", "featuredOnHome", "id", "petLabel", "rating", "sitterId", "verifiedBooking", "walkPhotoUrl", "walkSummary" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");
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
    CONSTRAINT "SitterApplication_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "SitterProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SitterApplication" ("acceptsGiant", "acceptsLarge", "acceptsMedium", "acceptsSmall", "backgroundCheckName", "bio", "certBehaviour", "certFirstAid", "certMedication", "certPuppy", "createdAt", "email", "experience", "fencedYard", "firstName", "homeType", "id", "idDocumentName", "lastName", "meetGreetAt", "neighbourhood", "noChildren", "ownPets", "phone", "smokeFree", "status", "trackingCode", "userId") SELECT "acceptsGiant", "acceptsLarge", "acceptsMedium", "acceptsSmall", "backgroundCheckName", "bio", "certBehaviour", "certFirstAid", "certMedication", "certPuppy", "createdAt", "email", "experience", "fencedYard", "firstName", "homeType", "id", "idDocumentName", "lastName", "meetGreetAt", "neighbourhood", "noChildren", "ownPets", "phone", "smokeFree", "status", "trackingCode", "userId" FROM "SitterApplication";
DROP TABLE "SitterApplication";
ALTER TABLE "new_SitterApplication" RENAME TO "SitterApplication";
CREATE UNIQUE INDEX "SitterApplication_trackingCode_key" ON "SitterApplication"("trackingCode");
CREATE UNIQUE INDEX "SitterApplication_sitterProfileId_key" ON "SitterApplication"("sitterProfileId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "wagPointsCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "firstName", "id", "lastName", "passwordHash", "phone", "role", "wagPointsCents") SELECT "avatarUrl", "createdAt", "email", "firstName", "id", "lastName", "passwordHash", "phone", "role", "wagPointsCents" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_ownerId_sitterId_key" ON "Conversation"("ownerId", "sitterId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
