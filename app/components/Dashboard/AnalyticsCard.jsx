import { Card, Box, BlockStack, InlineStack, Text, Badge } from '@shopify/polaris';

export default function AnalyticsCard({ title, value, icon, color, trend, trendValue }) {
  const normalizedValue = typeof value === 'string' ? value.trim() : value;
  const isValueZero = normalizedValue === 0 ||
    normalizedValue === '0' ||
    normalizedValue === '0.0%' ||
    normalizedValue === '0%' ||
    normalizedValue === '—';
  const showTrend = !isValueZero && trend && trendValue;
  const displayValue = isValueZero ? '—' : value;
  const displayColor = isValueZero ? '#6d7175' : (color || '#1a73e8');

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <div style={{ color: displayColor }}>
              {icon}
            </div>
            {showTrend && (
              <Badge tone={trend === 'up' ? 'success' : trend === 'down' ? 'critical' : 'info'}>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
              </Badge>
            )}
          </InlineStack>
          <BlockStack gap="100">
            <Text variant="bodySm" color="subdued">{title}</Text>
            <Text variant="heading2xl" fontWeight="bold" color={displayColor}>
              {displayValue}
            </Text>
            {isValueZero && (
              <Text variant="bodySm" color="subdued">
                We'll show data here after your first visitor engages.
              </Text>
            )}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}
