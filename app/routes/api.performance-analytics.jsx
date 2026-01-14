import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';

export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get popup configurations with usage data
    const popupConfigs = await prisma.popupConfiguration.findMany({
      where: { 
        shopName: shop,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get geographic targeting analytics
    const locationAnalytics = {
      totalWithGeolocation: popupConfigs.filter(p => 
        p.locationRules && p.locationRules !== 'everyWhere'
      ).length,
      byLocationRule: {}
    };

    popupConfigs.forEach(config => {
      const rule = config.locationRules || 'everyWhere';
      locationAnalytics.byLocationRule[rule] = 
        (locationAnalytics.byLocationRule[rule] || 0) + 1;
    });

    // Get discount type analytics
    const discountAnalytics = {
      byType: {},
      byValueRange: {
        '0-10%': 0,
        '11-25%': 0,
        '26-50%': 0,
        '51%+': 0
      }
    };

    popupConfigs.forEach(config => {
      // Count by type
      const type = config.discountType || 'automatic';
      discountAnalytics.byType[type] = (discountAnalytics.byType[type] || 0) + 1;

      // Count by value range
      const value = parseFloat(config.discountValue) || 0;
      if (value <= 10) {
        discountAnalytics.byValueRange['0-10%']++;
      } else if (value <= 25) {
        discountAnalytics.byValueRange['11-25%']++;
      } else if (value <= 50) {
        discountAnalytics.byValueRange['26-50%']++;
      } else {
        discountAnalytics.byValueRange['51%+']++;
      }
    });

    // Get trigger analytics
    const triggerAnalytics = {};
    popupConfigs.forEach(config => {
      const trigger = config.trigger || 'scroll';
      triggerAnalytics[trigger] = (triggerAnalytics[trigger] || 0) + 1;
    });

    // Get app health metrics
    const healthMetrics = {
      totalActivePopups: popupConfigs.filter(p => p.status).length,
      averageDiscountValue: popupConfigs.length > 0 ? 
        popupConfigs.reduce((sum, p) => sum + (parseFloat(p.discountValue) || 0), 0) / popupConfigs.length : 0,
      mostUsedTrigger: Object.entries(triggerAnalytics).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      mostUsedDiscountType: Object.entries(discountAnalytics.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
    };

    // Get recent activity
    const recentActivity = popupConfigs.slice(0, 10).map(config => ({
      id: config.id,
      action: 'created',
      discountName: config.discountName,
      timestamp: config.createdAt,
      status: config.status
    }));

    return json({
      success: true,
      data: {
        timeRange: { startDate, endDate, days },
        summary: {
          totalPopups: popupConfigs.length,
          activePopups: popupConfigs.filter(p => p.status).length,
          inactivePopups: popupConfigs.filter(p => !p.status).length
        },
        locationAnalytics,
        discountAnalytics,
        triggerAnalytics,
        healthMetrics,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const data = await request.json();
    const { action: actionType, metafieldId, value } = data;

    if (actionType === 'updateMetafield') {
      const shopUrl = `https://${session.shop}`;
      const response = await fetch(`${shopUrl}/admin/api/2024-01/metafields/${metafieldId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({
          metafield: { value }
        })
      });

      if (response.ok) {
        const updatedMetafield = await response.json();
        return json({ 
          success: true, 
          message: "Metafield updated successfully",
          metafield: updatedMetafield.metafield
        });
      } else {
        const errorData = await response.json();
        return json({ 
          success: false, 
          error: errorData 
        }, { status: 400 });
      }
    }

    return json({ 
      success: false, 
      error: "Invalid action" 
    }, { status: 400 });

  } catch (error) {
    console.error('Performance analytics action error:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}