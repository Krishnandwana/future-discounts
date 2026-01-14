import { json } from '@remix-run/node';
import prisma from '../db.server.js';
import { getShopUsageLimits } from '../utils/usage.server';

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shopName = url.searchParams.get('shopName');

  if (!shopName) {
    return json({
      success: false,
      error: 'Shop name is required'
    }, { status: 400 });
  }

  try {
    // Get the active popup configuration directly from database
    const activePopup = await prisma.popupConfiguration.findFirst({
      where: {
        shopName: shopName,
        status: true, // Only get active popup
      },
      orderBy: {
        updatedAt: 'desc' // Get the most recently updated active popup
      }
    });

    if (!activePopup) {
      return json({
        success: true,
        data: null,
        message: 'No active popup found'
      }, { status: 200 });
    }

    // Check billing status and monthly usage limits
    const usageDetails = await getShopUsageLimits(shopName);

    let billingStatus = {
      canUseService: !usageDetails.requiresUpgrade,
      plan: usageDetails.plan,
      used: usageDetails.used,
      limit: usageDetails.limit,
      lastUpdated: new Date().toISOString()
    };

    return json({
      success: true,
      data: {
        activePopupId: activePopup.id,
        popupConfig: activePopup,
        billingStatus: billingStatus
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching active popup:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};