/*
  Warnings:

  - You are about to drop the column `userA_ID` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `userB_ID` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the `Messages` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[senderId,receriverId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receriverId` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('Sent', 'Received', 'Accepted', 'Rejected');

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userA_ID_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userB_ID_fkey";

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_senderId_fkey";

-- DropIndex
DROP INDEX "Conversation_userA_ID_userB_ID_key";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "userA_ID",
DROP COLUMN "userB_ID",
ADD COLUMN     "receriverId" TEXT NOT NULL,
ADD COLUMN     "senderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Messages";

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "requesterID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'Sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Request_userID_idx" ON "Request"("userID");

-- CreateIndex
CREATE INDEX "Request_requesterID_idx" ON "Request"("requesterID");

-- CreateIndex
CREATE UNIQUE INDEX "Request_requesterID_userID_key" ON "Request"("requesterID", "userID");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_sentAt_idx" ON "Message"("sentAt");

-- CreateIndex
CREATE INDEX "Conversation_senderId_idx" ON "Conversation"("senderId");

-- CreateIndex
CREATE INDEX "Conversation_receriverId_idx" ON "Conversation"("receriverId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_senderId_receriverId_key" ON "Conversation"("senderId", "receriverId");

-- CreateIndex
CREATE INDEX "Friend_userId_idx" ON "Friend"("userId");

-- CreateIndex
CREATE INDEX "Friend_friendId_idx" ON "Friend"("friendId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requesterID_fkey" FOREIGN KEY ("requesterID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_receriverId_fkey" FOREIGN KEY ("receriverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
