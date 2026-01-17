/*
  Warnings:

  - You are about to drop the column `cityOptions` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `discountLocation` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `locationRules` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `locationType` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `selectedCity` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `selectedCountries` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `selectedCountry` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `selectedState` on the `PopupConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `stateOptions` on the `PopupConfiguration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PopupConfiguration" DROP COLUMN "cityOptions",
DROP COLUMN "discountLocation",
DROP COLUMN "locationRules",
DROP COLUMN "locationType",
DROP COLUMN "selectedCity",
DROP COLUMN "selectedCountries",
DROP COLUMN "selectedCountry",
DROP COLUMN "selectedState",
DROP COLUMN "stateOptions",
ADD COLUMN     "hesitationThreshold" INTEGER DEFAULT 50;

-- CreateTable
CREATE TABLE "AnalyticsSummary" (
    "id" SERIAL NOT NULL,
    "shopName" TEXT NOT NULL,
    "popupConfigId" TEXT NOT NULL,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "totalCoupons" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "dailyViewsJson" JSONB,
    "topCitiesJson" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSummary_popupConfigId_key" ON "AnalyticsSummary"("popupConfigId");

-- CreateIndex
CREATE INDEX "AnalyticsSummary_shopName_idx" ON "AnalyticsSummary"("shopName");

-- CreateIndex
CREATE INDEX "AnalyticsSummary_popupConfigId_idx" ON "AnalyticsSummary"("popupConfigId");

-- CreateIndex
CREATE INDEX "AnalyticsSummary_lastUpdated_idx" ON "AnalyticsSummary"("lastUpdated");
