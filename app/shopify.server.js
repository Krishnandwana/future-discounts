import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
import prisma from "./db.server";
import { PLANS } from "./config/plans";
import { saveOrders } from "./utils/saveOrders";
import { registerWebhooks as registerCustomWebhooks } from "./utils/registerWebhooks";

const billingPlans = {};

Object.values(PLANS).forEach((plan) => {
  ["monthly", "annual"].forEach((cycle) => {
    const planDetail = plan[cycle];
    // Skip Free plan as it has no billing details
    if (planDetail && planDetail.name) {
      billingPlans[planDetail.name] = {
        amount: planDetail.amount,
        currencyCode: planDetail.currencyCode,
        interval: planDetail.interval,
        trialDays: planDetail.trialDays,
        isTest: planDetail.isTest,
      };
    }
  });
});

// Define afterAuth hook function to handle post-installation actions
const afterAuth = async ({ session, admin }) => {
  try {

    // 1. Verify session
    const isSessionValid = await prisma.session.findFirst({
      where: { shop: session.shop }
    });
    
    if (!isSessionValid) {
      throw new Error('Session validation failed');
    }

    await registerCustomWebhooks(admin, session);

    // 2. Save initial orders
    await saveOrders(admin, session);

    // 3. Register webhooks


  } catch (error) {
    console.error('❌ Error during installation:', error);
    throw error; // Re-throw to ensure Shopify knows installation failed
  }
};

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  billing: billingPlans,
  hooks: {
    afterAuth, // Register the afterAuth hook
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    wip_optionalScopesApi: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
    webhooks: {
      APP_UNINSTALLED: {
        deliveryMethod: "http",
        callbackUrl: "/webhooks",
      },
      ORDERS_CREATE: {
        deliveryMethod: "http",
        callbackUrl: "/webhooks",
      },
      SHOP_REDACT: {
        deliveryMethod: "http",
        callbackUrl: "/webhooks",
      },
      CUSTOMERS_DATA_REQUEST: {
        deliveryMethod: "http",
        callbackUrl: "/webhooks",
      },
      CUSTOMERS_REDACT: {
        deliveryMethod: "http",
        callbackUrl: "/webhooks",
      },
      // Uncomment and configure additional webhooks as needed
      // ORDERS_CREATE: {
      //   deliveryMethod: "http",
      //   callbackUrl: "/webhooks",
      // },
    },
});

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const billing_plans = billingPlans;
export const registerWebhooks = shopify.hooks;
export const sessionStorage = shopify.sessionStorage;
