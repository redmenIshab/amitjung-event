-- AlterTable
-- artistId is added as nullable so this migration can apply to a non-empty Event table.
-- The relation is optional in the final schema (see 20260617162536_add_artist_model,
-- which drops NOT NULL on this column).
ALTER TABLE "Event" ADD COLUMN     "artistId" TEXT;

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "artistImage" TEXT NOT NULL,
    "totalSongs" TEXT NOT NULL,
    "artistBand" TEXT NOT NULL,
    "artistDescription" TEXT NOT NULL,
    "artistGenere" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
