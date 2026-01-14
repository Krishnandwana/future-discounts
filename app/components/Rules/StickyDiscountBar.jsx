import React from 'react';
import { RadioButton, BlockStack, InlineStack, Text } from '@shopify/polaris';
import HelpTooltip from '../HelpTooltip';

export default function StickyDiscountBar({ formData, handleChange }) {
  return (
    <>
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Sticky Discount Bar</Text>
          <HelpTooltip content="Display a sticky discount bar at the top of your website after a successful subscription." />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Display a sticky discount bar at the top of your website after a successful subscription.</div>
      <div style={{ marginTop: "10px" }}></div>
      <BlockStack>
        <RadioButton
          label="Show"
          checked={formData.stickyDiscountBar === 'yes'}
          onChange={() => handleChange('stickyDiscountBar', 'yes')}
        />
        <RadioButton
          label="Don't Show"
          checked={formData.stickyDiscountBar === 'no'}
          onChange={() => handleChange('stickyDiscountBar', 'no')}
        />
      </BlockStack>
      <div style={{ marginTop: "15px" }}></div>
    </>
  );
}