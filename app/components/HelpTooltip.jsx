import React from 'react';
import { Tooltip, Icon, InlineStack } from '@shopify/polaris';
import { QuestionCircleIcon } from '@shopify/polaris-icons';

const HelpTooltip = ({ content, width = '200px' }) => {
  return (
    <div style={{ display: 'inline-block', marginLeft: '4px' }}>
      <Tooltip
        content={content}
        preferredPosition="above"
        width={width}
        hoverable
      >
        <div 
          style={{ cursor: 'help', display: 'inline-flex' }}
        >
          <Icon source={QuestionCircleIcon} color="subdued" />
        </div>
      </Tooltip>
    </div>
  );
};

// Predefined help content for common features
export const HELP_CONTENT = {
  // Discount Options
  automaticDiscount: "Discount is applied automatically at checkout without requiring a code",
  manualDiscount: "Customers need to enter a discount code to receive the offer",
  silentDiscount: "Creates a discount in the background without showing to the customer immediately",
  discountValue: "The percentage or fixed amount off the regular price",
  minPurchase: "Minimum cart value required for the discount to apply",
  
  // Trigger Options
  exitIntent: "Shows popup when visitor's mouse moves towards the browser's close button or address bar",
  timeOnPage: "Displays after visitor has been on the page for specified seconds",
  scrollTrigger: "Appears after visitor scrolls down a certain percentage of the page",
  
  // Location Rules
  locationTargeting: "Show different offers based on visitor's geographic location",
  includeLocations: "Popup will ONLY show to visitors from selected locations",
  excludeLocations: "Popup will show everywhere EXCEPT selected locations",
  
  // Device Targeting
  deviceTargeting: "Optimize popup display for different device types",
  mobileOptimization: "Special settings for mobile users who often need extra encouragement",
  
  // Sticky Bar
  stickyBar: "A persistent bar that remains visible after the popup closes, reminding visitors of the offer",
  
  // Schedule
  scheduleRules: "Control when your campaign is active - great for flash sales or time-limited offers",
  
  // Frequency
  frequencyLimit: "Prevents popup fatigue by limiting how often the same visitor sees your popup",
  
  // Analytics
  interactions: "Total number of times visitors have seen or interacted with your popup",
  uniqueUsers: "Number of individual visitors (counted only once per visitor)",
  conversionRate: "Percentage of visitors who claimed the discount after seeing the popup"
};

// Helper component for inline help text
export const InlineHelp = ({ text, tooltip }) => {
  return (
    <InlineStack gap="1" align="center">
      <span>{text}</span>
      <HelpTooltip content={tooltip} />
    </InlineStack>
  );
};

export default HelpTooltip;