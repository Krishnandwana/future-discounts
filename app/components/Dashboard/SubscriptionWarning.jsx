import { Banner } from '@shopify/polaris';

export default function SubscriptionWarning({ planName, hasPopups, onNavigate }) {
  if (planName === 'Essential' || planName === 'Professional' || !hasPopups) {
    return null;
  }

  return (
    <Banner
      title="Upgrade your plan to activate your discounts"
      tone="warning"
      action={{content: 'View plans', onAction: onNavigate}}
    >
      <p>Please opt for an Essential or Professional plan to activate your discounts and get better avail rates.</p>
    </Banner>
  );
}
