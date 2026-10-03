-- AlterTable
ALTER TABLE "SitterApplication" ADD COLUMN     "acceptedKinds" TEXT[] DEFAULT ARRAY[]::TEXT[];


-- Existing applications: everyone applied to care for dogs; drop-in applicants also cats.
UPDATE "SitterApplication" a SET "acceptedKinds" = ARRAY['DOG']
  || CASE WHEN EXISTS (SELECT 1 FROM "ApplicationService" s WHERE s."applicationId" = a."id" AND s."type" = 'DROP_IN') THEN ARRAY['CAT'] ELSE ARRAY[]::text[] END;
