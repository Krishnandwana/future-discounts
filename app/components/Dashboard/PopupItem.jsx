import { Card, Grid, InlineStack, Text, Badge, Button, Spinner, Tooltip } from '@shopify/polaris';
import { ChartVerticalFilledIcon, DeleteIcon } from '@shopify/polaris-icons';
import ToggleSwitch from './ToggleSwitch';
import { getCachedBillingPlanSync } from '../../utils/billingCache.client';

export default function PopupItem({ popup, onToggle, onEdit, onChart, onDelete, isSubscribed, loadingPopupId, deletingPopupId, selectedAnalyticDataId, analyticsData, shopName, onNavigateToBilling }) {
  const conversionRate = popup.interactions > 0 ? ((popup.couponCount / popup.interactions) * 100).toFixed(1) : '0';
  
  // Check if user is on free plan
  const billingPlan = shopName ? getCachedBillingPlanSync(shopName) : null;
  const isFreePlan = !billingPlan || billingPlan === 'Free';
  
  // Check if there are other active popups (excluding current one)
  const otherActivePopups = analyticsData?.filter(p => p.status === true && p.id !== popup.id) || [];
  const hasOtherActivePopups = otherActivePopups.length > 0;
  
  // Disable toggle if: free plan AND trying to activate AND there's already an active popup
  const isToggleDisabled = !isSubscribed || (isFreePlan && !popup.status && hasOtherActivePopups);
  

  return (
    <Card
      key={popup.id}
      className="card-hover"
    >
      <Grid columns={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
          <InlineStack gap="300" wrap={false}>
            <Text fontWeight="medium">{popup.name}</Text>
            <Badge tone={(isSubscribed && popup.status) ? 'success' : 'subdued'}>
              {(isSubscribed && popup.status) ? 'Active' : 'Inactive'}
            </Badge>
          </InlineStack>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
          <InlineStack gap="300" align="center" justify="center">
            {!isSubscribed && (
              <Badge tone="warning" size="small">Subscription Required</Badge>
            )}
            <Text variant="bodySm" color="subdued">
              {popup.interactions?.toLocaleString() || '0'} views
            </Text>
            <Text variant="bodySm" color="subdued">
              {popup.couponCount?.toLocaleString() || '0'} conversions
            </Text>
            <Text variant="bodySm" color={conversionRate > 3 ? 'success' : 'subdued'}>
              {conversionRate}% rate
            </Text>
          </InlineStack>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
          <InlineStack align="end" gap="300" blockAlign="baseline">
            <ToggleSwitch
              id={popup.id}
              checked={isSubscribed ? popup.status : false}
              onChange={(e) => onToggle(e, popup)}
              disabled={isToggleDisabled}
            />
            <button
              onClick={() => onEdit(popup.id)}
              disabled={loadingPopupId === popup.id}
              style={{
                width: 'auto',
                height: 'auto',
                backgroundColor: 'white',
                border: '1px solid lightgray',
                padding: '3px 5px',
                borderRadius: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loadingPopupId === popup.id ? (
                <div>
                  <Spinner
                    style={{ color: 'black' }}
                    accessibilityLabel="Loading spinner"
                    size="small"
                  />
                </div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="black"
                  className="size-6"
                  style={{ width: '1.2rem', height: '1.2rem', padding: '1.2px' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                  />
                </svg>
              )}
            </button>
            <Button
              icon={ChartVerticalFilledIcon}
              variant={selectedAnalyticDataId === popup.id ? 'primary' : 'secondary'}
              onClick={() => onChart(popup.id)}
            />
            <Button
              icon={DeleteIcon}
              variant="secondary"
              onClick={() => onDelete(popup.id)}
              loading={deletingPopupId === popup.id}
              disabled={deletingPopupId === popup.id}
            />
          </InlineStack>
        </Grid.Cell>
      </Grid>
    </Card>
  );
}
