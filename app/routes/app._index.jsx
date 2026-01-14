import { useEffect, useState, useCallback, useMemo } from 'react';
import { Page, Layout, BlockStack, Spinner } from '@shopify/polaris';
import { useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { checkSubscriptionStatus } from "../utils/subscription.server";
import { getLogLevel } from '../utils/metafields.server';
import FeedbackPopup from '../components/FeedbackPopup';
import SetupWizard from '../components/SetupWizard';
import UsageProgressBar from '../components/Dashboard/UsageProgressBar';
import SubscriptionRequiredBanner from '../components/Dashboard/SubscriptionRequiredBanner';
import FreePlanLimitBanner from '../components/Dashboard/FreePlanLimitBanner';
import PopupItem from '../components/Dashboard/PopupItem';
import EmptyStatePopup from '../components/Dashboard/EmptyStatePopup';
import AnalyticsSection from '../components/Dashboard/AnalyticsSection';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import ErrorDisplay from '../components/Dashboard/ErrorDisplay';
import DashboardContainer from '../components/Dashboard/DashboardContainer';
import DashboardStyles from '../components/Dashboard/DashboardStyles';
import { useAnalytics } from '../hooks/useAnalytics';
import { usePopupHandlers } from '../hooks/usePopupHandlers';
import { useWizardHandlers } from '../hooks/useWizardHandlers';
import {
  getCachedBillingPlan,
  persistBillingPlanCache,
  clearBillingPlanCache
} from '../utils/billingCache.client';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  let subscriptionStatus, accessToken, baseUrl, shopName, planName, slackWebhookUrl, appEmbedEnabled, logLevel, extensionId;

  try {
    subscriptionStatus = await checkSubscriptionStatus(admin, session);
    accessToken = session.accessToken;
    baseUrl = process.env.SHOPIFY_APP_URL;
    slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    extensionId = process.env.SHOPIFY_EXTENSION_ID;
    shopName = session.shop;

    // Extract the plan name and normalize it
    const planFullName = subscriptionStatus.plan || '';
    if (planFullName.includes('Essential')) {
      planName = 'Essential';
    } else if (planFullName.includes('Professional')) {
      planName = 'Professional';
    } else {
      planName = 'Free';
    }

    // Check app embed status using REST API
    try {
      // First, get the published theme ID via GraphQL
      const themesResponse = await admin.graphql(`
        #graphql
        query {
          themes(first: 10, roles: MAIN) {
            nodes {
              id
              name
              role
            }
          }
        }
      `);

      const themesData = await themesResponse.json();
      const publishedTheme = themesData?.data?.themes?.nodes?.[0];

      if (publishedTheme) {
        // Fetch settings_data.json using GraphQL
        const settingsResponse = await admin.graphql(
          `#graphql
          query getThemeSettings($id: ID!) {
            theme(id: $id) {
              files(filenames: ["config/settings_data.json"]) {
                nodes {
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }`,
          {
            variables: {
              id: publishedTheme.id,
            },
          }
        );

        const settingsJson = await settingsResponse.json();
        const settingsContent = settingsJson.data?.theme?.files?.nodes?.[0]?.body?.content;
        if (settingsContent) {
          // Robust parsing: Strip comments by finding the first '{' and last '}'
          const jsonStart = settingsContent.indexOf('{');
          const jsonEnd = settingsContent.lastIndexOf('}');
          const cleanJson = (jsonStart !== -1 && jsonEnd !== -1)
            ? settingsContent.substring(jsonStart, jsonEnd + 1)
            : settingsContent;

          const settings = JSON.parse(cleanJson);

          // Check if our app embed is in the blocks and not disabled
          const appEmbeds = settings?.current?.blocks || {};

          // Our extension UID from environment
          const ourAppEmbed = Object.entries(appEmbeds).find(([key, value]) => {
            return key.includes(extensionId) ||
              key.includes('convertboost') ||
              key.includes('convert-boost') ||
              key.includes('geo-deals') ||
              value?.type?.includes(extensionId) ||
              value?.type?.includes('convertboost') ||
              value?.type?.includes('convert-boost') ||
              value?.type?.includes('geo-deals');
          });

          if (ourAppEmbed) {
            const [blockKey, blockData] = ourAppEmbed;
            appEmbedEnabled = blockData.disabled !== true;
            console.log(`✅ App embed found: ${blockKey}, enabled: ${appEmbedEnabled}`);
          } else {
            appEmbedEnabled = false;
            console.log('⚠️ App embed not found in theme settings');
          }
        } else {
          appEmbedEnabled = null;
          console.log('⚠️ Could not read theme settings data');
        }
      } else {
        appEmbedEnabled = null;
        console.log('⚠️ No published theme found');
      }

    } catch (embedError) {
      console.error('Error checking app embed status:', embedError.message);
      appEmbedEnabled = null; // Unknown status
    }

    // Fetch log level from metafields
    try {
      const shopGid = `gid://shopify/Shop/${session.shop.split('.')[0]}`;
      logLevel = await getLogLevel(admin, shopGid);
    } catch (logError) {
      console.error('Error fetching log level:', logError.message);
      logLevel = 'warn'; // Default to warn
    }

  } catch (error) {
    // Handle the error case
    console.error('Error retrieving subscription status:', error);
    return {
      errors: 'Something went wrong, please reload the page.',
      reloadButton: true,
    };
  }

  return { accessToken, baseUrl, shopName, subscriptionStatus, slackWebhookUrl, planName, appEmbedEnabled, logLevel, extensionId };
};

export default function Index() {
  const { accessToken, baseUrl, shopName, planName, slackWebhookUrl, subscriptionStatus: initialSubscriptionStatus, errors, reloadButton, appEmbedEnabled: initialAppEmbedEnabled, logLevel, extensionId } = useLoaderData();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [billingPlan, setBillingPlan] = useState(planName);

  // Set log level globally for the app
  useEffect(() => {
    if (typeof window !== 'undefined' && logLevel) {
      window.__CONVERTBOOST_LOG_LEVEL__ = logLevel;
      // Dynamically import and initialize logger
      import('../utils/logger.client').then(({ default: logger }) => {
        logger.setLevel(logLevel);
      });
    }
  }, [logLevel]);

  // Consolidated state for better performance
  const [state, setState] = useState({
    isLoading: true,
    analyticsData: [],
    usage: null,
    error: null,
    selectedPopup: null,
    selectedAnalyticData: null,
    isInitialized: false,
    showSubscriptionRequired: false,
    showFreePlanLimit: false,
    loadingPopupId: null,
    isLoading2: false,
    showWizard: false,
    isRefreshing: false,
    appEmbedEnabled: initialAppEmbedEnabled, // Use server-side value
    isNavigatingToBilling: false,
    togglingPopupId: null,
    deletingPopupId: null,
    wizardCompleted: false // Track if wizard was just completed
  });

  // Destructure for backward compatibility
  const {
    isLoading, analyticsData, usage, error, selectedPopup, selectedAnalyticData,
    isInitialized, showSubscriptionRequired, showFreePlanLimit, loadingPopupId, isLoading2,
    showWizard, isRefreshing, appEmbedEnabled, isNavigatingToBilling, togglingPopupId,
    deletingPopupId, wizardCompleted
  } = state;

  const subscriptionStatus = initialSubscriptionStatus;

  const normalizePlanName = useCallback((incomingPlan) => {
    if (!incomingPlan) return 'Free';
    const lower = incomingPlan.toLowerCase();
    if (lower.includes('professional')) return 'Professional';
    if (lower.includes('essential')) return 'Essential';
    return 'Free';
  }, []);

  // Optimized state updaters
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Memoized computed values
  const hasPopups = useMemo(() => analyticsData?.length > 0, [analyticsData]);
  const hasValidPlan = useMemo(() =>
    billingPlan === 'Free' || billingPlan === 'Essential' || billingPlan === 'Professional',
    [billingPlan]
  );

  const quickSetupStorageKey = useMemo(() => `convertboost_quick_setup_seen_${shopName}`, [shopName]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const cachedPlan = getCachedBillingPlan(shopName);
    if (cachedPlan) {
      setBillingPlan(cachedPlan);
    }
  }, [shopName]);

  useEffect(() => {
    if (!planName) {
      return;
    }
    const normalizedPlan = normalizePlanName(planName);
    setBillingPlan(normalizedPlan);
    persistBillingPlanCache(shopName, normalizedPlan);
  }, [planName, shopName, normalizePlanName]);

  const handleBillingUpdate = useCallback((billingDetails) => {
    if (!billingDetails) {
      return;
    }
    const normalizedPlan = normalizePlanName(billingDetails.plan || billingDetails.actualPlan || billingPlan);
    setBillingPlan(normalizedPlan);
    persistBillingPlanCache(shopName, normalizedPlan);
  }, [billingPlan, normalizePlanName, shopName]);

  const placeholderDailyViews = useMemo(() => {
    if (hasPopups) {
      return [];
    }

    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      return {
        date: day.toISOString(),
        viewCount: 0,
        availCount: 0,
        noViewCount: 0,
      };
    });
  }, [hasPopups]);

  const displayedAnalyticData = useMemo(() => {
    if (hasPopups && selectedAnalyticData) {
      return selectedAnalyticData;
    }

    if (!hasPopups && !isLoading) {
      return {
        id: 'placeholder',
        name: 'Create your first popup',
        updatedAt: null,
        status: false,
        interactions: 0,
        couponCount: 0,
        dailyViews: placeholderDailyViews,
        locationAnalytics: {},
      };
    }

    return null;
  }, [hasPopups, selectedAnalyticData, placeholderDailyViews, isLoading]);

  const isPlaceholderAnalytics = !hasPopups && !isLoading;

  useEffect(() => {
    setState(prev => {
      if (prev.appEmbedEnabled === initialAppEmbedEnabled) {
        return prev;
      }
      return { ...prev, appEmbedEnabled: initialAppEmbedEnabled };
    });
  }, [initialAppEmbedEnabled]);

  useEffect(() => {
    if (!showWizard && wizardCompleted) {
      revalidator.revalidate();
      updateState({ wizardCompleted: false });
    }
  }, [showWizard, wizardCompleted, revalidator, updateState]);

  // Auto-show wizard for first-time users only on their first visit
  useEffect(() => {
    if (isLoading || analyticsData === null || showWizard) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const hasVisited = window.localStorage.getItem(quickSetupStorageKey) === 'true';

    if (!hasVisited) {
      window.localStorage.setItem(quickSetupStorageKey, 'true');

      if (!hasPopups) {
        console.log('🚀 First-time user detected, showing quick-setup wizard...');
        updateState({ showWizard: true });
      }
    }
  }, [isLoading, analyticsData, showWizard, hasPopups, updateState, quickSetupStorageKey]);


  // Effect hooks
  useEffect(() => {
    if (!isInitialized) {
      // Removed automatic redirect to billing
      updateState({ isInitialized: true });
    }
  }, [isInitialized, updateState]);

  useEffect(() => {
    if (analyticsData?.length > 0) {
      updateState({ selectedAnalyticData: analyticsData[0] });
      const activePopup = analyticsData.find((popup) => popup.status);
      if (activePopup) {
        updateState({ selectedPopup: activePopup.id });
      }
    }
  }, [analyticsData, updateState]);

  // Custom hooks for business logic
  const { fetchAnalytics } = useAnalytics({
    accessToken,
    baseUrl,
    shopName,
    updateState,
    onBillingUpdate: handleBillingUpdate
  });

  const {
    handleDeletePopup,
    handleToggleChange,
    handleChartClick,
    handleEditPopup,
    handleRefreshData
  } = usePopupHandlers({
    accessToken,
    baseUrl,
    shopName,
    analyticsData,
    hasValidPlan,
    updateState,
    navigate,
    fetchAnalytics
  });

  const {
    handleStartQuickSetup,
    handleCreateFromScratch,
    handleWizardComplete,
    handleNavigateToBilling: navigateToBillingBase
  } = useWizardHandlers({
    accessToken,
    baseUrl,
    shopName,
    hasPopups,
    isLoading,
    updateState,
    navigate,
    fetchAnalytics
  });

  const handleNavigateToBilling = useCallback(() => {
    clearBillingPlanCache(shopName);
    navigateToBillingBase();
  }, [navigateToBillingBase, shopName]);

  // Render
  return (
    <>
      <FeedbackPopup shopName={shopName} slackWebhookUrl={slackWebhookUrl} />
      {errors && (
        <div className="alert alert-error">
          <p>{error}</p>
          {reloadButton && <button onClick={() => window.location.reload()}>Reload</button>}
        </div>
      )}
      <Page>
        <DashboardContainer>
          {!showWizard && (
            <>
              <div style={{ marginBottom: '32px' }}>
                <UsageProgressBar
                  usage={usage}
                  shopName={shopName}
                  isSubscribed={hasValidPlan}
                  appEmbedEnabled={appEmbedEnabled}
                  hasPopups={hasPopups}
                  extensionId={extensionId}
                />
              </div>

              <DashboardHeader
                hasPopups={hasPopups}
                hasValidPlan={hasValidPlan}
                isLoading={isLoading}
                isLoading2={isLoading2}
                isRefreshing={isRefreshing}
                isNavigatingToBilling={isNavigatingToBilling}
                onNavigateToBilling={handleNavigateToBilling}
                onRefresh={handleRefreshData}
                onCreatePopup={handleCreateFromScratch}
                onStartQuickSetup={handleStartQuickSetup}
              />

              {showSubscriptionRequired && (
                <div style={{ marginBottom: "16px" }}>
                  <SubscriptionRequiredBanner isVisible={showSubscriptionRequired} />
                </div>
              )}
              {showFreePlanLimit && (
                <div style={{ marginBottom: "16px" }}>
                  <FreePlanLimitBanner 
                    isVisible={showFreePlanLimit} 
                    onNavigateToBilling={handleNavigateToBilling}
                  />
                </div>
              )}
            </>
          )}

          {showWizard ? (
            <SetupWizard
              onComplete={handleWizardComplete}
              appEmbedEnabled={appEmbedEnabled}
              shopName={shopName}
              extensionId={extensionId}
            />
          ) : (
            <Layout>
              <Layout.Section>
                {error ? (
                  <ErrorDisplay error={error} />
                ) : isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                    <Spinner size="large" />
                  </div>
                ) : hasPopups ? (
                  <BlockStack gap="400">
                    {analyticsData.map((popup) => (
                      <PopupItem
                        key={popup.id}
                        popup={popup}
                        onToggle={handleToggleChange}
                        onEdit={handleEditPopup}
                        onChart={handleChartClick}
                        onDelete={handleDeletePopup}
                        isSubscribed={hasValidPlan}
                        loadingPopupId={loadingPopupId}
                        deletingPopupId={deletingPopupId}
                        selectedAnalyticDataId={selectedAnalyticData?.id}
                        analyticsData={analyticsData}
                        shopName={shopName}
                        onNavigateToBilling={handleNavigateToBilling}
                      />
                    ))}
                  </BlockStack>
                ) : (
                  <EmptyStatePopup
                    onStartWizard={handleStartQuickSetup}
                    onCreateFromScratch={handleCreateFromScratch}
                    isCreating={isLoading2}
                  />
                )}
              </Layout.Section>

              {hasPopups && (
                <AnalyticsSection
                  displayedAnalyticData={displayedAnalyticData}
                  isPlaceholder={isPlaceholderAnalytics}
                />
              )}
            </Layout>
          )}
          <DashboardStyles />
        </DashboardContainer>
      </Page>
    </>
  );
}
