export async function registerWebhooks(admin, session) {
    const webhooks = [
      { topic: "app/uninstalled", address: `${process.env.SHOPIFY_APP_URL}/webhooks` },
      { topic: "orders/create", address: `https://go-backend-convertboost-154795163068.us-central1.run.app/webhook` },
      { topic: "customers/data_request", address: `${process.env.SHOPIFY_APP_URL}/webhooks` },
      { topic: "customers/redact", address: `${process.env.SHOPIFY_APP_URL}/webhooks` },
      { topic: "shop/redact", address: `${process.env.SHOPIFY_APP_URL}/webhooks` },
      { topic: "bulk_operations/finish", address: `https://go-backend-convertboost-154795163068.us-central1.run.app/webhook` },
    ];
  
    try {
      const existingWebhooks = await admin.rest.resources.Webhook.all({ session });
      const existingTopics = existingWebhooks.data?.map(w => w.topic) || [];
      
      for (const { topic, address } of webhooks) {
        if (!existingTopics.includes(topic)) {
          const webhook = new admin.rest.resources.Webhook({ session: session });
          webhook.address = address;
          webhook.topic = topic;
          webhook.format = "json";
          
          try {
            await webhook.save({ update: true });
          } catch (error) {
            // Ignore webhook registration errors
          }
        }
      }
    } catch (error) {
      // Ignore webhook management errors
    }
  }
  
