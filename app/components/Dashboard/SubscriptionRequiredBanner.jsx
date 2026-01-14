import { Banner } from '@shopify/polaris';

export default function SubscriptionRequiredBanner({ isVisible }) {
  if (!isVisible) return null;

  return (
    <Banner
      title="Subscription Required"
      tone="warning"
      action={{content: 'View plans', url: '/app/billing'}}
    >
      <p>Please subscribe to an Essential or Professional plan to activate your popups and start converting customers.</p>
    </Banner>
  );
}
