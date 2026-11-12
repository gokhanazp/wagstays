-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;


-- Admin becomes a flag that combines with the other roles. Former role ADMIN keeps the panel and becomes a sitter
-- if they have a sitter profile, otherwise a pet parent.
UPDATE "User" SET "isAdmin" = true WHERE "role" = 'ADMIN';
UPDATE "User" u SET "role" = CASE WHEN EXISTS (SELECT 1 FROM "SitterProfile" s WHERE s."userId" = u."id") THEN 'SITTER' ELSE 'OWNER' END WHERE u."role" = 'ADMIN';
