/*
  Warnings:

  - Added the required column `type` to the `Alert` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AlertTypes" AS ENUM ('Send_Request', 'Reject_Request', 'Delecte_Request', 'Accept_Request', 'Sent_Message', 'Open_Chat');

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "type" "AlertTypes" NOT NULL;
