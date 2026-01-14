/**
 * Logs frontend errors to Slack via the server API
 * @param {Error|string} error - The error to log
 * @param {Object} additionalInfo - Any additional context to include
 */
export async function logFrontendErrorToSlack(error, additionalInfo = {}) {
    try {
      let errorMessage = "Unknown error";
      let errorStack = "No stack trace available";
      
      // Extract error information
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
      
      // Add page information
      additionalInfo.url = window.location.href;
      additionalInfo.path = window.location.pathname;
      
      // Send to the server endpoint
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: errorMessage,
          stack: errorStack,
          additionalInfo,
          type: "error"
        })
      });
    } catch (clientError) {
      console.error("Failed to send frontend error to Slack:", clientError);
    }
  }
  
  /**
   * Sends a notification message from the frontend to Slack
   * @param {string} message - The message to send
   * @param {Object} additionalDetails - Any additional context to include
   */
  export async function sendFrontendMessageToSlack(message, additionalDetails = {}) {
    try {
      // Add page information
      additionalDetails.url = window.location.href;
      additionalDetails.path = window.location.pathname;
      
      // Send to the server endpoint
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          additionalInfo: additionalDetails,
          type: "message"
        })
      });
    } catch (clientError) {
      console.error("Failed to send frontend message to Slack:", clientError);
    }
  }