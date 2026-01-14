import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Button,
  ProgressBar,
  InlineGrid,
  Badge,
  Box,
  Tabs,
  Icon,
  Text,
  BlockStack,
  InlineStack,
  Layout,
  Banner,
  Spinner
} from '@shopify/polaris';
import { CheckIcon } from '@shopify/polaris-icons';
import { getPlanDetails, getAllPlans } from '../config/planUtils';
import { handleBilling, cancelBilling, checkSubscriptionStatus } from '../utils/subscription.server';
import './_index/additionalStyle.css';
import { authenticate } from '../shopify.server';
import db from '../db.server';
import { clearBillingPlanCache } from '../utils/billingCache.client';

export async function loader({ request }) {
  const { admin, session, billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shop = session.shop;

  if (!shop) {
    console.error('Missing shop parameter in URL');
    return json({ error: 'Missing shop parameter in URL' }, { status: 400 });
  }

  const planName = url.searchParams.get('planName');
  const billingCycle = url.searchParams.get('cycle');
  const actionType = url.searchParams.get('actionType');

  if (!admin || !session || !billing) {
    console.error('Failed to authenticate in loader');
    return json({ error: 'Unable to authenticate' }, { status: 401 });
  }

  if (
    planName &&
    billingCycle &&
    actionType === 'select'
  ) {
    const planDetails = getPlanDetails(planName, billingCycle);
    const billingRedirect = await handleBilling(session, billing, planDetails);

    if (billingRedirect) {
      return redirect(billingRedirect);
    }
  }

  let subscriptionStatus, accessToken, baseUrl, activePlanDetails;
  try {
    subscriptionStatus = await checkSubscriptionStatus(admin, session);
    accessToken = session.accessToken;
    baseUrl = process.env.SHOPIFY_APP_URL;
    
    // Use Shopify subscription status as source of truth
    // If Shopify says no subscription, user is on Free tier regardless of DB
    if (!subscriptionStatus.subscribed || subscriptionStatus.plan === 'Free' || !subscriptionStatus.plan) {
      activePlanDetails = {
        plan: 'Free',
        totalCalls: 0,
        status: true, // Free plan is always "active"
      };
    } else {
      // For paid plans, check DB but prioritize Shopify status
      const dbBilling = await db.billingDetails.findFirst({
        where: { 
          shopName: shop,
          status: true, // Only get active billing records
        },
      });

      if (dbBilling && subscriptionStatus.subscribed) {
        activePlanDetails = {
          ...dbBilling,
          plan: subscriptionStatus.plan || dbBilling.plan, // Use Shopify plan as source of truth
        };
        if (activePlanDetails.totalCalls == null) {
          activePlanDetails.totalCalls = 0;
        }
      } else {
        // Shopify says subscribed but DB doesn't match, or DB record is inactive
        activePlanDetails = {
          plan: subscriptionStatus.plan || 'Free',
          totalCalls: 0,
          status: subscriptionStatus.subscribed,
        };
      }
    }
  } catch (error) {
    console.error('Database error fetching billing details:', error);
    // Fallback: check DB for any billing record (even inactive)
    const dbBilling = await db.billingDetails.findFirst({
      where: { shopName: shop },
    });
    
    if (dbBilling && dbBilling.status) {
      activePlanDetails = {
        ...dbBilling,
        totalCalls: dbBilling.totalCalls || 0,
      };
    } else {
      activePlanDetails = {
        plan: 'Free',
        totalCalls: 0,
        status: false,
      };
    }
  }

  return json({ activePlanDetails, accessToken, baseUrl, shopName: shop, planName });
}

export async function action({ request }) {
  const formData = await request.formData();
  const { admin, session, billing } = await authenticate.admin(request);

  if (!admin || !session || !billing) {
    console.error('Authentication details missing:', {
      hasAdmin: !!admin,
      hasSession: !!session,
      hasBilling: !!billing,
    });
    return json({ error: 'Unable to authenticate' }, { status: 401 });
  }

  const { planName, billingCycle, actionType } = Object.fromEntries(formData);

  try {
    if (actionType === 'cancel') {
      const result = await cancelBilling(admin, session, billing);

      if (!result.success) {
        return json({
          error: result.message || 'Failed to cancel subscription',
        }, { status: 400 });
      }

      return json({
        success: true,
        message: 'Subscription cancelled successfully',
      });
    }

    if (actionType === 'select') {
      const shop = session.shop;
      const redirectUrl = `/app/billing?planName=${planName}&cycle=${billingCycle}&actionType=select&shop=${shop}`;
      return json({ redirectTo: redirectUrl });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error handling plan selection:', error);
    return json({
      error: error.message || 'Failed to handle billing action.',
    }, { status: 500 });
  }
}

export default function BillingPage() {
  const { activePlanDetails, planName, accessToken, baseUrl, shopName } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [totalCalls, setTotalCalls] = useState(0);
  // const [isLoading, setIsLoading] = useState(false);
  const forcePlanNone = false;
  // Add this new state to track which plan is being processed
  const [processingPlan, setProcessingPlan] = useState(null);
  
  useEffect(() => {
    clearBillingPlanCache(shopName);
  }, [shopName]);
  
  const customStyles = {
    smallerText: {
      fontSize: '0.9rem',
    },
    smallHeading: {
      fontSize: '1.1rem',
    },
    mediumHeading: {
      fontSize: '1.3rem',
    },
    largeHeading: {
      fontSize: '1.8rem',
      fontWeight: 'bold'
    },
    cancelButton: {
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'rgb(215, 44, 13)',
      boxShadow: '0px 1px 0px rgba(0, 0, 0, 0.05)',
      backgroundColor: 'transparent',
      color: 'rgb(215, 44, 13)',
      fontWeight: 'bold'
    },
    popularPlan: {
      position: 'relative',
      border: '2px solid #5C6BC0',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(92, 107, 192, 0.15)'
    },
    popularBadge: {
      position: 'absolute',
      top: '-12px',
      right: '16px',
      backgroundColor: '#5C6BC0',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      zIndex: 10
    }
  };
    
  // Get all plans from the configuration
  // const allPlans = getAllPlans(billingCycle);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/analytics`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        setTotalCalls(data.billing.totalCalls || 0);
      } catch (err) {
      }
    };

    fetchAnalytics();
  }, [accessToken, baseUrl, planName]);
  
  useEffect(() => {
    if (fetcher.data && fetcher.data.redirectTo) {
      const url = new URL(fetcher.data.redirectTo, window.location.origin);
      const shop = new URLSearchParams(window.location.search).get('shop');

      if (shop) {
        url.searchParams.set('shop', shop);
      }

      navigate(url.pathname + url.search, { replace: true });
    }
    
    // Reset processing plan when the action is complete
    if (fetcher.state === 'idle') {
      setProcessingPlan(null);
    }
  }, [fetcher.data, fetcher.state, navigate]);

  const handlePlanSelection = (planName, isCurrentPlan) => {
    const actionType = isCurrentPlan ? 'cancel' : 'select';
    setProcessingPlan(planName); // Set which plan is being processed
    fetcher.submit(
      { planName, billingCycle, actionType },
      { method: 'post' }
    );
  };

  const getCurrentPlanViewLimit = () => {
    if (activePlanDetails.plan === 'None' || 
        activePlanDetails.plan === 'Free' || 
        activePlanDetails.plan === 'Starter') {
      return 0;
    }
    
    const planDetails = getPlanDetails(activePlanDetails.plan, billingCycle);
    if (!planDetails || !planDetails.viewLimit) {
      return 0;
    }
    return planDetails.viewLimit;
  };

  const currentPlanViewLimit = getCurrentPlanViewLimit();
  const callLimitProgress = currentPlanViewLimit ? (totalCalls / currentPlanViewLimit) * 100 : 0;

  const tabs = [
    { id: 'monthly', content: 'Monthly Plans', panelID: 'monthly-plans' },
    { id: 'annual', content: 'Annual Plans (Save 33%)', panelID: 'annual-plans' },
  ];

  const hasActivePlan = forcePlanNone ? false : (activePlanDetails.plan === 'Essential' || activePlanDetails.plan === 'Professional');
  const currentPlanName = forcePlanNone ? 'none' : activePlanDetails?.plan?.toLowerCase();

  // Render only Essential and Professional plans
  const renderPlans = (cycle) => {
      // Get plans from configuration instead of hardcoding
      const allPlansForCycle = getAllPlans(cycle);
      
      // Filter to only show Essential and Professional plans
      const filteredPlanNames = ['Essential', 'Professional'];
      const filteredPlans = filteredPlanNames.map(planName => [
        planName, 
        {
          amount: allPlansForCycle[planName].amount,
          viewLimit: allPlansForCycle[planName].viewLimit
        }
      ]);

    return (
      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="500">
        {filteredPlans.map(([planName, planDetails]) => {
          const isCurrentPlan = !forcePlanNone && currentPlanName === planName.toLowerCase();
          const isPopular = planName === 'Professional';

          return (
            <div key={`${planName}-${cycle}`} style={isPopular ? customStyles.popularPlan : {}}>
              {isPopular && (
                <div style={customStyles.popularBadge}>
                  MOST POPULAR
                </div>
              )}
              <Card>
              <BlockStack gap="500">
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text variant="headingLg" as="h3" fontWeight="bold" style={customStyles.mediumHeading}>
                      {planName}
                    </Text>
                    {isCurrentPlan && (
                      <Badge status="success">Active</Badge>
                    )}
                  </InlineStack>
                  <Text variant="headingMd" as="p" fontWeight="bold" color="success">
                    {planDetails.viewLimit.toLocaleString()} popup renders/month
                  </Text>
                  <Text variant="bodyMd" style={customStyles.smallerText} tone="subdued">
                    Each unique visitor counted only once
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="medium" style={customStyles.smallerText}>
                    ✨ All features included:
                  </Text>
                  
                  <InlineStack gap="200" blockAlign="center">
                    <div>
                      <Icon source={CheckIcon} color="success" />
                    </div>
                    <Text style={customStyles.smallerText}>
                      Smart popup targeting & rules
                    </Text>
                  </InlineStack>
                  
                  <InlineStack gap="200" blockAlign="center">
                    <div>
                      <Icon source={CheckIcon} color="success" />
                    </div>
                    <Text style={customStyles.smallerText}>
                      Real-time analytics & insights
                    </Text>
                  </InlineStack>
                  
                  <InlineStack gap="200" blockAlign="center">
                    <div>
                      <Icon source={CheckIcon} color="success" />
                    </div>
                    <Text style={customStyles.smallerText}>
                      Mobile & device optimization
                    </Text>
                  </InlineStack>
                  
                  <InlineStack gap="200" blockAlign="center">
                    <div>
                      <Icon source={CheckIcon} color="success" />
                    </div>
                    <Text style={customStyles.smallerText}>
                      Custom design & branding
                    </Text>
                  </InlineStack>
                  
                  <InlineStack gap="200" blockAlign="center">
                    <div>
                      <Icon source={CheckIcon} color="success" />
                    </div>
                    <Text style={customStyles.smallerText}>
                      Live chat support & documentation
                    </Text>
                  </InlineStack>
                </BlockStack>
                
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <div
                      style={{
                        marginBottom: 15,
                        display: 'flex',
                        alignItems: 'baseline',
                      }}
                    >
                      <Text variant="headingXl" as="p" style={customStyles.mediumHeading}>
                        ${planDetails.amount.toFixed(2)}
                      </Text>
                      <Text variant="bodyMd" as="span" color="subdued" style={{ marginLeft: 6, ...customStyles.smallerText }}>
                        /{cycle === 'monthly' ? 'month' : 'year'}
                      </Text>
                    </div>
                    {cycle === 'annual' && (
                      <Text variant="bodyMd" as="p" color="success" style={{ marginTop: 8, fontWeight: '600', fontSize: '0.9rem' }}>
                        Save ${((planDetails.amount / 8) * 12 - planDetails.amount).toFixed(0)} per year
                      </Text>
                    )}
                  </BlockStack>
                </Box>
                <Box paddingBlockStart="500">
                  <Button
                    variant={isCurrentPlan ? 'outline' : 'primary'}
                    destructive={isCurrentPlan}
                    style={isCurrentPlan ? customStyles.cancelButton : {}}
                    onClick={() => handlePlanSelection(planName, isCurrentPlan)}
                    fullWidth
                    size="large"
                    disabled={processingPlan !== null}
                  >
                  {processingPlan === planName ? ( // Only show spinner for the clicked plan
                      <InlineStack align="center" gap="300">
                        <Spinner size="small" />
                        <span>{isCurrentPlan ? 'Cancelling...' : 'Processing...'}</span>
                      </InlineStack>
                    ) : (
                      isCurrentPlan ? 'Cancel subscription' : 'Choose this plan'
                    )}
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </div>
          );
        })}
      </InlineGrid>
    );
  };

  return (
    <Page >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {!hasActivePlan && (
              <Banner
                title="Your app requires a subscription"
                tone="warning"
              >
                <p>Please select one of our plans below to continue using all features of the app.</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="500">
                <div style={{ textAlign: 'center' }}>
                  <Text variant="headingXl" as="h1" style={customStyles.largeHeading}>
                    Choose Your Plan
                  </Text>
                  <Text variant="bodyLg" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                    All plans include the same powerful features. Choose based on your monthly visitor volume.
                  </Text>
                </div>
                
                <Tabs
                  tabs={tabs}
                  selected={billingCycle === 'monthly' ? 0 : 1}
                  onSelect={(index) => setBillingCycle(index === 0 ? 'monthly' : 'annual')}
                  fitted
                >
                  <Box paddingBlockStart="500">{renderPlans(billingCycle)}</Box>
                </Tabs>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
