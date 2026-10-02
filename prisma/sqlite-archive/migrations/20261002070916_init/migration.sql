-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "taxRateBps" INTEGER NOT NULL DEFAULT 1300,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Neighbourhood" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    CONSTRAINT "Neighbourhood_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "wagPointsCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "ageYears" REAL,
    "size" TEXT,
    "sex" TEXT,
    "neutered" BOOLEAN NOT NULL DEFAULT false,
    "rabiesVaccinated" BOOLEAN NOT NULL DEFAULT false,
    "microchip" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PetTrait" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'neutral',
    CONSTRAINT "PetTrait_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "neighbourhoodId" TEXT NOT NULL,
    "locationNote" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "serviceRadiusKm" REAL NOT NULL DEFAULT 3,
    "serviceAreaNote" TEXT,
    "avatarUrl" TEXT NOT NULL,
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
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "ratingCommunication" REAL NOT NULL DEFAULT 0,
    "ratingReliability" REAL NOT NULL DEFAULT 0,
    "ratingCare" REAL NOT NULL DEFAULT 0,
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
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SitterProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SitterProfile_neighbourhoodId_fkey" FOREIGN KEY ("neighbourhoodId") REFERENCES "Neighbourhood" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitterPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sitterId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SitterPhoto_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitterTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sitterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'neutral',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SitterTag_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitterSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sitterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SitterSkill_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sitterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "durationMins" INTEGER,
    "description" TEXT,
    "extraNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Service_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "recurringWeekly" BOOLEAN NOT NULL DEFAULT false,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "sitterId"),
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "SitterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitterApplication" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    CONSTRAINT "ApplicationService_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SitterApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE UNIQUE INDEX "SitterApplication_trackingCode_key" ON "SitterApplication"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
