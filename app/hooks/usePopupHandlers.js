import { useCallback } from 'react';
import { apiCache, getCacheKey } from '../utils/cache';
import { getCachedBillingPlanSync } from '../utils/billingCache.client';

export function usePopupHandlers({
  accessToken,
  baseUrl,
  shopName,
  analyticsData,
  hasValidPlan,
  updateState,
  navigate,
  fetchAnalytics
}) {
  const handleDeletePopup = useCallback(async (popupID) => {
    try {
      if (!accessToken) {
        throw new Error('User is not authenticated.');
      }

      updateState({ deletingPopupId: popupID });

      const response = await fetch(`${baseUrl}/api/delete-popup`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: popupID }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete the popup.');
      }

      updateState({
        analyticsData: analyticsData.filter((popup) => popup.id !== popupID),
        selectedAnalyticData: null,
        selectedPopup: null
      });
    } catch (error) {
      console.error('Error deleting popup:', error.message);
      updateState({ error: `Error: ${error.message}` });
    } finally {
      updateState({ deletingPopupId: null });
    }
  }, [accessToken, baseUrl, analyticsData, updateState]);

  const handleToggleChange = useCallback(async (e, popup) => {
    if (!hasValidPlan) {
      e.preventDefault();
      updateState({ showSubscriptionRequired: true });
      setTimeout(() => {
        updateState({ showSubscriptionRequired: false });
      }, 5000);
      return;
    }

    const newStatus = e.target.checked;
    
    // Note: Client-side validation is now handled in PopupItem component
    // The toggle is disabled if free plan limit would be exceeded
    // This prevents the API call entirely for better UX

    updateState({ togglingPopupId: popup.id });

    // Store previous state for potential rollback
    const previousAnalyticsData = analyticsData;
    
    // Optimistically update UI for better UX
    updateState({
      analyticsData: analyticsData.map((p) => (p.id === popup.id ? { ...p, status: newStatus } : p))
    });

    try {
      const response = await fetch(`${baseUrl}/api/toggle-popup`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: popup.id,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if it's a Free plan limit error (server-side validation as backup)
        if (result.error === 'FREE_PLAN_LIMIT' || result.requiresUpgrade) {
          // Revert the UI change
          updateState({
            analyticsData: previousAnalyticsData,
            error: result.message || 'Free plan allows only 1 active popup at a time. Please deactivate the other active popup first or upgrade to a paid plan.',
            showFreePlanLimit: true
          });
          // Hide the error after 8 seconds
          setTimeout(() => {
            updateState({ showFreePlanLimit: false, error: null });
          }, 8000);
          return;
        }
        throw new Error(result.error || result.message || 'Failed to update popup status');
      }

      console.log(`✅ Popup ${popup.id} ${newStatus ? 'activated' : 'deactivated'}. Active popups:`, result.activePopupIds);
      
      // Clear cache to force fresh data on next fetch
      apiCache.delete(getCacheKey.analytics(shopName));
      
      // Refresh analytics in background to sync with server
      // Use a small delay to ensure server has processed the change
      // Catch all errors to prevent crashes
      if (fetchAnalytics) {
        setTimeout(() => {
          fetchAnalytics(true, true).catch((refreshError) => {
            console.warn('⚠️ Failed to refresh analytics after toggle (non-critical):', refreshError.message);
            // State is already correct from optimistic update
            // Don't revert or show error - the toggle was successful
          });
        }, 500); // Small delay to ensure server has processed the change
      }
    } catch (err) {
      console.error('Error updating popup status:', err.message);
      // Revert the UI change on error
      updateState({
        analyticsData: previousAnalyticsData,
        error: `Error: ${err.message}`
      });
      // Hide error after 5 seconds
      setTimeout(() => {
        updateState({ error: null });
      }, 5000);
    } finally {
      updateState({ togglingPopupId: null });
    }
  }, [hasValidPlan, analyticsData, updateState, baseUrl, accessToken, shopName, fetchAnalytics]);

  const handleChartClick = useCallback((id) => {
    const selectedData = analyticsData.find((popup) => popup.id === id);
    updateState({ selectedAnalyticData: selectedData });
  }, [analyticsData, updateState]);

  const handleEditPopup = useCallback((popupID) => {
    updateState({ loadingPopupId: popupID });
    sessionStorage.setItem('selectedPopupID', JSON.stringify(popupID));
    navigate("/app/popup");
  }, [navigate, updateState]);

  const handleRefreshData = useCallback(async () => {
    updateState({ isRefreshing: true });
    apiCache.delete(getCacheKey.analytics(shopName));
    await fetchAnalytics(true, true);
    updateState({ isRefreshing: false });
  }, [shopName, fetchAnalytics, updateState]);

  return {
    handleDeletePopup,
    handleToggleChange,
    handleChartClick,
    handleEditPopup,
    handleRefreshData
  };
}
