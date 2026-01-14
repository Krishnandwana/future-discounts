-- Backfill shopName for existing coupons
-- This script populates shopName for coupons that don't have it set yet
-- Run this after the migration to ensure all existing leads are preserved

UPDATE "Coupon" c
SET "shopName" = pc."shopName"
FROM "PopupConfiguration" pc
WHERE c."popupConfigId" = pc."id"
  AND c."shopName" IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_coupons,
  COUNT("shopName") as coupons_with_shopname,
  COUNT(*) - COUNT("shopName") as coupons_without_shopname
FROM "Coupon";
