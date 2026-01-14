-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN "shopName" TEXT;

-- CreateIndex
CREATE INDEX "Coupon_shopName_idx" ON "Coupon"("shopName");

-- Backfill shopName for existing coupons (optional - you may want to do this manually)
-- UPDATE "Coupon" c
-- SET "shopName" = pc."shopName"
-- FROM "PopupConfiguration" pc
-- WHERE c."popupConfigId" = pc."id";
