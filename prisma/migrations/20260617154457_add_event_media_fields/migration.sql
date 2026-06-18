/*
  Warnings:

  - You are about to drop the `Participants` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "artistImage" TEXT,
ADD COLUMN     "genres" TEXT[],
ADD COLUMN     "image" TEXT;

-- DropTable
DROP TABLE "Participants";
