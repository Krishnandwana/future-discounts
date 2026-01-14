import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';

export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const accessToken = session.accessToken;

    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405);
    }

    console.log('🔄 Starting metafield sync for all active popups');

    // Get ALL active popups for this shop
    const activePopups = await prisma.popupConfiguration.findMany({
      where: {
        shopName: session.shop,
        status: true
      },
      orderBy: { updatedAt: 'desc' } // Most recently updated first
    });

    if (activePopups.length === 0) {
      return json({ success: false, error: 'No active popups found' }, 404);
    }

    console.log('📊 Found active popups:', activePopups.map(p => ({ id: p.id, name: p.discountName })));

    // Get shop GID from Shopify
    const shopQuery = `
      query {
        shop {
          id
        }
      }
    `;
    const shopResponse = await admin.graphql(shopQuery);
    const shopResult = await shopResponse.json();
    const shopGid = shopResult.data?.shop?.id;

    console.log('🏪 Shop GID retrieved:', shopGid);

    if (!shopGid) {
      return json({ success: false, error: 'Failed to get shop GID' }, 500);
    }

    // Prepare array of popup data
    const popupsData = activePopups.map(popup => {
      const { cityOptions: _cityOptions, stateOptions: _stateOptions, ...rest } = popup;
      return {
        ...rest,
        // Convert dates to ISO strings for JSON serialization
        startDate: popup.startDate ? popup.startDate.toISOString() : null,
        endDate: popup.endDate ? popup.endDate.toISOString() : null,
        expirationDate: popup.expirationDate ? popup.expirationDate.toISOString() : null,
        lastUpdated: new Date().toISOString()
      };
    });

    const activePopupIds = activePopups.map(p => p.id);

    console.log('📝 Syncing metafields:', {
      shopGid,
      popupCount: activePopups.length,
      popupIds: activePopupIds
    });

    // Create/Update metafields using GraphQL
    const mutations = [
      // All popups data (array)
      {
        mutation: `
          mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
                namespace
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          metafields: [{
            namespace: 'convertboost',
            key: 'popups_data',
            type: 'single_line_text_field',
            value: JSON.stringify(popupsData), // Store array of all active popups
            ownerId: shopGid
          }]
        }
      },
      // Billing status
      {
        mutation: `
          mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
                namespace
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          metafields: [{
            namespace: 'convertboost',
            key: 'billing_status',
            type: 'single_line_text_field',
            value: JSON.stringify({
              canUseService: true,
              plan: 'Active',
              lastUpdated: new Date().toISOString()
            }),
            ownerId: shopGid
          }]
        }
      }
    ];

    const results = [];
    
    for (const { mutation, variables } of mutations) {
      try {
        const response = await admin.graphql(mutation, { variables });
        const result = await response.json();
        
        if (result.data?.metafieldsSet?.userErrors?.length > 0) {
          console.error('❌ Metafield mutation errors:', result.data.metafieldsSet.userErrors);
        } else {
          console.log('✅ Metafield updated successfully:', result.data?.metafieldsSet?.metafields?.[0]?.key);
        }
        
        results.push(result);
      } catch (error) {
        console.error('❌ Metafield mutation failed:', error);
        results.push({ error: error.message });
      }
    }

    console.log('🎯 Metafield sync completed');

    return json({
      success: true,
      message: `Metafields synced successfully for ${activePopupIds.length} popup(s)`,
      activePopupIds,
      results: results
    });

  } catch (error) {
    console.error('❌ Sync metafields error:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
};
