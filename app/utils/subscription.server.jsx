import { redirect } from "@remix-run/node";
import db from "../db.server";

// Function to check the subscription status and trial days
export async function checkSubscriptionStatus(admin, session) {
  try {
    // GraphQL query to fetch the active subscriptions and trial information for the app
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            createdAt
            name
            trialDays
            id
            currentPeriodEnd
            status
          }
        }
      }
    `;

    const response = await admin.graphql(query, { session });
    const responseData = await response.json();

    // Extract activeSubscriptions from the response
    const subscriptions = responseData.data?.currentAppInstallation?.activeSubscriptions;

    // Check if there are any active subscriptions
    if (!subscriptions || subscriptions.length === 0) {
      // Check the database for the Free plan
      const dbSubscription = await db.billingDetails.findFirst({
        where: { shopName: session.shop },
      });

      if (dbSubscription && dbSubscription.plan.toLowerCase() === "free") {
        return {
          subscribed: true,
          onTrial: false,
          plan: "Free",
          message: "User is on the Free plan.",
        };
      }

      return { subscribed: false, onTrial: false, plan: null, message: "No active subscription found." };
    }

    // Find an active subscription
    const activeSubscription = subscriptions.find(sub => sub.status === "ACTIVE");

    if (activeSubscription) {
      // Calculate the remaining trial days
      let remainingTrialDays = 0;
      if (activeSubscription.trialDays > 0) {
        const createdAt = new Date(activeSubscription.createdAt);
        const now = new Date();
        const diffTime = Math.max(
          0,
          createdAt.getTime() + activeSubscription.trialDays * 24 * 60 * 60 * 1000 - now.getTime()
        );
        remainingTrialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const onTrial = remainingTrialDays > 0;

      return {
        subscribed: true,
        onTrial,
        remainingTrialDays,
        plan: activeSubscription.name,
        message: onTrial
          ? `On trial: ${remainingTrialDays} days remaining.`
          : `Active subscription found: ${activeSubscription.name}`,
      };
    } else {
      return { subscribed: false, onTrial: false, plan: null, message: "No active subscription found." };
    }
  } catch (error) {
    console.error("Error checking subscription status:", error);
    throw new Error("Failed to check subscription status.");
  }
}

export async function handleBilling(session, billing, planDetails) {
  const shop = session.shop;

  try {
    const billingCheck = await billing.check({
      plans: [planDetails.name],
    });

    if (billingCheck.hasActivePayment) {
      return null; // No redirect needed, payment is active
    } else {
      // Construct the full return URL based on the app URL environment variable
      const shopName = shop.split(".")[0];
      const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/convertboost/app/payment_recvd?shop=${shop}`;

      const billingResponse = await billing.require({
        plans: [planDetails.name],
        onFailure: async () =>
          billing.request({
            plan: planDetails.name,
            isTest: process.env.NODE_ENV !== 'production',
            returnUrl: returnUrl.toString(),
          }),
      });

      if (billingResponse.confirmationUrl) {
        // Extract plan name from the plan details (e.g., "Essential Monthly Plan" -> "Essential")
        const planName = planDetails.name.split(' ')[0];

        // Create or update billing details in the database
        await db.billingDetails.upsert({
          where: {
            shopName: shop,
          },
          update: {
            plan: planName,
            totalNumberOfCalls: { increment: 1 },
            lastBillingDate: new Date(),
          },
          create: {
            shopName: shop,
            plan: planName,
            totalNumberOfCalls: 1,
            totalAmountBilled: 0.0,
            lastBillingDate: new Date(),
          },
        });

        return billingResponse.confirmationUrl;
      }
    }
  } catch (billingError) {
    if (billingError instanceof Response && billingError.status === 302) {
      return billingError;
    }
    throw billingError;
  }

  return null;
}


export async function cancelBilling(admin, session, billing) {
  // Add validation for required parameters
  if (!admin || !session || !billing) {
    console.error("Missing required parameters for cancelBilling");
    throw new Error("Missing required parameters: admin, session, and billing are required");
  }

  const shop = session.shop;

  try {

    // First, check the current subscription status
    const subscriptionStatus = await checkSubscriptionStatus(admin, session);

    if (!subscriptionStatus.subscribed) {
      return { success: false, message: "No active subscription found." };
    }

    // Fetch all active subscriptions
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
          }
        }
      }
    `;

    const response = await admin.graphql(query, { session });
    const responseData = await response.json();
    const activeSubscriptions = responseData.data?.currentAppInstallation?.activeSubscriptions;

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return { success: false, message: "No active subscriptions found." };
    }


    // Cancel each active subscription
    const cancellationResults = await Promise.all(
      activeSubscriptions.map(async (subscription) => {
        try {
          // Add validation before calling billing.cancel
          if (!billing.cancel) {
            throw new Error("Billing object does not have a cancel method");
          }

          const cancelledSubscription = await billing.cancel({
            subscriptionId: subscription.id,
            prorate: true,
          });


          return {
            planName: subscription.name,
            success: !!cancelledSubscription,
            message: cancelledSubscription
              ? `Successfully cancelled ${subscription.name}`
              : `Failed to cancel ${subscription.name}`,
          };
        } catch (error) {
          console.error(`Error cancelling ${subscription.name}:`, error);
          return {
            planName: subscription.name,
            success: false,
            message: `Error cancelling ${subscription.name}: ${error.message}`,
          };
        }
      })
    );

    const allCancelled = cancellationResults.every((result) => result.success);
    const message = cancellationResults
      .map((result) => result.message)
      .join("; ");

    if (allCancelled) {
      try {
        // Mark billing as inactive instead of deleting (preserves history)
        await db.billingDetails.updateMany({
          where: {
            shopName: shop,
          },
          data: {
            status: false, // Mark as inactive
          },
        });
      } catch (dbError) {
        console.error("Error updating billing details:", dbError);
        // Continue with the cancellation response even if DB cleanup fails
      }

      return { success: true, message: `All subscriptions cancelled. ${message}` };
    } else {
      return { success: false, message: `Some cancellations failed. ${message}` };
    }
  } catch (error) {
    console.error("Error in cancellation process:", error);
    return { success: false, message: `An error occurred during the cancellation process: ${error.message}` };
  }
}
