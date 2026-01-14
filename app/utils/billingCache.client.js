const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Randomized key/value pairs to obfuscate plan info in storage.
const PLAN_SIGNATURES = {
  free: { key: 'cbp_f_71m', value: 'cbv_f_29x' },
  essential: { key: 'cbp_e_43k', value: 'cbv_e_87q' },
  professional: { key: 'cbp_p_18s', value: 'cbv_p_64z' },
};

const META_PREFIX = '__cb_billing_meta__';
const PLAN_KEY_PREFIX = '__cb_plan__';

const sanitizeShopName = (shopName = '') => shopName.replace(/[^a-zA-Z0-9]/g, '_');

const getMetaKey = (shopName) => `${META_PREFIX}${sanitizeShopName(shopName)}`;
const getPlanKey = (shopName) => `${PLAN_KEY_PREFIX}${sanitizeShopName(shopName)}`;

const getNamespacedKey = (shopName, signature) =>
  `${signature.key}_${sanitizeShopName(shopName)}`;

/**
 * Get storage API (IndexedDB wrapper or localStorage fallback)
 * Returns synchronous API for immediate reads
 */
function getStorage() {
  if (typeof window === 'undefined') return null;
  
  // Use IndexedDB wrapper if available (from convert-boost-storage.liquid)
  // The wrapper provides synchronous getItem that reads from in-memory cache
  if (window.cbStorage && typeof window.cbStorage.getItem === 'function') {
    return {
      getItem: (key) => window.cbStorage.getItem(key), // Synchronous - reads from cache
      setItem: async (key, value) => await window.cbStorage.setItem(key, value), // Async - writes to IndexedDB
      removeItem: async (key) => await window.cbStorage.removeItem(key) // Async - removes from IndexedDB
    };
  }
  
  // Fallback to localStorage (synchronous)
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: async (key, value) => { window.localStorage.setItem(key, value); },
    removeItem: async (key) => { window.localStorage.removeItem(key); }
  };
}

/**
 * Returns the cached plan if it exists and is fresher than 24 hours.
 * Uses IndexedDB cache (synchronous) if available, falls back to localStorage.
 * This is the async version - use getCachedBillingPlanSync for immediate access.
 */
export async function getCachedBillingPlan(shopName) {
  // For async version, just use the sync version since storage is synchronous
  return getCachedBillingPlanSync(shopName);
}

/**
 * Synchronous version for immediate access (uses IndexedDB cache or localStorage)
 * This is used for client-side validation before API calls
 */
export function getCachedBillingPlanSync(shopName) {
  if (typeof window === 'undefined' || !shopName) return null;

  try {
    const storage = getStorage();
    if (!storage) return null;

    // Try new IndexedDB-based plan storage first (synchronous read from cache)
    const planKey = getPlanKey(shopName);
    const planData = storage.getItem(planKey);
    
    if (planData) {
      try {
        const data = typeof planData === 'string' ? JSON.parse(planData) : planData;
        if (data?.plan && typeof data.checkedAt === 'number') {
          const isExpired = Date.now() - data.checkedAt > DAY_IN_MS;
          if (!isExpired) {
            return data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
          }
        }
      } catch (e) {
        // Invalid JSON, try legacy method
      }
    }

    // Fallback to legacy localStorage method
    const metaRaw = storage.getItem(getMetaKey(shopName));
    if (!metaRaw) return null;

    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
    if (!meta?.storageKey || typeof meta.checkedAt !== 'number') return null;

    const isExpired = Date.now() - meta.checkedAt > DAY_IN_MS;
    if (isExpired) return null;

    const storedValue = storage.getItem(meta.storageKey);
    if (!storedValue) return null;

    const match = Object.entries(PLAN_SIGNATURES).find(
      ([plan, signature]) =>
        getNamespacedKey(shopName, signature) === meta.storageKey &&
        signature.value === storedValue
    );

    if (!match) return null;

    const [matchedPlanKey] = match;
    return matchedPlanKey.charAt(0).toUpperCase() + matchedPlanKey.slice(1);
  } catch (error) {
    console.error('Failed to read cached billing plan:', error);
    return null;
  }
}

/**
 * Persists the given plan using IndexedDB (preferred) or localStorage (fallback).
 * Stores plan name and timestamp for quick client-side validation.
 */
export async function persistBillingPlanCache(shopName, planName) {
  if (typeof window === 'undefined' || !shopName || !planName) return;

  const normalizedPlan = planName.toLowerCase();
  const signature = PLAN_SIGNATURES[normalizedPlan];
  if (!signature) return;

  try {
    const storage = getStorage();
    if (!storage) return;

    const planKey = getPlanKey(shopName);
    const planData = {
      plan: normalizedPlan,
      checkedAt: Date.now()
    };

    // Store in IndexedDB (preferred) or localStorage
    await storage.setItem(planKey, JSON.stringify(planData));

    // Also store legacy format for backward compatibility
    const storageKey = getNamespacedKey(shopName, signature);
    await storage.setItem(storageKey, signature.value);
    await storage.setItem(
      getMetaKey(shopName),
      JSON.stringify({
        storageKey,
        checkedAt: Date.now(),
      })
    );
  } catch (error) {
    console.error('Failed to persist billing plan cache:', error);
  }
}

/**
 * Removes the cached plan for the shop (used when user opens the billing page).
 */
export async function clearBillingPlanCache(shopName) {
  if (typeof window === 'undefined' || !shopName) return;

  try {
    const storage = getStorage();
    if (!storage) return;

    // Clear new IndexedDB-based storage
    const planKey = getPlanKey(shopName);
    await storage.removeItem(planKey);

    // Clear legacy storage
    const metaRaw = storage.getItem(getMetaKey(shopName));
    if (metaRaw) {
      const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
      if (meta?.storageKey) {
        await storage.removeItem(meta.storageKey);
      }
    }
    await storage.removeItem(getMetaKey(shopName));
  } catch (error) {
    console.error('Failed to clear billing plan cache:', error);
  }
}

export const BILLING_CACHE_TTL_MS = DAY_IN_MS;
