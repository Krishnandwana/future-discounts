import { BlockStack, InlineStack, Text, Grid, Icon } from '@shopify/polaris';
import { ChartVerticalFilledIcon, CheckCircleIcon, TargetIcon } from '@shopify/polaris-icons';
import AnalyticsCard from './AnalyticsCard';

export default function PerformanceOverview({ displayedAnalyticData, isPlaceholder }) {
  const interactions = displayedAnalyticData.interactions || 0;
  const couponCount = displayedAnalyticData.couponCount || 0;
  const rate = interactions > 0 ? ((couponCount / interactions) * 100).toFixed(1) : '0.0';
  const isHealthy = interactions > 0 && Number(rate) > 3;

  return (
    <div className="analytics-overview">
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingLg">Performance Overview</Text>
          <Text variant="bodySm" color="subdued">
            Last updated: {isPlaceholder || !displayedAnalyticData.updatedAt ? '—' : new Date(displayedAnalyticData.updatedAt).toLocaleDateString()}
          </Text>
        </InlineStack>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4 }}>
            <AnalyticsCard
              title="Total Views"
              value={isPlaceholder ? '—' : (displayedAnalyticData.interactions ?? 0).toLocaleString()}
              icon={<Icon source={ChartVerticalFilledIcon} />}
              color="#1a73e8"
              trend={isPlaceholder || (displayedAnalyticData.interactions ?? 0) === 0 ? null : 'up'}
              trendValue={isPlaceholder || (displayedAnalyticData.interactions ?? 0) === 0 ? null : '12%'}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4 }}>
            <AnalyticsCard
              title="Availed"
              value={isPlaceholder ? '—' : (displayedAnalyticData.couponCount ?? 0).toLocaleString()}
              icon={<Icon source={CheckCircleIcon} />}
              color="#008060"
              trend={isPlaceholder || (displayedAnalyticData.couponCount ?? 0) === 0 ? null : 'up'}
              trendValue={isPlaceholder || (displayedAnalyticData.couponCount ?? 0) === 0 ? null : '8%'}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4 }}>
            <AnalyticsCard
              title="Avail Rate"
              value={isPlaceholder ? '—' : `${rate}%`}
              icon={<Icon source={TargetIcon} />}
              color={isPlaceholder ? '#6d7175' : isHealthy ? '#008060' : '#d32f2f'}
              trend={isPlaceholder || interactions === 0 ? null : isHealthy ? 'up' : 'neutral'}
              trendValue={isPlaceholder || interactions === 0 ? null : '3.2%'}
            />
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </div>
  );
}
