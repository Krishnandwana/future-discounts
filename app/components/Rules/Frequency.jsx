import React from 'react';
import { Text, RadioButton, InlineStack, Select, BlockStack } from '@shopify/polaris';

export default function Frequency({ formData, handleChange }) {
  return (
    <>
      <div style={{ marginTop: '15px' }}></div>
      <Text variant="headingMd" as="h6">Frequency</Text>
      <div style={{ marginTop: '5px' }}></div>
      <Text variant="bodyMd" as="p">Number of times the popup will show on browser for non-subscribed customers based on selected time.</Text>
      <div style={{ marginTop: '15px' }}></div>
      <BlockStack>
        <RadioButton
          label="Every time anyone visits"
          checked={!formData.limitFrequency}
          onChange={() => handleChange('limitFrequency', false)}
        />
        <RadioButton
          label="Limit frequency"
          checked={formData.limitFrequency}
          onChange={() => handleChange('limitFrequency', true)}
        />
      </BlockStack>
      <div style={{ marginTop: '15px' }}></div>
      {formData.limitFrequency && (
        <InlineStack align='start' block>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
            <Text variant="bodyMd" as="p">Limit: </Text>
            <Select
              options={[
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
              ]}
              value={formData.popupFrequency}
              onChange={(value) => handleChange('popupFrequency', value)}    
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '14px', flex: 1 }}>
            <Text variant="bodyMd" as="p" style={{ marginRight: 10 }}>Per: </Text>
            <Select
              options={[
                { label: 'Day', value: 'day' },
                { label: 'Week', value: 'week' },
              ]}
              value={formData.popupPeriod}
              onChange={(value) => handleChange('popupPeriod', value)}
              style={{ flex: 1 }}
            />
          </div>
        </InlineStack>
      )}
    </>
  );
}