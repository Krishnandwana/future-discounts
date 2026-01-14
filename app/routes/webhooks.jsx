import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, admin } = await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      // Delete data from all tables for the given shop
      await db.session.deleteMany({ where: { shop } });
      await db.billingDetails.deleteMany({ where: { shopName: shop } });
      await db.popupConfiguration.deleteMany({ where: { shopName: shop } });
      await db.popupInteraction.deleteMany({ where: { shopName: shop } });
      await db.popupAnalytics.deleteMany({ where: { shopName: shop } });
      await db.coupon.deleteMany({
        where: { popupConfig: { shopName: shop } },
      });
      break;

    case "SHOP_REDACT":
      // Delete all personal data for the given shop
      await db.session.deleteMany({ where: { shop } });
      await db.popupInteraction.deleteMany({ where: { shopName: shop } });
      await db.popupAnalytics.deleteMany({ where: { shopName: shop } });
      break;

    case "CUSTOMERS_DATA_REQUEST":
      // Collect and return customer data for the shop
      const customerData = await db.session.findMany({
        where: { shop },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          locale: true,
        },
      });
      return new Response(JSON.stringify({ shop, customerData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    case "CUSTOMERS_REDACT":
      // Delete specific customer data
      const requestBody = await request.json();
      const { customer } = requestBody;

      await db.session.deleteMany({
        where: { shop, email: customer.email },
      });
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response();
};