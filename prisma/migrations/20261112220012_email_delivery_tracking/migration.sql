-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailEvent_to_occurredAt_idx" ON "EmailEvent"("to", "occurredAt");

-- CreateIndex
CREATE INDEX "EmailEvent_providerId_idx" ON "EmailEvent"("providerId");


ALTER TABLE "EmailEvent" ENABLE ROW LEVEL SECURITY;
