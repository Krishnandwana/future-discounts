import { Card, BlockStack, Text, ProgressBar } from '@shopify/polaris';
import AppEmbedChecker from '../AppEmbedChecker';

export default function UsageProgressBar({ usage, shopName, isSubscribed, appEmbedEnabled, hasPopups, extensionId }) {
  if (!usage || !hasPopups) return null;

  const usedValue = usage.used || 0;
  const limitValue = usage.limit || 0;

  const progress = limitValue > 0 ? Math.round((usedValue / limitValue) * 100) : 0;

  const planName = usage.plan;
  const capitalizedPlanName = planName.charAt(0).toUpperCase() + planName.slice(1);

  const shouldShowAppEmbedChecker = (appEmbedEnabled !== true && hasPopups);

  if (!isSubscribed && !shouldShowAppEmbedChecker) return null;

  return (
    <div className="usage-progress-section">
      <Card sectioned>
        <BlockStack gap="2">
          {shouldShowAppEmbedChecker ? (
            <AppEmbedChecker shopName={shopName} extensionId={extensionId} />
          ) : (
            <>
              <div>
                <Text variant="bodyMd" as="span">
                  You're currently on{' '}
                  <Text variant="bodyMd" as="span" fontWeight="bold">
                    {capitalizedPlanName}
                  </Text>
                  . ({usedValue.toLocaleString()} / {limitValue.toLocaleString()} monthly views). One
                  visitor can have multiple views per session.
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ProgressBar progress={progress} />
              </div>
            </>
          )}
        </BlockStack>
      </Card>
    </div>
  );
}
