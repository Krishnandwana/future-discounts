-- Add new typography and opacity fields to PopupConfiguration table

-- Add background opacity field
ALTER TABLE "PopupConfiguration" ADD COLUMN "backgroundOpacity" INTEGER DEFAULT 100;

-- Add typography fields
ALTER TABLE "PopupConfiguration" ADD COLUMN "fontFamily" TEXT DEFAULT 'system';
ALTER TABLE "PopupConfiguration" ADD COLUMN "headingSize" INTEGER DEFAULT 18;
ALTER TABLE "PopupConfiguration" ADD COLUMN "bodySize" INTEGER DEFAULT 14;
ALTER TABLE "PopupConfiguration" ADD COLUMN "buttonSize" INTEGER DEFAULT 12;
ALTER TABLE "PopupConfiguration" ADD COLUMN "footerSize" INTEGER DEFAULT 11;