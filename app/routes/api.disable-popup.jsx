import { json } from '@remix-run/node';
import prisma from '../db.server.js';

export async function action({ request }) {
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      const { shopName, reason } = data;

      if (!shopName) {
        return json({ success: false, error: 'Shop name is required' }, 400);
      }

      // Disable all active popup configurations for this shop
      const updatedPopups = await prisma.popupConfiguration.updateMany({
        where: { 
          shopName: shopName,
          status: true 
        },
        data: { 
          status: false 
        },
      });

      // Get shop access token for metafield update
      const session = await prisma.session.findFirst({
        where: { shop: shopName },
        select: { accessToken: true }
      });

      if (!session) {
        console.error(`No session found for shop: ${shopName}`);
        return json({ 
          success: true, 
          message: `Disabled ${updatedPopups.count} popups in database, but could not update metafields (no session found)`,
          disabledCount: updatedPopups.count 
        }, 200);
      }

      // Clear metafields related to active popups
      try {
        const shopUrl = `https://${shopName}`;
        const popupsDataResponse = await fetch(`${shopUrl}/admin/api/2024-01/metafields.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': session.accessToken,
          },
          body: JSON.stringify({
            metafield: {
              namespace: 'convertboost',
              key: 'popups_data',
              value: JSON.stringify([]),
              type: 'single_line_text_field',
            },
          }),
        });

        // Update billing status metafield to indicate quota exceeded
        const billingStatusResponse = await fetch(`${shopUrl}/admin/api/2024-01/metafields.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': session.accessToken,
          },
          body: JSON.stringify({
            metafield: {
              namespace: 'convertboost',
              key: 'billing_status',
              value: JSON.stringify({
                canUseService: false,
                plan: 'Disabled',
                reason: reason || 'Usage quota exceeded',
                lastUpdated: new Date().toISOString()
              }),
              type: 'single_line_text_field', // Use single_line_text_field for JSON string
            },
          }),
        });

        let metafieldsUpdated = 0;
        if (popupsDataResponse.ok) metafieldsUpdated++;
        if (billingStatusResponse.ok) metafieldsUpdated++;

        console.log(`Popup disabled for ${shopName}. Reason: ${reason || 'quota exceeded'}. Updated ${metafieldsUpdated} metafields.`);

        return json({ 
          success: true, 
          message: `Successfully disabled ${updatedPopups.count} popups and updated metafields`,
          disabledCount: updatedPopups.count,
          metafieldsUpdated: metafieldsUpdated,
          reason: reason
        }, 200);

      } catch (metafieldError) {
        console.error('Error updating metafields during popup disable:', metafieldError);
        return json({ 
          success: true, 
          message: `Disabled ${updatedPopups.count} popups in database, but metafield update failed`,
          disabledCount: updatedPopups.count,
          metafieldError: metafieldError.message
        }, 200);
      }

    } catch (error) {
      console.error('Error disabling popup:', error);
      return json({ success: false, error: 'Failed to disable popup' }, 500);
    }
  } else {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }
}
