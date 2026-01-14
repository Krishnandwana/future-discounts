import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { setLogLevel } from "../utils/metafields.server";

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { logLevel } = await request.json();

    if (!logLevel) {
      return json({ error: "logLevel is required" }, { status: 400 });
    }

    const shopGid = `gid://shopify/Shop/${session.shop.split('.')[0]}`;
    const success = await setLogLevel(admin, shopGid, logLevel);

    if (success) {
      return json({
        success: true,
        message: `Log level set to: ${logLevel}`,
        logLevel
      });
    } else {
      return json({
        success: false,
        error: "Failed to set log level"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in set-log-level API:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};
