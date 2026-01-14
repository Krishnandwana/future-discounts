import { lazy, Suspense } from 'react';
import { Spinner } from '@shopify/polaris';

const WorldMapChart = lazy(() => import('../worldmap'));

export default function WorldMapSection({ locationAnalytics }) {
  // Only render the section if there's valid location data
  const hasValidLocationData = locationAnalytics &&
    Object.keys(locationAnalytics).length > 0 &&
    Object.keys(locationAnalytics).some(city => city && city.toLowerCase() !== 'unknown' && city.trim() !== '');

  if (!hasValidLocationData) return null;

  return (
    <Suspense fallback={<div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="large" /></div>}>
      <WorldMapChart locationAnalytics={locationAnalytics} />
    </Suspense>
  );
}
