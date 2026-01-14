import { Banner } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';

export default function FreePlanLimitBanner({ isVisible, onNavigateToBilling }) {
  if (!isVisible) return null;

  return (
    <Banner
      title="Free Plan Limit"
      tone="warning"
      action={{
        content: 'Upgrade Plan',
        onAction: onNavigateToBilling
      }}
    >
      <p>
        Free plan allows only 1 active popup at a time. Please deactivate the other active popup first or upgrade to a paid plan to use multiple popups simultaneously.
      </p>
    </Banner>
  );
}
