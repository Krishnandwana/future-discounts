import { BillingInterval } from "@shopify/shopify-app-remix/server";

export const PLANS = {
  Free: {
    viewLimit: 1000,
    // No billing configuration needed for free plan
  },
  Essential: {
    viewLimit: 20000,
    monthly: {
      name: "Essential Monthly Plan",
      amount: 9.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: 15, // No trial
      test: null,
      // isTest: null,
    },
    annual: {
      name: "Essential Annual Plan",
      amount: 9.99 * 8, // 8 times monthly
      currencyCode: "USD",
      interval: BillingInterval.Annual,
      trialDays: 15, // No trial
      test: null,
      // isTest: null,
    },
  },
  Professional: {
    viewLimit: 50000,
    monthly: {
      name: "Professional Monthly Plan",
      amount: 19.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: 15, // No trial
      test: null,
      // isTest: null,
    },
    annual: {
      name: "Professional Annual Plan",
      amount: 19.99 * 8, // 8 times monthly
      currencyCode: "USD",
      interval: BillingInterval.Annual,
      trialDays: 15, // No trial
      test: null,
      // isTest: null,
    },
  },
};