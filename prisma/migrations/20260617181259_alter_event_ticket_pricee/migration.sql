-- AlterTable
-- These columns are required in the final schema. To apply to a non-empty Event table,
-- add them with a temporary default (which backfills existing rows), then drop the
-- default so the resulting schema matches prisma/schema.prisma (no default).
ALTER TABLE "Event" ADD COLUMN     "baseTicketPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountUpto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hasDiscount" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Event" ALTER COLUMN "baseTicketPrice" DROP DEFAULT,
ALTER COLUMN "discountPercentage" DROP DEFAULT,
ALTER COLUMN "discountUpto" DROP DEFAULT,
ALTER COLUMN "hasDiscount" DROP DEFAULT;
