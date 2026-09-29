-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "social_identities" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_identities_user_id_idx" ON "social_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_identities_provider_provider_user_id_key" ON "social_identities"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "social_identities" ADD CONSTRAINT "social_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

