-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'MOSQUE_ADMIN', 'STAFF', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MosqueType" AS ENUM ('MOSQUE', 'MUSALLA', 'HOME');

-- CreateEnum
CREATE TYPE "MosqueStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ScheduleSource" AS ENUM ('CALENDAR', 'CALCULATION', 'FIXED');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('IMAGE', 'TEXT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "role" "Role" NOT NULL DEFAULT 'PUBLIC',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MosqueUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "MosqueUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mosque" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MosqueType" NOT NULL DEFAULT 'MOSQUE',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipcode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "paymentUrl" TEXT,
    "associationName" TEXT,
    "logoUrl" TEXT,
    "showOnMap" BOOLEAN NOT NULL DEFAULT false,
    "status" "MosqueStatus" NOT NULL DEFAULT 'OFFLINE',
    "facilities" JSONB NOT NULL DEFAULT '{}',
    "capacityMen" INTEGER,
    "capacityWomen" INTEGER,
    "constructionYear" INTEGER,
    "history" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mosque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MosqueConfig" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "regional" JSONB NOT NULL DEFAULT '{}',
    "athan" JSONB NOT NULL DEFAULT '{}',
    "iqama" JSONB NOT NULL DEFAULT '{}',
    "jumua" JSONB NOT NULL DEFAULT '{}',
    "display" JSONB NOT NULL DEFAULT '{}',
    "eid" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '{}',
    "durations" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "MosqueConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerSchedule" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "source" "ScheduleSource" NOT NULL DEFAULT 'CALENDAR',
    "method" TEXT,
    "year" INTEGER NOT NULL,

    CONSTRAINT "PrayerSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerDay" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "fajr" TEXT NOT NULL,
    "shuruq" TEXT NOT NULL,
    "dhuhr" TEXT NOT NULL,
    "asr" TEXT NOT NULL,
    "maghrib" TEXT NOT NULL,
    "isha" TEXT NOT NULL,

    CONSTRAINT "PrayerDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "imageUrl" TEXT,
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "isEvent" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL DEFAULT 30,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "onMainScreen" BOOLEAN NOT NULL DEFAULT true,
    "onMobile" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashMessage" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FlashMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MosqueImage" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'gallery',

    CONSTRAINT "MosqueImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "mosqueId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodEnd" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MosqueUser_mosqueId_idx" ON "MosqueUser"("mosqueId");

-- CreateIndex
CREATE UNIQUE INDEX "MosqueUser_userId_mosqueId_key" ON "MosqueUser"("userId", "mosqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Mosque_slug_key" ON "Mosque"("slug");

-- CreateIndex
CREATE INDEX "Mosque_city_idx" ON "Mosque"("city");

-- CreateIndex
CREATE INDEX "Mosque_countryCode_idx" ON "Mosque"("countryCode");

-- CreateIndex
CREATE INDEX "Mosque_latitude_longitude_idx" ON "Mosque"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "MosqueConfig_mosqueId_key" ON "MosqueConfig"("mosqueId");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerSchedule_mosqueId_year_key" ON "PrayerSchedule"("mosqueId", "year");

-- CreateIndex
CREATE INDEX "PrayerDay_scheduleId_month_idx" ON "PrayerDay"("scheduleId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerDay_scheduleId_month_day_key" ON "PrayerDay"("scheduleId", "month", "day");

-- CreateIndex
CREATE INDEX "Announcement_mosqueId_enabled_idx" ON "Announcement"("mosqueId", "enabled");

-- CreateIndex
CREATE INDEX "FlashMessage_mosqueId_idx" ON "FlashMessage"("mosqueId");

-- CreateIndex
CREATE INDEX "Event_mosqueId_startsAt_idx" ON "Event"("mosqueId", "startsAt");

-- CreateIndex
CREATE INDEX "MosqueImage_mosqueId_idx" ON "MosqueImage"("mosqueId");

-- CreateIndex
CREATE INDEX "Favorite_mosqueId_idx" ON "Favorite"("mosqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_mosqueId_key" ON "Favorite"("userId", "mosqueId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_mosqueId_key" ON "Subscription"("mosqueId");

-- AddForeignKey
ALTER TABLE "MosqueUser" ADD CONSTRAINT "MosqueUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MosqueUser" ADD CONSTRAINT "MosqueUser_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MosqueConfig" ADD CONSTRAINT "MosqueConfig_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerSchedule" ADD CONSTRAINT "PrayerSchedule_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerDay" ADD CONSTRAINT "PrayerDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PrayerSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashMessage" ADD CONSTRAINT "FlashMessage_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MosqueImage" ADD CONSTRAINT "MosqueImage_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_mosqueId_fkey" FOREIGN KEY ("mosqueId") REFERENCES "Mosque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

