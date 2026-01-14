import { json } from '@remix-run/node';
import prisma from '../db.server.js';
import { refreshShopAnalytics } from '../utils/refreshAnalyticsSummary';

/**
 * API endpoint to manually trigger analytics refresh
 * Can be called by cron job or manually
 *
 * Usage:
 * - Refresh all shops: GET /api/refresh-analytics?secret=YOUR_SECRET
 * - Refresh specific shop: GET /api/refresh-analytics?secret=YOUR_SECRET&shop=store.myshopify.com
 */
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const shopName = url.searchParams.get('shop');

    // Verify secret key (prevent unauthorized refresh)
    const REFRESH_SECRET = process.env.ANALYTICS_REFRESH_SECRET || 'change-me-in-production';

    if (secret !== REFRESH_SECRET) {
      return json({ success: false, error: 'Unauthorized - Invalid secret' }, 401);
    }

    console.log('🔄 Starting analytics refresh...');
    const startTime = Date.now();

    if (shopName) {
      // Refresh specific shop
      console.log(`📊 Refreshing analytics for shop: ${shopName}`);
      const result = await refreshShopAnalytics(shopName);
      const duration = Date.now() - startTime;

      return json({
        success: true,
        message: `Refreshed ${result.count} popups for ${shopName}`,
        duration: `${duration}ms`,
        shop: shopName,
        popupsRefreshed: result.count
      });
    } else {
      // Refresh all shops
      console.log('📊 Refreshing analytics for ALL shops...');

      const shops = await prisma.popupConfiguration.findMany({
        select: { shopName: true },
        distinct: ['shopName']
      });

      let totalPopups = 0;
      for (const shop of shops) {
        const result = await refreshShopAnalytics(shop.shopName);
        totalPopups += result.count;
      }

      const duration = Date.now() - startTime;

      return json({
        success: true,
        message: `Refreshed analytics for ${shops.length} shops`,
        duration: `${duration}ms`,
        shopsRefreshed: shops.length,
        popupsRefreshed: totalPopups
      });
    }

  } catch (error) {
    console.error('❌ Error refreshing analytics:', error);
    return json({
      success: false,
      error: 'Failed to refresh analytics',
      details: error.message
    }, 500);
  }
}

export async function action({ request }) {
  // Same as loader but for POST requests
  return loader({ request });
}
