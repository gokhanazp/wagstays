-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "requireOwnerApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "approvedAt" TIMESTAMP(3);


-- Everyone who already has an account is approved.
UPDATE "User" SET "approvedAt" = "createdAt" WHERE "approvedAt" IS NULL;
