import React from 'react';
import {
  Text,
  RadioButton,
  BlockStack,
  TextField,
  Select,
  InlineStack
} from '@shopify/polaris';
import HelpTooltip, { HELP_CONTENT, InlineHelp } from '../HelpTooltip';

export default function When({ formData, handleChange }) {
  const percentageOptions = [
    { label: '25%', value: '25' },
    { label: '50%', value: '50' },
    { label: '75%', value: '75' },
    { label: '100%', value: '100' },
  ];

  return (
    <>
      <div style={{ marginTop: '15px' }}></div>
      <InlineStack gap="2" blockAlign="center">
        <Text variant="headingSm" as="h3">When to display</Text>
        <HelpTooltip content="Timing is crucial - show your offer at the perfect moment to maximize conversions" />
      </InlineStack>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Timing is crucial - show your offer at the perfect moment to maximize conversions.</div>
      <div style={{ marginTop: '20px' }}></div>
      <BlockStack>
        <RadioButton
          label={<InlineHelp text="Show after Time" tooltip={HELP_CONTENT.timeOnPage} />}
          checked={formData.trigger === 'timer'}
          onChange={() => handleChange('trigger', 'timer')}
        />
        <RadioButton
          label={<InlineHelp text="Show after scrolling" tooltip={HELP_CONTENT.scrollTrigger} />}
          checked={formData.trigger === 'scroll'}
          onChange={() => handleChange('trigger', 'scroll')}
        />
        <div style={{ marginTop: '15px' }}></div>
        {formData.trigger === 'timer' && (
          <TextField
            label="After how many seconds?"
            type="number"
            value={formData.time || ''}
            onChange={(value) => handleChange('time', value)}
            min={3}
            helpText="30-60 seconds is optimal for first-time visitors"
          />
        )}
        {formData.trigger === 'scroll' && (
          <Select
            label="Scroll Percentage"
            options={percentageOptions}
            value={formData.scrollPercentage || ''}
            onChange={(value) => handleChange('scrollPercentage', value)}
            helpText="50-70% indicates strong interest"
          />
        )}
      </BlockStack>
      <div style={{ marginTop: '20px' }}></div>
    </>
  );
}