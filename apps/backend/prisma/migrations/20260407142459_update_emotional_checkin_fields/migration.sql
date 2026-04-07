/*
  Warnings:

  - You are about to drop the column `energy` on the `emotional_checkins` table. All the data in the column will be lost.
  - You are about to drop the column `mood` on the `emotional_checkins` table. All the data in the column will be lost.
  - You are about to drop the column `stress` on the `emotional_checkins` table. All the data in the column will be lost.
  - Added the required column `anxietyLevel` to the `emotional_checkins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `energyLevel` to the `emotional_checkins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moodScore` to the `emotional_checkins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "emotional_checkins" DROP COLUMN "energy",
DROP COLUMN "mood",
DROP COLUMN "stress",
ADD COLUMN     "anxietyLevel" INTEGER NOT NULL,
ADD COLUMN     "energyLevel" INTEGER NOT NULL,
ADD COLUMN     "moodScore" INTEGER NOT NULL;
