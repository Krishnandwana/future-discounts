import { Box, BlockStack, Text, InlineStack } from '@shopify/polaris';
import CreatePopupButton from './CreatePopupButton';

export default function EmptyStatePopup({ onStartWizard, onCreateFromScratch, isCreating }) {
  return (
    <Box padding="800" background="bg-surface-secondary" borderRadius="300">
      <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <BlockStack gap="600">
          <div style={{
            fontSize: '64px',
            background: 'white',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            📍
          </div>

          <BlockStack gap="300">
            <Text variant="headingXl" as="h2">Grow your sales with Geo-Deals</Text>
            <Text variant="bodyLg" color="subdued">
              You haven't created any campaigns yet. Start with our 2-minute quick setup to see your first high-converting popup live!
            </Text>
          </BlockStack>

          <Box paddingBlockStart="200">
            <InlineStack gap="400" align="center">
              <CreatePopupButton
                onClick={onStartWizard}
                label="Start Quick Setup →"
                variant="primary"
                isLoading={false}
              />
              <CreatePopupButton
                onClick={onCreateFromScratch}
                label="Create From Scratch"
                variant="secondary"
                isLoading={isCreating}
              />
            </InlineStack>
          </Box>

          <div style={{ borderTop: '1px solid #dfe3e8', paddingTop: '20px' }}>
            <InlineStack gap="600" align="center">
              <BlockStack gap="100">
                <Text variant="headingSm">2 Min</Text>
                <Text variant="bodyXs" color="subdued">Setup time</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text variant="headingSm">Easy</Text>
                <Text variant="bodyXs" color="subdued">No code needed</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text variant="headingSm">15%+</Text>
                <Text variant="bodyXs" color="subdued">Avg. CVR boost</Text>
              </BlockStack>
            </InlineStack>
          </div>
        </BlockStack>
      </div>
    </Box>
  );
}
