-- CreateEnum
CREATE TYPE "PlanName" AS ENUM ('Free', 'Starter', 'Essential', 'Professional');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('Monthly', 'Annual');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupConfiguration" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "discountName" TEXT DEFAULT 'Sales Spot on Discount',
    "couponCode" TEXT,
    "subheading" TEXT,
    "discountType" TEXT DEFAULT 'automatic',
    "valueType" TEXT DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION DEFAULT 10,
    "expirationDate" BOOLEAN DEFAULT false,
    "discountLocation" TEXT DEFAULT 'exclude',
    "selectedCountry" TEXT DEFAULT 'India',
    "selectedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedCity" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedState" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cityOptions" JSONB,
    "stateOptions" JSONB,
    "locationType" TEXT DEFAULT 'city',
    "locationRules" TEXT DEFAULT 'certainCountries',
    "stickyDiscountBar" TEXT DEFAULT 'yes',
    "sidebarWidget" TEXT DEFAULT 'no',
    "trigger" TEXT DEFAULT 'scroll',
    "scrollPercentage" TEXT DEFAULT '50',
    "time" TEXT DEFAULT '3',
    "devices" TEXT[] DEFAULT ARRAY['all']::TEXT[],
    "limitFrequency" BOOLEAN DEFAULT true,
    "popupFrequency" INTEGER DEFAULT 3,
    "popupPeriod" TEXT DEFAULT 'day',
    "pageRules" TEXT DEFAULT 'everyPage',
    "subPageRules" TEXT DEFAULT 'homepage',
    "scheduleRules" TEXT DEFAULT 'showAllTime',
    "everydaystartTime" TEXT DEFAULT '00:00',
    "everydayendTime" TEXT DEFAULT '23:59',
    "endDate" TIMESTAMP(3),
    "endTime" TEXT DEFAULT '23:59',
    "askForEmail" BOOLEAN DEFAULT true,
    "startImmediately" BOOLEAN DEFAULT true,
    "startDate" TIMESTAMP(3),
    "startTime" TEXT,
    "mobileDevices" TEXT DEFAULT 'all',
    "minPurchaseValue" DOUBLE PRECISION DEFAULT 0,
    "purchaseType" TEXT DEFAULT 'both',
    "maxUsesType" TEXT DEFAULT 'total',
    "maxTotalUses" INTEGER DEFAULT 100,
    "combineWithProductDiscounts" BOOLEAN DEFAULT false,
    "combineWithOrderDiscounts" BOOLEAN DEFAULT false,
    "combineWithShippingDiscounts" BOOLEAN DEFAULT false,
    "heading" TEXT DEFAULT 'Get any product for just 798!',
    "description" TEXT DEFAULT 'Monsoon Sale end soon',
    "fields" JSONB DEFAULT '[{"label":"Email","checked":true,"type":"email"}]',
    "primaryButton" BOOLEAN DEFAULT true,
    "primaryButtonText" TEXT DEFAULT 'Claim Discount Now',
    "secondaryButton" BOOLEAN DEFAULT true,
    "secondaryButtonText" TEXT DEFAULT 'No Thanks',
    "footerText" TEXT DEFAULT 'You are signing up to receive communication via email and can unsubscribe at any time.',
    "sucessStatusHeading" TEXT DEFAULT 'Discount Unlocked 🎉',
    "successDescription" TEXT DEFAULT 'Thanks for subscribing. Copy your discount code and apply to your next order.',
    "clickAction" TEXT DEFAULT 'closeForm',
    "buttonText" TEXT DEFAULT 'Shop Now',
    "stickyBarDescription" TEXT DEFAULT 'Don''t forget to use your discount code',
    "sidebarButtonText" TEXT DEFAULT 'Get 25% OFF',
    "redirectUrl" TEXT,
    "intentMultiplier" INTEGER DEFAULT 5,
    "template" TEXT DEFAULT 'custom',
    "logo" TEXT,
    "alignment" TEXT DEFAULT 'center',
    "cornerRadius" TEXT DEFAULT 'standard',
    "imagePosition" TEXT DEFAULT 'background',
    "imageWidth" INTEGER DEFAULT 20,
    "backgroundImage" TEXT,
    "backgroundColor" TEXT DEFAULT '#F4F6F8',
    "textColor" TEXT DEFAULT '#202223',
    "headingColor" TEXT DEFAULT '#202223',
    "descriptionColor" TEXT DEFAULT '#6D7175',
    "inputColor" TEXT DEFAULT '#FFFFFF',
    "consentColor" TEXT DEFAULT '#202223',
    "errorColor" TEXT DEFAULT '#D82C0D',
    "footerTextColor" TEXT DEFAULT '#42474C',
    "primaryButtonBackground" TEXT DEFAULT '#008060',
    "primaryButtonTextColor" TEXT DEFAULT '#FFFFFF',
    "secondaryButtonBackground" TEXT DEFAULT '#FFFFFF',
    "secondaryButtonTextColor" TEXT DEFAULT '#008060',
    "stickyDiscountBarBackground" TEXT DEFAULT '#F4F6F8',
    "stickyDiscountBarText" TEXT DEFAULT '#202223',
    "sidebarWidgetBackground" TEXT DEFAULT '#F4F6F8',
    "sidebarWidgetTextColor" TEXT DEFAULT '#202223',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PopupConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupInteraction" (
    "id" SERIAL NOT NULL,
    "shopName" TEXT NOT NULL,
    "popupConfigId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT,
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "availed" BOOLEAN NOT NULL DEFAULT false,
    "masked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopupInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupAnalytics" (
    "id" SERIAL NOT NULL,
    "shopName" TEXT NOT NULL,
    "popupConfigId" TEXT,
    "city" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "availCount" INTEGER NOT NULL DEFAULT 0,
    "noViewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopupAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "popupConfigId" TEXT,
    "couponCode" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userData" JSONB,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingDetails" (
    "id" SERIAL NOT NULL,
    "shopName" TEXT NOT NULL,
    "plan" "PlanName" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "totalAmountBilled" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingSession" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "checkoutCompleted" BOOLEAN NOT NULL DEFAULT false,
    "intentScore" INTEGER NOT NULL DEFAULT 0,
    "hasPopupInteraction" BOOLEAN NOT NULL DEFAULT false,
    "hasDiscountClaim" BOOLEAN NOT NULL DEFAULT false,
    "discountCode" TEXT,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "TrackingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "path" TEXT,
    "checkout" BOOLEAN NOT NULL DEFAULT false,
    "intentScore" INTEGER DEFAULT 0,
    "data" JSONB DEFAULT '{}',

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_accessToken_key" ON "Session"("accessToken");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE INDEX "PopupConfiguration_shopName_idx" ON "PopupConfiguration"("shopName");

-- CreateIndex
CREATE INDEX "PopupInteraction_popupConfigId_idx" ON "PopupInteraction"("popupConfigId");

-- CreateIndex
CREATE INDEX "PopupInteraction_shopName_idx" ON "PopupInteraction"("shopName");

-- CreateIndex
CREATE INDEX "PopupAnalytics_popupConfigId_city_idx" ON "PopupAnalytics"("popupConfigId", "city");

-- CreateIndex
CREATE INDEX "PopupAnalytics_shopName_idx" ON "PopupAnalytics"("shopName");

-- CreateIndex
CREATE INDEX "Coupon_popupConfigId_idx" ON "Coupon"("popupConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingDetails_shopName_key" ON "BillingDetails"("shopName");

-- CreateIndex
CREATE INDEX "BillingDetails_shopName_idx" ON "BillingDetails"("shopName");

-- CreateIndex
CREATE INDEX "TrackingSession_shopName_idx" ON "TrackingSession"("shopName");

-- CreateIndex
CREATE INDEX "TrackingSession_checkoutCompleted_idx" ON "TrackingSession"("checkoutCompleted");

-- CreateIndex
CREATE INDEX "TrackingSession_hasDiscountClaim_idx" ON "TrackingSession"("hasDiscountClaim");

-- CreateIndex
CREATE INDEX "TrackingSession_hasPopupInteraction_idx" ON "TrackingSession"("hasPopupInteraction");

-- CreateIndex
CREATE INDEX "TrackingSession_shopName_checkoutCompleted_idx" ON "TrackingSession"("shopName", "checkoutCompleted");

-- CreateIndex
CREATE INDEX "TrackingSession_lastSeen_idx" ON "TrackingSession"("lastSeen");

-- CreateIndex
CREATE INDEX "TrackingEvent_sessionId_idx" ON "TrackingEvent"("sessionId");

-- CreateIndex
CREATE INDEX "TrackingEvent_timestamp_idx" ON "TrackingEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TrackingEvent_shopName_idx" ON "TrackingEvent"("shopName");

-- CreateIndex
CREATE INDEX "TrackingEvent_eventType_idx" ON "TrackingEvent"("eventType");

-- CreateIndex
CREATE INDEX "TrackingEvent_shopName_eventType_idx" ON "TrackingEvent"("shopName", "eventType");

-- AddForeignKey
ALTER TABLE "PopupInteraction" ADD CONSTRAINT "PopupInteraction_popupConfigId_fkey" FOREIGN KEY ("popupConfigId") REFERENCES "PopupConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopupAnalytics" ADD CONSTRAINT "PopupAnalytics_popupConfigId_fkey" FOREIGN KEY ("popupConfigId") REFERENCES "PopupConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_popupConfigId_fkey" FOREIGN KEY ("popupConfigId") REFERENCES "PopupConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrackingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
