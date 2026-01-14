import prisma from '../db.server.js';
import { checkSubscriptionStatus } from './subscription.server.jsx';

// In-memory cache with TTL for billing status
const billingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache entry structure: { status, timestamp, shop }
function setCacheEntry(shop, billingStatus) {
  billingCache.set(shop, {
    ...billingStatus,
    timestamp: Date.now()
  });
}

function getCacheEntry(shop) {
  const entry = billingCache.get(shop);
  if (!entry) return null;
  
  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    billingCache.delete(shop);
    return null;
  }
  
  return entry;
}

export async function getCachedBillingStatus(admin, session) {
  const shop = session.shop;
  
  // Check cache first
  const cachedStatus = getCacheEntry(shop);
  if (cachedStatus) {
    console.log(`✅ Using cached billing status for ${shop}`);
    return cachedStatus;
  }
  
  console.log(`🔄 Fetching fresh billing status for ${shop}`);
  
  try {
    // Get database billing details first
    const dbBilling = await prisma.billingDetails.findFirst({
      where: { 
        shopName: shop,
        status: true
      }
    });
    
    let subscriptionStatus = { subscribed: false };
    
    // Only check Shopify subscription if admin is available
    if (admin) {
      try {
        subscriptionStatus = await checkSubscriptionStatus(admin, session);
      } catch (subError) {
        console.warn(`Warning: Could not check subscription status: ${subError.message}`);
      }
    }
    
    // Determine the actual billing status
    const billingStatus = determineBillingStatus(subscriptionStatus, dbBilling);
    
    // Cache the result
    setCacheEntry(shop, billingStatus);
    
    return billingStatus;
  } catch (error) {
    console.error(`❌ Error fetching billing status for ${shop}:`, error);
    
    // Return fallback status for error cases
    const fallbackStatus = {
      isPaid: false,
      plan: 'Free',
      billingCycle: 'Monthly',
      subscribed: false,
      onTrial: false,
      hasActivePayment: false,
      requiresPayment: true,
      error: error.message
    };
    
    // Cache fallback for shorter time (1 minute)
    billingCache.set(shop, {
      ...fallbackStatus,
      timestamp: Date.now() - (CACHE_TTL - 60000) // Expires in 1 minute
    });
    
    return fallbackStatus;
  }
}

// Alternative function for token-based auth scenarios
export async function getCachedBillingStatusFromDB(shop) {
  // Check cache first
  const cachedStatus = getCacheEntry(shop);
  if (cachedStatus) {
    console.log(`✅ Using cached billing status for ${shop} (DB only)`);
    return cachedStatus;
  }
  
  console.log(`🔄 Fetching billing status from DB for ${shop}`);
  
  try {
    const dbBilling = await prisma.billingDetails.findFirst({
      where: { 
        shopName: shop,
        status: true
      }
    });
    
    // For DB-only checks, assume no active subscription unless proven otherwise
    const subscriptionStatus = { subscribed: false };
    
    // Determine billing status with DB data only
    const billingStatus = determineBillingStatus(subscriptionStatus, dbBilling);
    
    // Cache the result for shorter time since we can't verify with Shopify
    billingCache.set(shop, {
      ...billingStatus,
      timestamp: Date.now(),
      dbOnly: true // Flag to indicate this is DB-only check
    });
    
    return billingStatus;
  } catch (error) {
    console.error(`❌ Error fetching billing status from DB for ${shop}:`, error);
    
    // Return conservative fallback
    return {
      isPaid: false,
      plan: 'Free',
      billingCycle: 'Monthly',
      subscribed: false,
      onTrial: false,
      hasActivePayment: false,
      requiresPayment: true,
      error: error.message,
      dbOnly: true
    };
  }
}

function determineBillingStatus(subscriptionStatus, dbBilling) {
  // If no database billing record, user needs to set up billing
  if (!dbBilling) {
    return {
      isPaid: false,
      plan: 'Free',
      billingCycle: 'Monthly',
      subscribed: false,
      onTrial: false,
      hasActivePayment: false,
      requiresPayment: true,
      status: 'no_billing_record'
    };
  }
  
  // Check if user is on free plan
  if (dbBilling.plan === 'Free') {
    return {
      isPaid: true, // Free plan is considered "paid" for access purposes
      plan: 'Free',
      billingCycle: dbBilling.billingCycle || 'Monthly',
      subscribed: true,
      onTrial: false,
      hasActivePayment: true,
      requiresPayment: false,
      status: 'free_plan',
      startDate: dbBilling.startDate
    };
  }
  
  // Check Shopify subscription status for paid plans
  if (subscriptionStatus.subscribed) {
    return {
      isPaid: true,
      plan: subscriptionStatus.plan || dbBilling.plan,
      billingCycle: dbBilling.billingCycle || 'Monthly',
      subscribed: true,
      onTrial: subscriptionStatus.onTrial || false,
      remainingTrialDays: subscriptionStatus.remainingTrialDays || 0,
      hasActivePayment: true,
      requiresPayment: false,
      status: subscriptionStatus.onTrial ? 'trial' : 'active_subscription',
      startDate: dbBilling.startDate
    };
  }
  
  // For DB-only checks with paid plans, be conservative
  // If the DB shows an active paid plan, assume it's valid unless we can verify otherwise
  if (dbBilling.status && (dbBilling.plan === 'Essential' || dbBilling.plan === 'Professional')) {
    return {
      isPaid: true, // Assume paid plan is still valid in DB-only mode
      plan: dbBilling.plan,
      billingCycle: dbBilling.billingCycle || 'Monthly',
      subscribed: true,
      onTrial: false,
      hasActivePayment: true,
      requiresPayment: false,
      status: 'active_subscription_db_only',
      startDate: dbBilling.startDate
    };
  }
  
  // User has billing record but no active subscription
  return {
    isPaid: false,
    plan: dbBilling.plan,
    billingCycle: dbBilling.billingCycle || 'Monthly',
    subscribed: false,
    onTrial: false,
    hasActivePayment: false,
    requiresPayment: true,
    status: 'payment_failed',
    startDate: dbBilling.startDate
  };
}

export async function invalidateBillingCache(shop) {
  billingCache.delete(shop);
  console.log(`🗑️ Invalidated billing cache for ${shop}`);
}

export async function handlePaymentFailure(shop, admin) {
  console.log(`💳 Handling payment failure for ${shop}`);
  
  try {
    // Invalidate cache
    await invalidateBillingCache(shop);
    
    // Update database billing status
    await prisma.billingDetails.updateMany({
      where: { 
        shopName: shop,
        status: true 
      },
      data: { 
        status: false,
        updatedAt: new Date()
      }
    });
    
    // Deactivate all popups in metafields
    await deactivatePopupsInMetafields(shop, admin);
    
    console.log(`✅ Payment failure handled for ${shop}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error handling payment failure for ${shop}:`, error);
    return { success: false, error: error.message };
  }
}

async function deactivatePopupsInMetafields(shop, admin) {
  try {
    console.log(`🔧 Deactivating popups in metafields for shop: ${shop}`);
    
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
    
    const shopId = shop.split('.')[0];
    console.log(`🏪 Using shop ID: ${shopId}`);
    
    const variables = {
      metafields: [
        {
          namespace: 'convertboost',
          key: 'billing_status',
          type: 'single_line_text_field',
          value: JSON.stringify({
            canUseService: false,
            plan: 'Disabled',
            reason: 'Billing failure',
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
    
    console.log('📤 Sending metafield update:', JSON.stringify(variables, null, 2));
    
    const response = await admin.graphql(mutation, { variables });
    const result = await response.json();
    
    console.log('📥 Metafield update response:', JSON.stringify(result, null, 2));
    
    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error('❌ Metafield deactivation errors:', result.data.metafieldsSet.userErrors);
      throw new Error(`Metafield errors: ${result.data.metafieldsSet.userErrors.map(e => e.message).join(', ')}`);
    } else {
      console.log('✅ Popups deactivated in metafields successfully');
      console.log('📊 Updated metafields:', result.data?.metafieldsSet?.metafields);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error deactivating popups in metafields:', error);
    throw error;
  }
}

export function clearAllBillingCache() {
  billingCache.clear();
  console.log('🗑️ Cleared all billing cache');
}
