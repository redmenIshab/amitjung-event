/*
  Warnings:

  - Added the required column `baseTicketPrice` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountPercentage` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountUpto` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hasDiscount` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "baseTicketPrice" INTEGER NOT NULL,
ADD COLUMN     "discountPercentage" INTEGER NOT NULL,
ADD COLUMN     "discountUpto" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "hasDiscount" BOOLEAN NOT NULL;
