// app/utils/slackLogger.js

export async function logErrorToSlack(error, webhookUrl = typeof process !== 'undefined' ? process.env.SLACK_WEBHOOK_URL : null) {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && typeof process === 'undefined') {
    console.error("Slack logging is only available on the server side:", error);
    return;
  }

  if (!webhookUrl) {
    console.error("Slack Webhook URL is not set.");
    return;
  }
  
  // Better error handling to extract meaningful information
  let errorMessage = "Unknown error";
  let errorStack = "No stack trace available";
  let additionalInfo = {};
  
  if (error) {
    // Handle different error types
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message || "Error object without message";
      errorStack = error.stack || "No stack trace available";
      
      // Extract additional properties from the error
      Object.getOwnPropertyNames(error).forEach(key => {
        if (key !== 'message' && key !== 'stack') {
          additionalInfo[key] = error[key];
        }
      });
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = "Error object couldn't be stringified";
      }
    }
  }
  
  // Add request information if available
  if (error?.request) {
    additionalInfo.url = error.request.url || 'N/A';
    additionalInfo.method = error.request.method || 'N/A';
  }
  
  // Format additional info
  const additionalInfoText = Object.keys(additionalInfo).length > 0 
    ? "\n*Additional Information:*\n" + Object.entries(additionalInfo)
        .map(([key, value]) => `*${key}:* ${JSON.stringify(value)}`)
        .join('\n')
    : "";

  const payload = {
    text: `🚨 *Error in Remix Shopify App:* \n\`\`\`${errorMessage}\`\`\`\n*Stack Trace:* \n\`\`\`${errorStack}\`\`\`${additionalInfoText}`,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (slackError) {
    console.error("Failed to send error to Slack:", slackError);
  }
}

export async function sendToSlack(message, webhookUrl = typeof process !== 'undefined' ? process.env.SLACK_WEBHOOK_URL : null, additionalDetails = {}) {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && typeof process === 'undefined') {
    console.error("Slack messaging is only available on the server side");
    return;
  }
  
  if (!webhookUrl) {
    console.error("Slack Webhook URL is not set.");
    return;
  }
  
  const details = Object.entries(additionalDetails)
    .map(([key, value]) => `*${key}:* ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join('\n');

  const payload = {
    text: `🚨 *Notification from Remix Shopify App:* \n${message}\n\n${details}`,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (slackError) {
    console.error("Failed to send to Slack:", slackError);
  }
}