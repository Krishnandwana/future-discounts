import { json } from '@remix-run/node';
import prisma from '../db.server.js';
import { enforceFreePlanLimit, isFreePlan } from '../utils/popupLimits.server.js';

export async function action({ request }) {
  if (request.method === 'PATCH') {
    try {
      // Extract the token from the Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return json({ success: false, error: 'Unauthorized' }, 401);
      }
      const accessToken = authHeader.split(' ')[1];

      // Query the session to get the shop name and Shopify access token
      const session = await prisma.session.findUnique({
        where: { accessToken },
        select: {
          shop: true,
          accessToken: true  // This is the Shopify access token, not the app token
        }
      });

      if (!session) {
        return json({ success: false, error: 'Invalid access token' }, 401);
      }

      const shopifyAccessToken = session.accessToken;

      const data = await request.json();
      const { id, status } = data;

      if (!id) {
        return json({ success: false, error: 'Popup ID is missing' }, 400);
      }

      if (typeof status !== 'boolean') {
        return json({ success: false, error: 'Status must be a boolean' }, 400);
      }

      // Check if user is trying to activate a popup
      if (status === true) {
        // Check if user is on Free plan
        const isFree = await isFreePlan(session.shop);
        
        if (isFree) {
          // Check if there's already an active popup (excluding the current one)
          const activePopups = await prisma.popupConfiguration.findMany({
            where: {
              shopName: session.shop,
              status: true,
              id: { not: id } // Exclude the current popup
            },
            select: { id: true }
          });

          // If there's already an active popup, prevent activation
          if (activePopups.length > 0) {
            return json({ 
              success: false, 
              error: 'FREE_PLAN_LIMIT',
              message: 'Free plan allows only 1 active popup at a time. Please deactivate the other active popup first or upgrade to a paid plan to use multiple popups.',
              requiresUpgrade: true
            }, 403);
          }
        }

        // If Free plan check passed or user is on paid plan, enforce limit (for Free users)
        await enforceFreePlanLimit(session.shop, id);
      }

      // Fast update - only status field
      const updatedPopup = await prisma.popupConfiguration.update({
        where: { id },
        data: { status },
        select: { id: true, status: true, shopName: true }
      });

      // Get all active popups for this shop
      const activePopups = await prisma.popupConfiguration.findMany({
        where: {
          shopName: session.shop,
          status: true
        },
        select: { id: true },
        orderBy: { updatedAt: 'desc' } // Most recently updated first
      });

      const activePopupIds = activePopups.map(p => p.id);
      console.log('📊 Active popups for shop:', activePopupIds);

      // Trigger metafield sync using Shopify GraphQL API directly
      try {
        console.log('🔄 Triggering metafield sync...');

        // Get ALL active popups for this shop
        const allActivePopups = await prisma.popupConfiguration.findMany({
          where: {
            shopName: session.shop,
            status: true
          },
          orderBy: { updatedAt: 'desc' }
        });

        if (allActivePopups.length > 0) {
          // Get shop GID from Shopify using direct GraphQL request
          const shopQueryResponse = await fetch(`https://${session.shop}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': shopifyAccessToken
            },
            body: JSON.stringify({
              query: `query { shop { id } }`
            })
          });

          const shopQueryResult = await shopQueryResponse.json();
          const shopGid = shopQueryResult.data?.shop?.id;

          console.log('🏪 Shop GID retrieved:', shopGid);

          if (!shopGid) {
            throw new Error('Failed to get shop GID');
          }

          // Prepare array of popup data
          const popupsData = allActivePopups.map(popup => {
            const { cityOptions: _cityOptions, stateOptions: _stateOptions, ...rest } = popup;
            return {
              ...rest,
              startDate: popup.startDate ? popup.startDate.toISOString() : null,
              endDate: popup.endDate ? popup.endDate.toISOString() : null,
              expirationDate: popup.expirationDate ? popup.expirationDate.toISOString() : null,
              lastUpdated: new Date().toISOString()
            };
          });

          const allActivePopupIds = allActivePopups.map(p => p.id);

          console.log('📝 Preparing to sync metafields:', {
            shopGid,
            popupCount: allActivePopups.length,
            popupIds: allActivePopupIds
          });

          // Update metafields using GraphQL
          const billingStatus = allActivePopups.length > 0
            ? {
                canUseService: true,
                plan: 'Active',
                lastUpdated: new Date().toISOString()
              }
            : {
                canUseService: false,
                plan: 'Inactive',
                lastUpdated: new Date().toISOString()
              };

          const mutations = [
            {
              key: 'popups_data',
              value: JSON.stringify(popupsData)
            },
            {
              key: 'billing_status',
              value: JSON.stringify(billingStatus)
            }
          ];

          for (const { key, value } of mutations) {
            console.log('🔧 Executing metafield mutation:', {
              key,
              valueLength: value.length,
              ownerId: shopGid
            });

            const mutationResponse = await fetch(`https://${session.shop}/admin/api/2024-10/graphql.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': shopifyAccessToken
              },
              body: JSON.stringify({
                query: `
                  mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
                    metafieldsSet(metafields: $metafields) {
                      metafields { id key namespace }
                      userErrors { field message }
                    }
                  }
                `,
                variables: {
                  metafields: [{
                    namespace: 'convertboost',
                    key: key,
                    type: 'single_line_text_field',
                    value: value,
                    ownerId: shopGid
                  }]
                }
              })
            });

            const result = await mutationResponse.json();

            console.log('📥 Metafield mutation response:', {
              key,
              result: JSON.stringify(result, null, 2)
            });

            if (result.data?.metafieldsSet?.userErrors?.length > 0) {
              console.error('❌ Metafield mutation errors:', result.data.metafieldsSet.userErrors);
            } else {
              console.log('✅ Metafield updated:', result.data?.metafieldsSet?.metafields?.[0]?.key);
            }
          }

          console.log('✅ Metafields synced successfully');
        } else {
          console.log('⚠️ No active popups to sync');
        }
      } catch (syncError) {
        console.error('⚠️ Error syncing metafields:', syncError.message);
        console.error('⚠️ Full error:', syncError);
        // Don't fail the toggle operation if sync fails
      }

      return json({
        success: true,
        data: updatedPopup,
        activePopupIds, // Return array of all active popup IDs
        message: `Popup ${status ? 'activated' : 'deactivated'} successfully. ${activePopupIds.length} popup(s) now active.`
      });

    } catch (error) {
      console.error('Error toggling popup status:', error);
      console.error('Error stack:', error.stack);
      return json({ 
        success: false, 
        error: error.message || 'Failed to update popup status',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 500);
    }
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}
