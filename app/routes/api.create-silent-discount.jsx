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

/**
 * createDiscount now uses the discountCodeBasicCreate mutation.
 * We build the input (of type DiscountCodeBasicInput) using data from popupConfig.
 *
 * - For percentage discounts, we send customerGets.value.percentage.
 * - For fixed discounts, we send customerGets.value.amount (and a currencyCode, here "USD").
 * - The usageLimit is determined based on maxUsesType: if it's "total", we use maxTotalUses; otherwise, we default to 1.
 */
async function createDiscount(customerEmail, popupConfig, shopName) {
  try {
    const accessToken = await getAccessToken(shopName);
    const startsAt = new Date().toISOString();
    const endsAt = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    // Generate a unique discount code per user
    const uniqueDiscountCode = `DISCOUNT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    // Determine the discount value object based on valueType
    let discountValueObj;
    if (popupConfig.valueType === 'fixed') {
      discountValueObj = { amount: popupConfig.discountValue.toString(), currencyCode: "USD" };
    } else {
      discountValueObj = { percentage: popupConfig.discountValue / 100 };
    }

    // Set usageLimit based on maxUsesType: if 'total', use maxTotalUses; otherwise, 1 use per customer.
    const usageLimit = popupConfig.maxUsesType === 'total' ? popupConfig.maxTotalUses : 1;

    // Build the input object for the mutation
    const discountCodeInput = {

      basicCodeDiscount: {
        title: popupConfig.discountName 
          ? popupConfig.discountName 
          : `Exclusive Discount for ${customerEmail}`,
        code: uniqueDiscountCode,
        startsAt,
        endsAt,
        appliesOncePerCustomer: true,
        usageLimit,
        customerSelection: { all: true },
        customerGets: {
          value: discountValueObj,
          items: { all: true },
          appliesOnOneTimePurchase: popupConfig.purchaseType === 'both' || popupConfig.purchaseType === 'one_time' || popupConfig.purchaseType === 'one-time',
          appliesOnSubscription: popupConfig.purchaseType === 'both' || popupConfig.purchaseType === 'subscription'
        },
        combinesWith: {
          orderDiscounts: popupConfig.combineWithOrderDiscounts === true,
          productDiscounts: popupConfig.combineWithProductDiscounts === true,
          shippingDiscounts: popupConfig.combineWithShippingDiscounts === true
        }
      }
    };
    // ... existing code ...
    const discountCodeInput_safe = {
      basicCodeDiscount: {
        title: popupConfig.discountName 
          ? popupConfig.discountName 
          : `Exclusive Discount for ${customerEmail}`,
        code: uniqueDiscountCode,
        startsAt,
        endsAt,
        appliesOncePerCustomer: true,
        usageLimit,
        customerSelection: { all: true },
        customerGets: {
          value: discountValueObj,
          items: { all: true }
        },
        combinesWith: {
          orderDiscounts: popupConfig.combineWithOrderDiscounts === true,
          productDiscounts: popupConfig.combineWithProductDiscounts === true,
          shippingDiscounts: popupConfig.combineWithShippingDiscounts === true
        }
      }
    };

    // Add minimum purchase requirement if minPurchaseValue is provided and greater than 0
    if (popupConfig.minPurchaseValue && parseFloat(popupConfig.minPurchaseValue) > 0) {
      discountCodeInput.basicCodeDiscount.minimumRequirement = {
        subtotal: {
          greaterThanOrEqualToSubtotal: popupConfig.minPurchaseValue.toString()
        }
      };
      discountCodeInput_safe.basicCodeDiscount.minimumRequirement = {
        subtotal: {
          greaterThanOrEqualToSubtotal: popupConfig.minPurchaseValue.toString()
        }
      };
    }

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
              minimumRequirement{
                ... on DiscountMinimumSubtotal{
                  greaterThanOrEqualToSubtotal{
                    amount
                    currencyCode
                  }
                }
              }
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
                appliesOnOneTimePurchase
                appliesOnSubscription
              }
              appliesOncePerCustomer
              usageLimit
              recurringCycleLimit
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
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

  const safe_mutationQuery = `
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
              minimumRequirement{
                ... on DiscountMinimumSubtotal{
                  greaterThanOrEqualToSubtotal{
                    amount
                    currencyCode
                  }
                }
              }
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
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
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

  let response;
  try {
    response = await fetch(
      `https://${shopName}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: mutationQuery,
          variables: { basicCodeDiscount: discountCodeInput.basicCodeDiscount },
        }),
      }
    );

    const result = await response.json();
    
    if (result.data?.discountCodeBasicCreate?.userErrors?.some(error => 
      error.message.includes('subscription') || 
      error.message.includes('applies_on_one_time_purchase'))) {
      throw new Error('Subscription not supported');
    }
    
    // Extract the discount code from the result
    if (result.data?.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.codes?.nodes?.[0]?.code) {
      return result.data.discountCodeBasicCreate.codeDiscountNode.codeDiscount.codes.nodes[0].code;
    }
    
    // Fallback to the uniqueDiscountCode if extraction fails
    return uniqueDiscountCode;
  } catch (error) {
    response = await fetch(
      `https://${shopName}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: safe_mutationQuery,
          variables: { basicCodeDiscount: discountCodeInput_safe.basicCodeDiscount },
        }),
      }
    );
  }

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

    return uniqueDiscountCode;
  } catch (error) {
    console.error('Error in creating discount:', error);
    throw error;
  }
}

// Function to store discount data (including all extra form data) in the database
async function storeDiscount(popupConfigId, shopName, discountCode, userData) {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        popupConfigId,
        shopName, // Store shopName to preserve leads even when popup is deleted
        couponCode: discountCode,
        userData: userData || null,
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
  // Allow only POST requests
  if (request.method.toLowerCase() !== 'post') {
    return json(
      { success: false, error: 'Method not allowed' },
      { status: 405, headers: getCorsHeaders(request) }
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
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const popupConfig = await prisma.popupConfiguration.findUnique({
      where: { id: popupConfigId },
    });

    if (!popupConfig) {
      return json(
        { success: false, error: 'Invalid popup configuration' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    let discountCode;
    // For manual discount, if discountType is "manual" and couponCode exists, use it.
    if (popupConfig.discountType === 'manual' && popupConfig.couponCode) {
      discountCode = popupConfig.couponCode;
    } else {
      discountCode = await createDiscount(customerEmail, popupConfig, shopName);
    }

    // Remove keys already used for internal processing
    delete formDataEntries.shopName;
    delete formDataEntries.popupConfigId;

    // Store all remaining form fields (including purchaseType, minPurchaseValue, combine flags, etc.)
    await storeDiscount(popupConfigId, shopName, discountCode, formDataEntries);

    return json(
      { success: true, discountCode },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error('API Error:', error);
    return json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}