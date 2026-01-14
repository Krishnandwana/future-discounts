import { Layout, Card, BlockStack, InlineStack, Text, Badge } from '@shopify/polaris';
import PerformanceOverview from './PerformanceOverview';
import DailyAnalytics from './DailyAnalytics';
import WorldMapSection from './WorldMapSection';

export default function AnalyticsSection({ displayedAnalyticData, isPlaceholder }) {
  if (!displayedAnalyticData) return null;

  return (
    <>
      <Layout.Section>
        <div style={{
          borderTop: "1px solid #e1e3e5",
          marginTop: "32px",
          paddingTop: "24px"
        }}>
          <Text variant="headingLg" style={{ marginLeft: "16px", marginBottom: "16px" }}>
            Analytics
          </Text>
        </div>
      </Layout.Section>

      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text variant="headingLg">
                  {isPlaceholder ? 'Create your first popup' : displayedAnalyticData.name}
                </Text>
                <Text variant="bodySm" color="subdued">
                  Last updated: {isPlaceholder || !displayedAnalyticData.updatedAt ? '—' : new Date(displayedAnalyticData.updatedAt).toLocaleDateString()}
                </Text>
              </BlockStack>
              <Badge tone={isPlaceholder ? 'attention' : displayedAnalyticData.status ? 'success' : 'critical'}>
                {isPlaceholder ? 'Awaiting popup' : displayedAnalyticData.status ? 'Active' : 'Inactive'}
              </Badge>
            </InlineStack>

            <PerformanceOverview
              displayedAnalyticData={displayedAnalyticData}
              isPlaceholder={isPlaceholder}
            />

            <DailyAnalytics dailyViews={displayedAnalyticData.dailyViews} />

            <WorldMapSection locationAnalytics={displayedAnalyticData.locationAnalytics} />
          </BlockStack>
        </Card>
      </Layout.Section>
    </>
  );
}
