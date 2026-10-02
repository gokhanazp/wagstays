-- CreateTable
CREATE TABLE "ApplicationFile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationFile_path_key" ON "ApplicationFile"("path");

-- CreateIndex
CREATE INDEX "ApplicationFile_applicationId_idx" ON "ApplicationFile"("applicationId");

-- AddForeignKey
ALTER TABLE "ApplicationFile" ADD CONSTRAINT "ApplicationFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SitterApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: keep the Data API locked down
ALTER TABLE "ApplicationFile" ENABLE ROW LEVEL SECURITY;
