/**
 * Server-side utility functions for managing Shopify metafields
 */

/**
 * Get log level from shop metafields
 * If doesn't exist, automatically creates it with default 'warn' value
 * @param {Object} admin - Shopify admin API client
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @returns {Promise<string>} Log level (debug, info, warn, error) - defaults to 'warn'
 */
export async function getLogLevel(admin, shop) {
  try {
    // Use the shop metafield query - metafields are attached to the current shop
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          metafield(namespace: "convertboost", key: "log_level") {
            id
            namespace
            key
            value
          }
        }
      }`
    );

    const data = await response.json();
    const metafield = data?.data?.shop?.metafield;

    if (metafield?.value) {
      const logLevel = metafield.value.toLowerCase();
      console.log(`📊 Log level for shop: ${logLevel}`);
      return logLevel;
    }

    // No metafield found - create one with default value 'warn'
    console.log('📊 No log_level metafield found, creating with default: warn');
    const created = await setLogLevel(admin, shop, 'warn');

    if (created) {
      console.log('✅ Created log_level metafield with default value: warn');
    }

    return 'warn';
  } catch (error) {
    console.error('Error fetching log_level metafield:', error);
    return 'warn'; // Default to warn on error
  }
}

/**
 * Set log level in shop metafields
 * @param {Object} admin - Shopify admin API client
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @param {string} logLevel - Log level to set (debug, info, warn, error)
 * @returns {Promise<boolean>} Success status
 */
export async function setLogLevel(admin, shop, logLevel) {
  try {
    const validLevels = ['debug', 'info', 'warn', 'error', 'none'];
    const normalizedLevel = logLevel.toLowerCase();

    if (!validLevels.includes(normalizedLevel)) {
      console.error(`Invalid log level: ${logLevel}. Must be one of: ${validLevels.join(', ')}`);
      return false;
    }

    // First get the shop ID
    const shopResponse = await admin.graphql(
      `#graphql
      query {
        shop {
          id
        }
      }`
    );

    const shopData = await shopResponse.json();
    const shopId = shopData?.data?.shop?.id;

    if (!shopId) {
      console.error('Could not get shop ID');
      return false;
    }

    const response = await admin.graphql(
      `#graphql
      mutation setLogLevel($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: 'convertboost',
              key: 'log_level',
              value: normalizedLevel,
              type: 'single_line_text_field'
            }
          ]
        }
      }
    );

    const data = await response.json();

    if (data?.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error('Error setting log_level:', data.data.metafieldsSet.userErrors);
      return false;
    }

    console.log(`✅ Log level set to: ${normalizedLevel}`);
    return true;
  } catch (error) {
    console.error('Error setting log_level metafield:', error);
    return false;
  }
}

/**
 * Get all Geo Deals metafields for a shop
 * @param {Object} admin - Shopify admin API client
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} All metafields as key-value pairs
 */
export async function getAllMetafields(admin, shop) {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          metafields(first: 50, namespace: "convertboost") {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
      }`
    );

    const data = await response.json();
    const metafields = {};

    data?.data?.shop?.metafields?.edges?.forEach(({ node }) => {
      metafields[node.key] = node.value;
    });

    return metafields;
  } catch (error) {
    console.error('Error fetching metafields:', error);
    return {};
  }
}
