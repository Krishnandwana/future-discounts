import { useCallback, useEffect } from 'react';
import { apiCache, getCacheKey } from '../utils/cache';

export function useAnalytics({ accessToken, baseUrl, shopName, updateState, onBillingUpdate }) {
  const fetchAnalytics = useCallback(async (forceRefresh = false, silent = false) => {
    try {
      const cacheKey = getCacheKey.analytics(shopName);

      if (!forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          onBillingUpdate?.(cachedData.billing);
          updateState({
            analyticsData: cachedData.data || [],
            usage: {
              used: cachedData.billing.totalCalls,
              plan: cachedData.billing.plan,
              limit: cachedData.billing.maxCountsAllowed,
            },
            isLoading: false
          });
          return;
        }
      }

      if (!silent) {
        updateState({ isLoading: true });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const fetchUrl = `${baseUrl}/api/analytics-fast${forceRefresh ? '?sync=true' : ''}`;
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      apiCache.set(cacheKey, data);
      onBillingUpdate?.(data.billing);

      updateState({
        analyticsData: data.data || [],
        usage: {
          used: data.billing.totalCalls,
          plan: data.billing.plan,
          limit: data.billing.maxCountsAllowed,
        },
        isLoading: false
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        updateState({ error: 'Request timeout - please try again', isLoading: false });
      } else {
        updateState({ error: err.message, isLoading: false });
      }
    }
  }, [accessToken, baseUrl, shopName, updateState, onBillingUpdate]);

  useEffect(() => {
    if (accessToken && baseUrl) {
      fetchAnalytics();
    }
  }, [accessToken, baseUrl]);

  return { fetchAnalytics };
}
