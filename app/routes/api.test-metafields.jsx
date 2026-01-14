import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405);
    }

    const data = await request.json();
    const { action: testAction } = data;

    console.log(`🧪 Testing metafields for shop: ${session.shop}, action: ${testAction}`);

    if (testAction === 'read') {
      // Read current metafields
      const query = `
        query {
          shop {
            metafields(namespace: "convertboost", first: 10) {
              edges {
                node {
                  id
                  key
                  value
                  namespace
                  type
                }
              }
            }
          }
        }
      `;
      
      const response = await admin.graphql(query);
      const result = await response.json();
      
      return json({
        success: true,
        metafields: result.data?.shop?.metafields?.edges || [],
        shop: session.shop
      });
    }

    if (testAction === 'deactivate') {
      // Test deactivating billing status
      const mutation = `
        mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              namespace
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      const shopId = session.shop.split('.')[0];
      const variables = {
        metafields: [
          {
            namespace: 'convertboost',
            key: 'billing_status',
            type: 'single_line_text_field',
            value: JSON.stringify({
              canUseService: false,
              plan: 'Inactive',
              lastUpdated: new Date().toISOString()
            }),
            ownerId: `gid://shopify/Shop/${shopId}`
          },
          {
            namespace: 'convertboost',
            key: 'popups_data',
            type: 'single_line_text_field',
            value: JSON.stringify([]),
            ownerId: `gid://shopify/Shop/${shopId}`
          }
        ]
      };
      
      console.log('🔧 Testing metafield deactivation with variables:', JSON.stringify(variables, null, 2));
      
      const response = await admin.graphql(mutation, { variables });
      const result = await response.json();
      
      console.log('📥 Metafield deactivation result:', JSON.stringify(result, null, 2));
      
      return json({
        success: true,
        result: result,
        variables: variables,
        shop: session.shop
      });
    }

    if (testAction === 'activate') {
      // Test activating billing status
      const mutation = `
        mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              namespace
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      const shopId = session.shop.split('.')[0];
      const variables = {
        metafields: [
          {
            namespace: 'convertboost',
            key: 'billing_status',
            type: 'single_line_text_field',
            value: JSON.stringify({
              canUseService: true,
              plan: 'Active',
              lastUpdated: new Date().toISOString()
            }),
            ownerId: `gid://shopify/Shop/${shopId}`
          },
          {
            namespace: 'convertboost',
            key: 'popups_data',
            type: 'single_line_text_field',
            value: JSON.stringify([{ id: 'test-id', status: true, lastUpdated: new Date().toISOString() }]),
            ownerId: `gid://shopify/Shop/${shopId}`
          }
        ]
      };
      
      const response = await admin.graphql(mutation, { variables });
      const result = await response.json();
      
      return json({
        success: true,
        result: result,
        variables: variables,
        shop: session.shop
      });
    }

    return json({ success: false, error: 'Invalid action' }, 400);

  } catch (error) {
    console.error('❌ Test metafields error:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
};
