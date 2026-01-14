import { InlineStack, BlockStack, Text, Button } from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import ViewPlansButton from './ViewPlansButton';
import CreatePopupButton from './CreatePopupButton';

export default function DashboardHeader({
  hasPopups,
  hasValidPlan,
  isLoading,
  isLoading2,
  isRefreshing,
  isNavigatingToBilling,
  onNavigateToBilling,
  onRefresh,
  onCreatePopup,
  onStartQuickSetup
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <InlineStack align="space-between" blockAlign="center" wrap>
        <BlockStack gap="100">
          <Text variant="headingLg" as="h1">
            {hasPopups ? 'Configure Popup' : 'Create Your First Popup'}
          </Text>
        </BlockStack>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '16px',
            marginLeft: 'auto'
          }}
        >
          {!hasValidPlan && hasPopups && (
            <ViewPlansButton
              onClick={onNavigateToBilling}
              isLoading={isNavigatingToBilling}
            />
          )}
          {!hasPopups && (
            <CreatePopupButton
              onClick={onStartQuickSetup}
              isLoading={isLoading}
              label="Start Quick Setup →"
              variant="primary"
            />
          )}
          {hasPopups && (
            <Button
              icon={RefreshIcon}
              variant="secondary"
              onClick={onRefresh}
              loading={isRefreshing}
              accessibilityLabel="Refresh Data"
            />
          )}
          <CreatePopupButton
            onClick={onCreatePopup}
            isLoading={isLoading2}
            hasPopups={hasPopups}
            label={hasPopups ? 'Create New' : 'Create From Scratch'}
            variant={hasPopups ? 'primary' : 'secondary'}
          />
        </div>
      </InlineStack>
    </div>
  );
}
