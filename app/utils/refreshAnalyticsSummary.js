import prisma from '../db.server.js';
import { subDays, format } from 'date-fns';

/**
 * Refresh analytics summary for a specific popup or all popups
 * This pre-aggregates data for fast retrieval
 */
export async function refreshAnalyticsSummary(popupConfigId = null) {
  try {
    console.log(`📊 Refreshing analytics summary${popupConfigId ? ` for popup ${popupConfigId}` : ' for all popups'}...`);

    // Get all popups to refresh (or specific one)
    const popups = await prisma.popupConfiguration.findMany({
      where: popupConfigId ? { id: popupConfigId } : {},
      select: {
        id: true,
        shopName: true
      }
    });

    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);

    for (const popup of popups) {
      // 1. Get total interactions count
      const totalInteractions = await prisma.popupInteraction.count({
        where: { popupConfigId: popup.id }
      });

      // 2. Get total coupons count
      const totalCoupons = await prisma.coupon.count({
        where: { popupConfigId: popup.id }
      });

      // 3. Get unique users count (using email from userData)
      const coupons = await prisma.coupon.findMany({
        where: { popupConfigId: popup.id },
        select: { userData: true }
      });

      const uniqueEmails = new Set();
      coupons.forEach((coupon, index) => {
        const userData = coupon.userData;
        if (userData?.email) {
          uniqueEmails.add(userData.email.toLowerCase());
        } else {
          uniqueEmails.add(`unique-${index}-${popup.id}`);
        }
      });
      const uniqueUsers = uniqueEmails.size;

      // 4. Get daily views for last 7 days
      const dailyViews = await prisma.popupAnalytics.groupBy({
        by: ['createdAt'],
        where: {
          popupConfigId: popup.id,
          createdAt: {
            gte: sevenDaysAgo,
            lte: today
          },
          viewCount: { gt: 0 }
        },
        _sum: {
          viewCount: true
        }
      });

      // 5. Get daily conversions for last 7 days
      const dailyConversions = await prisma.coupon.groupBy({
        by: ['generatedAt'],
        where: {
          popupConfigId: popup.id,
          generatedAt: {
            gte: sevenDaysAgo,
            lte: today
          }
        },
        _count: true
      });

      // Format daily data
      const dailyViewsJson = Array.from({ length: 7 }).map((_, index) => {
        const date = format(subDays(today, 6 - index), 'yyyy-MM-dd');
        const viewData = dailyViews.find(d => format(d.createdAt, 'yyyy-MM-dd') === date);
        const conversionData = dailyConversions.find(d => format(d.generatedAt, 'yyyy-MM-dd') === date);

        return {
          date,
          views: viewData?._sum.viewCount || 0,
          conversions: conversionData?._count || 0
        };
      });

      // 6. Get top cities
      const cityAnalytics = await prisma.popupAnalytics.findMany({
        where: {
          popupConfigId: popup.id,
          viewCount: { gt: 0 }
        },
        select: {
          city: true,
          viewCount: true
        }
      });

      const topCitiesMap = {};
      cityAnalytics.forEach(analytic => {
        const city = analytic.city || 'Unknown';
        if (!topCitiesMap[city]) {
          topCitiesMap[city] = 0;
        }
        topCitiesMap[city] += analytic.viewCount;
      });

      // Sort and get top 10 cities
      const topCities = Object.entries(topCitiesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((obj, [city, count]) => {
          obj[city] = count;
          return obj;
        }, {});

      // 7. Upsert into AnalyticsSummary
      await prisma.analyticsSummary.upsert({
        where: { popupConfigId: popup.id },
        create: {
          shopName: popup.shopName,
          popupConfigId: popup.id,
          totalInteractions,
          totalCoupons,
          uniqueUsers,
          dailyViewsJson,
          topCitiesJson: topCities
        },
        update: {
          totalInteractions,
          totalCoupons,
          uniqueUsers,
          dailyViewsJson,
          topCitiesJson: topCities,
          lastUpdated: new Date()
        }
      });

      console.log(`✅ Updated summary for popup ${popup.id}`);
    }

    console.log(`🎉 Analytics summary refresh complete!`);
    return { success: true, count: popups.length };

  } catch (error) {
    console.error('❌ Error refreshing analytics summary:', error);
    throw error;
  }
}

/**
 * Refresh analytics for a specific shop (all popups)
 */
export async function refreshShopAnalytics(shopName) {
  const popups = await prisma.popupConfiguration.findMany({
    where: { shopName },
    select: { id: true }
  });

  for (const popup of popups) {
    await refreshAnalyticsSummary(popup.id);
  }

  return { success: true, count: popups.length };
}
