import { lazy, Suspense } from 'react';
import { Card, BlockStack, Text, Spinner } from '@shopify/polaris';

const LineChart = lazy(() => import('@shopify/polaris-viz').then(module => ({ default: module.LineChart })));

const customLegend = {
  items: [
    {
      name: 'Views',
      color: '#1a73e8',
    },
    {
      name: 'Availed',
      color: '#9c27b0',
    },
    {
      name: 'Not Viewed',
      color: '#d32f2f',
    },
  ]
};

export default function DailyAnalytics({ dailyViews }) {
  if (!dailyViews || dailyViews.length === 0) return null;

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd">Daily Analytics</Text>
        <div style={{ height: '280px', padding: '1rem' }}>
          <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="large" /></div>}>
            <LineChart
              data={[
                {
                  name: 'Views',
                  data: dailyViews.map((item) => ({
                    key: item.date,
                    value: (item.viewCount ?? item.views ?? 0),
                  })),
                  color: '#1a73e8',
                },
                {
                  name: 'Availed',
                  data: dailyViews.map((item) => ({
                    key: item.date,
                    value: (item.availCount ?? item.conversions ?? 0),
                  })),
                  color: '#9c27b0',
                },
                {
                  name: 'Not Viewed',
                  data: dailyViews.map((item) => ({
                    key: item.date,
                    value: item.noViewCount ?? item.notViewed ?? 0,
                  })),
                  color: '#d32f2f',
                },
              ]}
              xAxisOptions={{
                labelFormatter: (value) =>
                  new Date(value).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  }),
              }}
              yAxisOptions={{
                labelFormatter: (value) => `${value} views`,
              }}
              theme="Light"
              isAnimated
              showLegend={false}
            />
          </Suspense>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            {customLegend.items.map((item) => (
              <div key={item.name} style={{ margin: '0 10px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: item.color,
                  marginRight: '5px',
                }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}
