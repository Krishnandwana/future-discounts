import { json } from '@remix-run/node';
import prisma from '../db.server.js';

// Helper function to handle CORS headers
function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowOrigin = origin && origin.endsWith('.myshopify.com') ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
}

// Handle OPTIONS preflight request
export async function loader({ request }) {
  if (request.method.toLowerCase() === 'options') {
    return new Response(null, {
      headers: getCorsHeaders(request)
    });
  }
  
  return json({ message: 'Method not allowed' }, { status: 405 });
}

// Helper function to get the access token for the shop from the database
async function getAccessToken(shopName) {
  const session = await prisma.session.findFirst({
    where: { shop: shopName },
  });
  if (!session || !session.accessToken) {
    throw new Error('Access token not found for the specified shop');
  }
  return session.accessToken;
}

// Function to create a discount with given parameters from popupConfig
async function createDiscount(customerEmail, popupConfig, shopName) {
  try {
    const accessToken = await getAccessToken(shopName);
    const startsAt = new Date().toISOString();
    const endsAt = new Date(
      new Date().setFullYear(new Date().getFullYear() + 1)
    ).toISOString();

    // Generate a unique discount code per user
    const uniqueDiscountCode = `DISCOUNT-${Math.random()
      .toString(36)
      .substr(2, 8)
      .toUpperCase()}`;

    const discountCodeInput = {
      basicCodeDiscount: {
        title: `Exclusive Discount for ${customerEmail}`,
        code: uniqueDiscountCode,
        startsAt,
        endsAt,
        appliesOncePerCustomer: true,
        usageLimit: 1,
        customerSelection: {
          all: true,
        },
        customerGets: {
          value: {
            percentage: popupConfig.discountValue / 100,
          },
          items: {
            all: true,
          },
        },
      },
    };

    const mutationQuery = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 10) {
                  nodes {
                    code
                  }
                }
                startsAt
                endsAt
                customerSelection {
                  ... on DiscountCustomerAll {
                    allCustomers
                  }
                }
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                  }
                  items {
                    ... on AllDiscountItems {
                      allItems
                    }
                  }
                }
                appliesOncePerCustomer
                usageLimit
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    const response = await fetch(
      `https://${shopName}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: mutationQuery,
          variables: discountCodeInput,
        }),
      }
    );

    const result = await response.json();

    if (
      !response.ok ||
      result.errors ||
      result.data.discountCodeBasicCreate.userErrors.length > 0
    ) {
      throw new Error(
        JSON.stringify(
          result.errors || result.data.discountCodeBasicCreate.userErrors
        )
      );
    }

    return result.data.discountCodeBasicCreate.codeDiscountNode.codeDiscount.codes
      .nodes[0].code;
  } catch (error) {
    console.error('Error in creating discount:', error);
    throw error;
  }
}

// Function to store discount data in the database with user details
async function storeDiscount(popupConfigId, shopName, discountCode, userData) {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        popupConfigId,
        shopName, // Store shopName to preserve leads even when popup is deleted
        couponCode: discountCode,
        userData: userData || null, // Store userData as JSON, or null if no data is passed
      },
    });
    return coupon;
  } catch (error) {
    console.error('Error storing discount:', error);
    throw error;
  }
}

// Main action to handle the request
export async function action({ request }) {
  // Handle only POST requests
  if (request.method.toLowerCase() !== 'post') {
    return json(
      { success: false, error: 'Method not allowed' },
      {
        status: 405,
        headers: getCorsHeaders(request)
      }
    );
  }

  try {
    const formData = await request.formData();
    const formDataEntries = Object.fromEntries(formData);

    const popupConfigId = formData.get('popupConfigId');
    const shopName = formData.get('shopName');
    const customerEmail = formData.get('email') || 'anonymous@example.com';

    if (!popupConfigId || !shopName) {
      return json(
        { success: false, error: 'Popup configuration ID and shop name are required' },
        {
          status: 400,
          headers: getCorsHeaders(request)
        }
      );
    }

    const popupConfig = await prisma.popupConfiguration.findUnique({
      where: { id: popupConfigId },
    });

    if (!popupConfig) {
      return json(
        { success: false, error: 'Invalid popup configuration' },
        {
          status: 400,
          headers: getCorsHeaders(request)
        }
      );
    }

    let discountCode;

    if (popupConfig.manualShopifyDiscount && popupConfig.couponCode) {
      discountCode = popupConfig.couponCode;
    } else {
      discountCode = await createDiscount(customerEmail, popupConfig, shopName);
    }

    delete formDataEntries.shopName;
    delete formDataEntries.popupConfigId;

    await storeDiscount(popupConfigId, shopName, discountCode, formDataEntries);

    return json(
      { success: true, discountCode },
      {
        headers: getCorsHeaders(request)
      }
    );
  } catch (error) {
    console.error('API Error:', error);
    return json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      {
        status: 500,
        headers: getCorsHeaders(request)
      }
    );
  }
}