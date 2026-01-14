import { json } from '@remix-run/node';
import prisma from '../db.server.js';
import { refreshAnalyticsSummary } from '../utils/refreshAnalyticsSummary';
import { getShopUsageLimits } from '../utils/usage.server';

/**
 * FAST Analytics API using pre-aggregated AnalyticsSummary table
 * This endpoint returns cached analytics data for instant loading
 */
export async function loader({ request }) {
  try {
    // Validate authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    const accessToken = authHeader.split(' ')[1];
    const session = await prisma.session.findUnique({
      where: { accessToken },
      select: { shop: true }
    });

    if (!session) {
      return json({ success: false, error: 'Invalid access token' }, 401);
    }

    const url = new URL(request.url);
    const shopName = session.shop;
    const isSync = url.searchParams.get('sync') === 'true';

    // Get billing and usage details using centralized utility
    const usageDetails = await getShopUsageLimits(shopName);
    const { used: totalCalls, limit: maxCountsAllowed, plan: currentPlan } = usageDetails;

    // Get all popups with their summary data (FAST!)
    const popups = await prisma.popupConfiguration.findMany({
      where: { shopName },
      select: {
        id: true,
        discountName: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!popups?.length) {
      return json({
        success: true,
        message: 'No popups found for this shop',
        data: [],
        billing: {
          totalCalls,
          maxCountsAllowed,
          plan: currentPlan,
          requiresUpgrade: usageDetails.requiresUpgrade,
          actualPlan: currentPlan
        }
      });
    }

    const popupIds = popups.map(p => p.id);

    // Fetch pre-aggregated analytics summaries (SUPER FAST!)
    const summaries = await prisma.analyticsSummary.findMany({
      where: { popupConfigId: { in: popupIds } }
    });

    // Create a map for quick lookup
    const summaryMap = {};
    summaries.forEach(summary => {
      summaryMap[summary.popupConfigId] = summary;
    });

    // Check for missing vs existing summaries
    const missingSummaryIds = [];
    const existingSummaryIds = [];

    popups.forEach(popup => {
      if (!summaryMap[popup.id]) {
        missingSummaryIds.push(popup.id);
      } else {
        existingSummaryIds.push(popup.id);
      }
    });

    // 1. Synchronous refresh for MISSING summaries (so new users see data immediately)
    if (missingSummaryIds.length > 0) {
      console.log(`⏰ ${missingSummaryIds.length} new popups found, refreshing synchronously...`);
      await Promise.allSettled(
        missingSummaryIds.map(id => refreshAnalyticsSummary(id))
      );

      // Re-fetch only the missing ones after sync refresh
      const newSummaries = await prisma.analyticsSummary.findMany({
        where: { popupConfigId: { in: missingSummaryIds } }
      });

      newSummaries.forEach(summary => {
        summaryMap[summary.popupConfigId] = summary;
      });
    }

    // 2. Background or Synchronous refresh for remaining popups
    if (isSync) {
      console.log(`📊 Refreshing remaining ${popupIds.length} popups synchronously...`);
      await Promise.allSettled(
        popupIds.map(id => refreshAnalyticsSummary(id).catch(e => console.error(`Sync refresh failed: ${id}`, e)))
      );

      // Re-fetch all summaries after sync refresh to return most accurate data
      const updatedSummaries = await prisma.analyticsSummary.findMany({
        where: { popupConfigId: { in: popupIds } }
      });

      updatedSummaries.forEach(summary => {
        summaryMap[summary.popupConfigId] = summary;
      });
    } else {
      // Traditional background refresh
      console.log(`📊 Queueing background analytics refresh for ${popups.length} popups...`);
      Promise.allSettled(
        popupIds.map(id => refreshAnalyticsSummary(id).catch(e => console.error(`Bg refresh failed: ${id}`, e)))
      );
    }

    // Build response using cached or newly synced summaries
    const popupData = popups.map(popup => {
      const summary = summaryMap[popup.id];

      return {
        id: popup.id,
        name: popup.discountName || 'Unnamed Popup',
        status: popup.status,
        createdAt: popup.createdAt,
        updatedAt: popup.updatedAt,
        interactions: summary?.totalInteractions || 0,
        couponCount: summary?.totalCoupons || 0,
        uniqueUserCount: summary?.uniqueUsers || 0,
        dailyViews: summary?.dailyViewsJson || [],
        locationAnalytics: summary?.topCitiesJson || {}
      };
    });

    return json({
      success: true,
      data: popupData,
      billing: {
        totalCalls,
        maxCountsAllowed,
        plan: currentPlan,
        requiresUpgrade: usageDetails.requiresUpgrade,
        actualPlan: currentPlan
      },
      cached: missingSummaryIds.length === 0,
      lastRefresh: new Date(),
      refreshing: true
    }, 200);

  } catch (error) {
    console.error('Analytics Fast API Error:', error);
    return json({
      success: false,
      error: 'Failed to fetch analytics data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, 500);
  }
}
