import { json } from "@remix-run/node";
import { logErrorToSlack, sendToSlack } from "../utils/slackLogger";

export async function action({ request }) {
  try {
    const payload = await request.json();
    const { message, stack, additionalInfo, type = "error" } = payload;
    
    // Construct an error-like object
    const errorData = {
      message,
      stack,
      ...additionalInfo,
      source: "frontend",
      userAgent: request.headers.get("user-agent"),
      timestamp: new Date().toISOString()
    };
    
    // Use the appropriate logging function based on type
    if (type === "error") {
      await logErrorToSlack(errorData);
    } else {
      await sendToSlack(message, undefined, errorData);
    }
    
    return json({ success: true });
  } catch (error) {
    console.error("Error logging to Slack:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}