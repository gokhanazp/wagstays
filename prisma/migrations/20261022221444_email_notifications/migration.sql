-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "consentText" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "source" TEXT,
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailBookings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bookingId" TEXT,
    "conversationId" TEXT,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_kind_bookingId_idx" ON "EmailLog"("kind", "bookingId");

-- CreateIndex
CREATE INDEX "EmailLog_conversationId_userId_createdAt_idx" ON "EmailLog"("conversationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_userId_createdAt_idx" ON "EmailLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Server-only table: RLS on, no policies (all access goes through Prisma on the server)
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
