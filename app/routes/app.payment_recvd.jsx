import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkSubscriptionStatus, handleBilling } from "../utils/subscription.server";
import db from "../db.server";
import { registerWebhooks } from "../utils/registerWebhooks";

// Helper function to parse plan name and billing cycle
function parsePlanAndCycle(fullPlanName) {
  const planMap = {
    'Free Plan': { plan: 'Free', cycle: 'Monthly' },
    'Starter Monthly Plan': { plan: 'Starter', cycle: 'Monthly' },
    'Starter Annual Plan': { plan: 'Starter', cycle: 'Annual' },
    'Essential Monthly Plan': { plan: 'Essential', cycle: 'Monthly' },
    'Essential Annual Plan': { plan: 'Essential', cycle: 'Annual' },
    'Professional Monthly Plan': { plan: 'Professional', cycle: 'Monthly' },
    'Professional Annual Plan': { plan: 'Professional', cycle: 'Annual' },
  };

  return planMap[fullPlanName] || { plan: 'Free', cycle: 'Monthly' };
}

async function updateBilling(shop, plan, cycle, amountBilled = 0) {
  const activeBilling = await db.billingDetails.findFirst({
    where: {
      shopName: shop,
      status: true, // Ensures we find the active billing record
    },
  });

  if (activeBilling) {
    if (plan === 'Free' && activeBilling.plan === 'Free') {
      return { status: 'already_free' };
    }

    await db.billingDetails.update({
      where: { id: activeBilling.id },
      data: {
        plan,
        billingCycle: cycle,
        totalAmountBilled: { increment: amountBilled },
        updatedAt: new Date(),
        status: true
      },
    });
  } else {
    // Use upsert to avoid unique constraint errors
    await db.billingDetails.upsert({
      where: { shopName: shop },
      update: {
        plan,
        billingCycle: cycle,
        totalAmountBilled: amountBilled,
        status: true,
        updatedAt: new Date(),
      },
      create: {
        shopName: shop,
        plan,
        billingCycle: cycle,
        totalAmountBilled: amountBilled,
        status: true,
        startDate: new Date(),
      },
    });
  }
  return { status: 'updated' };
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "unknown";
  
  try {
    const { admin, session, billing } = await authenticate.admin(request);
    // Skip webhook registration during payment flow to avoid errors
    // registerWebhooks(admin, session);
    const chargeId = url.searchParams.get("charge_id");

    if (chargeId === 'free_plan') {
      const dbResult = await updateBilling(shop, 'Free', 'Monthly');
      return json({
        subscribed: true,
        shop,
        plan: 'Free',
        shouldRedirect: true,
        alreadyFree: dbResult.status === 'already_free'
      });
    }

    if (!chargeId) {
      return json({ subscribed: false, shop, error: "No charge ID provided" });
    }

    const subscriptionStatus = await checkSubscriptionStatus(admin, session);
    let chargeDetails;

    try {
      // Fetch charge details using the provided charge ID
      const response = await admin.graphql(
        `
        query getChargeDetails($id: ID!) {
          node(id: $id) {
            ... on AppSubscription {
              name
              status
              lineItems {
                plan {
                  pricingDetails {
                    ... on AppRecurringPricing {
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
        {
          variables: {
            id: `gid://shopify/AppSubscription/${chargeId}`,
          },
        }
      );

      const responseJson = await response.json();
      chargeDetails = responseJson.data.node;
    } catch (error) {
      console.error("Error fetching charge details:", error);
      return json({ subscribed: false, shop, error: "Failed to fetch subscription details" });
    }

    const fullPlanName = chargeDetails?.name || "Starter Monthly Plan";
    const { plan, cycle } = parsePlanAndCycle(fullPlanName);
    const amountBilled = parseFloat(chargeDetails?.lineItems[0]?.plan?.pricingDetails?.price?.amount || 0);

    if (subscriptionStatus.subscribed) {
      const dbResult = await updateBilling(shop, plan, cycle, amountBilled);
      return json({ 
        subscribed: true, 
        shop, 
        plan, 
        shouldRedirect: true,
        alreadyFree: dbResult.status === 'already_free'
      });
    }

    return json({ 
      subscribed: false, 
      shop, 
      billingRedirectUrl: await handleBilling(session, billing, fullPlanName), 
      shouldRedirect: false 
    });
  } catch (error) {
    console.error("Error:", error);
    return json({ subscribed: false, shop, error: "Failed to process subscription" });
  }
};

const PaymentReceivedPage = () => {
  const navigate = useNavigate();
  const { subscribed, shop, plan, billingRedirectUrl, error, shouldRedirect, alreadyFree } = useLoaderData();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let timeoutId;

    const handleRedirect = () => {
      setIsProcessing(true);

      if (shouldRedirect) {
        if (subscribed && shop) {
          timeoutId = setTimeout(() => {
            if (alreadyFree) {
              setIsProcessing(false);
            } else {
              navigate("/app");
            }
          }, 100);
        } else if (billingRedirectUrl) {
          timeoutId = setTimeout(() => {
            window.location.href = billingRedirectUrl;
          }, 100);
        }
      } else {
        setIsProcessing(false);
      }
    };

    handleRedirect();
    return () => timeoutId && clearTimeout(timeoutId);
  }, [shouldRedirect, subscribed, shop, billingRedirectUrl, navigate, alreadyFree]);

  if (error) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Processing Payment</h1>
        <p className="text-gray-600">An error occurred. Please try again or contact support.</p>
        <p className="text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  if (alreadyFree) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Already on Free Plan</h1>
        <p className="text-gray-600">You are already subscribed to the Free plan.</p>
        <button 
          onClick={() => navigate("/app")}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to App
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.6rem' }}>
      <div>Payment Received</div>
      <div style={{ fontSize: '1.2rem', fontWeight: '600', marginTop: '10px', textAlign: 'center' }}>
        {isProcessing ? `We are processing your payment for the ${plan || 'Starter'}. Please wait a moment...` : 'Processing complete.'}
      </div>
    </div>
  );
};

export default PaymentReceivedPage;