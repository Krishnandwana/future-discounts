import { Card, Text, Button, BlockStack } from "@shopify/polaris";

export default function UpgradePrompt() {
  return (
    <Card>
      <BlockStack align="center">
        <div style={{ padding: "2rem", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <img
              src="/convertboost.png"
              alt="Geo Deals"
              style={{ width: "80px", height: "auto", marginBottom: "1rem" }}
            />
            <Text variant="headingXl" as="h2">
              Upgrade Your Plan
            </Text>
          </div>

          <BlockStack gap="400">
            <Text variant="bodyLg" as="p" color="subdued">
              You're currently on the Free plan with 1,000 popup views per month. 
              Upgrade to unlock more views and premium features!
            </Text>

            <div style={{ marginTop: "1rem" }}>
              <Button
                url="/app/billing"
                variant="primary"
                size="large"
              >
                Upgrade to Essential Plan
              </Button>
            </div>

            <Text variant="bodySm" color="subdued">
              Starting at just $9.99/month with a 15-day free trial
            </Text>

            <Text variant="bodySm" color="subdued">
              ⚡ Premium features include:
              <ul style={{ textAlign: "left", marginTop: "0.5rem" }}>
                <li>Unlimited popup creation</li>
                <li>Advanced targeting options</li>
                <li>Detailed analytics</li>
                <li>Priority support</li>
              </ul>
            </Text>
          </BlockStack>
        </div>
      </BlockStack>
    </Card>
  );
}