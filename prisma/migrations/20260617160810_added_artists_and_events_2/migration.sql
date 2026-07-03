-- AlterTable
-- Added as nullable so this migration applies to a non-empty Event table.
-- Both columns are dropped again in 20260617162536_add_artist_model.
ALTER TABLE "Event" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3);
