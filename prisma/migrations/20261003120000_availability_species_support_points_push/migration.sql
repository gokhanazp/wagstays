-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "seriesId" TEXT;

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "pointsEarnRateBps" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "referralRewardCents" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "sitterRepliedAt" TIMESTAMP(3),
ADD COLUMN     "sitterReply" TEXT;

-- AlterTable
ALTER TABLE "SitterProfile" ADD COLUMN     "boardingCapacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "noticeHours" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "SitterAvailability" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "SitterAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterTimeOff" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitterTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterSpecies" (
    "sitterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "SitterSpecies_pkey" PRIMARY KEY ("sitterId","kind")
);

-- CreateTable
CREATE TABLE "OwnerReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WagPointsEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WagPointsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "bookingId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SitterAvailability_sitterId_weekday_idx" ON "SitterAvailability"("sitterId", "weekday");

-- CreateIndex
CREATE INDEX "SitterTimeOff_sitterId_startDate_idx" ON "SitterTimeOff"("sitterId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerReview_bookingId_key" ON "OwnerReview"("bookingId");

-- CreateIndex
CREATE INDEX "OwnerReview_ownerId_idx" ON "OwnerReview"("ownerId");

-- CreateIndex
CREATE INDEX "WagPointsEntry_userId_createdAt_idx" ON "WagPointsEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_reference_key" ON "SupportTicket"("reference");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "Booking_sitterId_startAt_idx" ON "Booking"("sitterId", "startAt");

-- CreateIndex
CREATE INDEX "Booking_seriesId_idx" ON "Booking"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterAvailability" ADD CONSTRAINT "SitterAvailability_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterTimeOff" ADD CONSTRAINT "SitterTimeOff_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterSpecies" ADD CONSTRAINT "SitterSpecies_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerReview" ADD CONSTRAINT "OwnerReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerReview" ADD CONSTRAINT "OwnerReview_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerReview" ADD CONSTRAINT "OwnerReview_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WagPointsEntry" ADD CONSTRAINT "WagPointsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WagPointsEntry" ADD CONSTRAINT "WagPointsEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------------------------
-- Supabase: keep the Data API locked down on every new table
ALTER TABLE "SitterAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SitterTimeOff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SitterSpecies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OwnerReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WagPointsEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------------------------
-- Backfill for existing data
-- Every current sitter takes dogs; sitters offering drop-in visits also take cats.
INSERT INTO "SitterSpecies" ("sitterId", "kind")
SELECT "id", 'DOG' FROM "SitterProfile"
ON CONFLICT DO NOTHING;
INSERT INTO "SitterSpecies" ("sitterId", "kind")
SELECT DISTINCT "sitterId", 'CAT' FROM "Service" WHERE "type" = 'DROP_IN'
ON CONFLICT DO NOTHING;

-- Default opening hours for existing sitters: every day 07:00–21:00 (they can edit it in /sitter/availability).
INSERT INTO "SitterAvailability" ("id", "sitterId", "weekday", "startMinute", "endMinute")
SELECT 'av_' || md5(sp."id" || d::text), sp."id", d, 420, 1260
FROM "SitterProfile" sp CROSS JOIN generate_series(0, 6) AS d;

-- Referral codes for existing users.
UPDATE "User" SET "referralCode" = upper(substr(md5("id" || 'wagstays'), 1, 8)) WHERE "referralCode" IS NULL;

-- Opening WagPoints balances become the first ledger entry.
INSERT INTO "WagPointsEntry" ("id", "userId", "amountCents", "reason", "note")
SELECT 'wp_' || md5("id" || 'opening'), "id", "wagPointsCents", 'ADMIN', 'Opening balance'
FROM "User" WHERE "wagPointsCents" <> 0;
