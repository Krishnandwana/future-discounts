import { json } from '@remix-run/node';

export async function loader({ request }) {
  try {
    // Get shop name from query params
    const url = new URL(request.url);
    const shopName = url.searchParams.get('shop');

    if (!shopName) {
      return json({ success: false, error: 'Shop name is required' }, 400);
    }

    // Import authenticate to access Shopify admin
    const { authenticate } = await import('../shopify.server.js');
    const { admin } = await authenticate.admin(request);

    // Read directly from metafields - no database query needed
    const query = `
      query getShopMetafields {
        shop {
          metafield(namespace: "convertboost", key: "popups_data") {
            value
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const result = await response.json();

    const popupsDataValue = result.data?.shop?.metafield?.value;

    if (!popupsDataValue) {
      console.log(`📊 No popups data found in metafields for shop: ${shopName}`);
      return json({
        success: true,
        popups: [],
        count: 0
      });
    }

    // Parse the popups data from metafield
    const popupsData = JSON.parse(popupsDataValue);
    console.log(`📊 Found ${popupsData.length} active popup(s) in metafields for shop: ${shopName}`);

    return json({
      success: true,
      popups: popupsData,
      count: popupsData.length
    });

  } catch (error) {
    console.error('❌ Error fetching active popups:', error);
    return json({
      success: false,
      error: error.message
    }, 500);
  }
}
