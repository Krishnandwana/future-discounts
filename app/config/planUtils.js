import { PLANS } from '../config/plans';

/**
 * Get plan details by name and billing cycle, including view limit.
 * @param {string} planName - The name of the plan (e.g., 'Starter', 'Essential', 'Professional').
 * @param {string} cycle - The billing cycle ('monthly' or 'annual').
 * @returns {object} - Returns the plan configuration including viewLimit for the specified plan and cycle.
 */
export function getPlanDetails(planName, cycle = 'monthly') {
  const plan = PLANS[planName];
  if (!plan) {
    throw new Error(`Plan "${planName}" not found in PLANS configuration.`);
  }

  // Handle Free plan which has no billing details
  if (planName === 'Free') {
    return {
      name: 'Free Plan',
      amount: 0,
      currencyCode: 'USD',
      viewLimit: plan.viewLimit
    };
  }

  const billingDetails = plan[cycle];
  if (!billingDetails) {
    throw new Error(`Billing cycle "${cycle}" not found for plan "${planName}".`);
  }

  // Return both the viewLimit and billing details
  return {
    ...billingDetails,
    viewLimit: plan.viewLimit
  };
}

/**
 * Get all available plans with pricing details for a given cycle.
 * @param {string} cycle - The billing cycle ('monthly' or 'annual').
 * @returns {object} - An object containing all plan names and their respective prices.
 */
export function getAllPlans(cycle = 'monthly') {
  const plans = {};
  
  Object.keys(PLANS).forEach(planName => {
    const plan = PLANS[planName];
    
    // Handle Free plan which has no billing details
    if (planName === 'Free') {
      plans[planName] = {
        name: 'Free Plan',
        amount: 0,
        currencyCode: 'USD',
        viewLimit: plan.viewLimit
      };
    } else {
      plans[planName] = {
        ...plan[cycle],
        viewLimit: plan.viewLimit
      };
    }
  });
  
  return plans;
}