import { Card, BlockStack, Text } from '@shopify/polaris';

export default function ErrorDisplay({ error }) {
  if (!error) return null;

  return (
    <Card>
      <BlockStack align="center">
        <div style={{ padding: "2rem" }}>
          <Text variation="negative">Error: {error}</Text>
        </div>
      </BlockStack>
    </Card>
  );
}
