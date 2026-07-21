-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CONCERT', 'FESTIVAL', 'CONFERENCE', 'SPORTS', 'PRIVATE', 'OTHER');

-- AlterTable: ticketsAvailable (offered-for-sale count). Backfill existing rows from capacity.
ALTER TABLE "Event" ADD COLUMN "ticketsAvailable" INTEGER;
UPDATE "Event" SET "ticketsAvailable" = "capacity" WHERE "ticketsAvailable" IS NULL;
ALTER TABLE "Event" ALTER COLUMN "ticketsAvailable" SET NOT NULL;

-- AlterTable: status. New rows default DRAFT; existing rows are already live, so mark PUBLISHED.
ALTER TABLE "Event" ADD COLUMN "status" "EventStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Event" SET "status" = 'PUBLISHED';

-- AlterTable: eventType. Existing rows default to OTHER.
ALTER TABLE "Event" ADD COLUMN "eventType" "EventType" NOT NULL DEFAULT 'OTHER';
