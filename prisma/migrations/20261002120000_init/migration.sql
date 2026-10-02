-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "taxRateBps" INTEGER NOT NULL DEFAULT 1300,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Neighbourhood" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Neighbourhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "wagPointsCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "ageYears" DOUBLE PRECISION,
    "size" TEXT,
    "sex" TEXT,
    "neutered" BOOLEAN NOT NULL DEFAULT false,
    "rabiesVaccinated" BOOLEAN NOT NULL DEFAULT false,
    "microchip" TEXT,
    "photoUrl" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetTrait" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'neutral',

    CONSTRAINT "PetTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterProfile" (
    "id" TEXT NOT NULL,
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
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 3,
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
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "importedReviewCount" INTEGER NOT NULL DEFAULT 0,
    "importedRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCommunication" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingReliability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCare" DOUBLE PRECISION NOT NULL DEFAULT 0,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterPhoto" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SitterPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterTag" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'neutral',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SitterTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterSkill" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SitterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "durationMins" INTEGER,
    "description" TEXT,
    "extraNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
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
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "sitterNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","sitterId")
);

-- CreateTable
CREATE TABLE "SitterApplication" (
    "id" TEXT NOT NULL,
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
    "meetGreetAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "sitterProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitterApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationService" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "ApplicationService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "wagShieldFeeCents" INTEGER NOT NULL DEFAULT 350,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 225,
    "wagPointsDiscountCents" INTEGER NOT NULL DEFAULT 300,
    "vetCoverageCents" INTEGER NOT NULL DEFAULT 500000,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@wagstays.ca',
    "supportPhone" TEXT NOT NULL DEFAULT '+1 (416) 555-0142',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerReadAt" TIMESTAMP(3),
    "sitterReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Neighbourhood_cityId_slug_key" ON "Neighbourhood"("cityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SitterProfile_userId_key" ON "SitterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SitterProfile_slug_key" ON "SitterProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "SitterApplication_trackingCode_key" ON "SitterApplication"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "SitterApplication_sitterProfileId_key" ON "SitterApplication"("sitterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_ownerId_sitterId_key" ON "Conversation"("ownerId", "sitterId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Neighbourhood" ADD CONSTRAINT "Neighbourhood_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetTrait" ADD CONSTRAINT "PetTrait_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterProfile" ADD CONSTRAINT "SitterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterProfile" ADD CONSTRAINT "SitterProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterProfile" ADD CONSTRAINT "SitterProfile_neighbourhoodId_fkey" FOREIGN KEY ("neighbourhoodId") REFERENCES "Neighbourhood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterPhoto" ADD CONSTRAINT "SitterPhoto_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterTag" ADD CONSTRAINT "SitterTag_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterSkill" ADD CONSTRAINT "SitterSkill_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterApplication" ADD CONSTRAINT "SitterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterApplication" ADD CONSTRAINT "SitterApplication_neighbourhoodId_fkey" FOREIGN KEY ("neighbourhoodId") REFERENCES "Neighbourhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterApplication" ADD CONSTRAINT "SitterApplication_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "SitterProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationService" ADD CONSTRAINT "ApplicationService_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SitterApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

