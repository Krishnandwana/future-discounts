import { useCallback } from 'react';
import { apiCache, getCacheKey } from '../utils/cache';

export function useWizardHandlers({
  accessToken,
  baseUrl,
  shopName,
  hasPopups,
  isLoading,
  updateState,
  navigate,
  fetchAnalytics
}) {
  const handleStartQuickSetup = useCallback(() => {
    if (!isLoading) {
      updateState({ showWizard: true });
    }
  }, [isLoading, updateState]);

  const handleCreateFromScratch = useCallback(() => {
    updateState({ isLoading2: true, showWizard: false });
    sessionStorage.removeItem("selectedPopupID");
    navigate("/app/popup");
  }, [navigate, updateState]);

  const handleWizardComplete = useCallback(async (wizardData) => {
    if (wizardData) {
      try {
        updateState({ isLoading2: true });

        const response = await fetch(`${baseUrl}/api/post_popup`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(wizardData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create campaign');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || data.message || 'API returned failure status');
        }

        console.log('✅ Popup created successfully:', data.data);

        if (data.data && data.data.id) {
          sessionStorage.setItem('selectedPopupID', JSON.stringify(data.data.id));
          console.log('💾 Saved popup ID to sessionStorage:', data.data.id);
        }

        apiCache.delete(getCacheKey.analytics(shopName));
        await fetchAnalytics(true, true);
        updateState({ isLoading2: false, wizardCompleted: true, showWizard: false });
        navigate('/app');

        return data.data; // Return the created popup data for any follow-up actions
      } catch (error) {
        updateState({ isLoading2: false });
        throw error;
      }
    } else {
      // User skipped wizard - just close the wizard and stay on /app
      updateState({ showWizard: false, isLoading2: false });
      sessionStorage.removeItem("selectedPopupID");
      return null;
    }
  }, [accessToken, baseUrl, shopName, updateState, navigate, fetchAnalytics]);

  const handleNavigateToBilling = useCallback(() => {
    updateState({ isNavigatingToBilling: true });
    setTimeout(() => {
      navigate('/app/billing');
    }, 500);
  }, [navigate, updateState]);

  return {
    handleStartQuickSetup,
    handleCreateFromScratch,
    handleWizardComplete,
    handleNavigateToBilling
  };
}
