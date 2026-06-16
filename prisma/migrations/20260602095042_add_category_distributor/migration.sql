-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'VIP');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "distributorName" TEXT,
ALTER COLUMN "attendeeName" DROP NOT NULL,
ALTER COLUMN "attendeeEmail" DROP NOT NULL;
