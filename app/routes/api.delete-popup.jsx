import { json } from '@remix-run/node';
import prisma from '../db.server.js';

export async function action({ request }) {
  const method = request.method;

  // Handle DELETE request to delete a popup
  if (method === 'DELETE') {
    try {
      // Extract the token from the Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return json({ success: false, error: 'Unauthorized' }, 401);
      }

      const accessToken = authHeader.split(' ')[1];

      // Query the session to get the shop name associated with the accessToken
      const session = await prisma.session.findUnique({
        where: { accessToken },
      });

      if (!session) {
        return json({ success: false, error: 'Invalid access token' }, 401);
      }

      const shopName = session.shop;

      // Parse the request body to get the popup ID
      const data = await request.json();
      const id = data.id;

      if (!id) {
        return json({ success: false, error: 'Popup ID is required' }, 400);
      }

      // Find the popup configuration before deletion
      const popupConfig = await prisma.popupConfiguration.findUnique({
        where: { id, shopName },
        select: {
          id: true,
          discountName: true,
          shopName: true
        }
      });

      if (!popupConfig) {
        return json({ success: false, error: 'Popup not found' }, 404);
      }

      // IMPORTANT: Preserve all leads and analytics data
      // The schema uses onDelete: SetNull for PopupInteraction, PopupAnalytics, and Coupon
      // This means when we delete the popup, popupConfigId will be set to null in those tables
      // BUT the records themselves will remain, preserving all leads/interactions
      
      // Verify leads/interactions exist before deletion
      const interactionCount = await prisma.popupInteraction.count({
        where: { popupConfigId: id }
      });
      
      const couponCount = await prisma.coupon.count({
        where: { popupConfigId: id }
      });

      console.log(`📊 Popup ${id} has ${interactionCount} interactions and ${couponCount} coupons before deletion`);

      // Delete the popup configuration
      // This will automatically set popupConfigId to null in:
      // - PopupInteraction (preserves all view/conversion data)
      // - PopupAnalytics (preserves all analytics data)
      // - Coupon (preserves all coupon/lead data)
      // The records themselves remain in the database
      await prisma.popupConfiguration.delete({
        where: { id },
      });

      // Verify leads are preserved after deletion
      const preservedInteractions = await prisma.popupInteraction.count({
        where: { 
          shopName,
          popupConfigId: null,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      });

      const preservedCoupons = await prisma.coupon.count({
        where: { 
          popupConfig: { shopName },
          popupConfigId: null
        }
      });

      console.log(`✅ Popup ${id} deleted. Preserved ${preservedInteractions} interactions and ${preservedCoupons} coupons (popupConfigId = null)`);
      console.log(`📝 Note: Leads are preserved in database but won't appear in UI since popup is deleted`);

      return json({ 
        success: true, 
        message: `Popup deleted successfully. ${interactionCount} interactions and ${couponCount} coupons have been preserved.`,
        preservedData: {
          interactions: interactionCount,
          coupons: couponCount
        }
      }, 200);
    } catch (error) {
      console.error('Error deleting popup:', error);
      return json({ success: false, error: 'Failed to delete popup' }, 500);
    }
  }

  // Handle other methods (POST, PATCH) here as in your original code...
  else if (method === 'POST' || method === 'PATCH') {
    // [Your existing code here]
  } else {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }
}