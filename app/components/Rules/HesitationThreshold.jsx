import React from 'react';
import { RangeSlider, InlineStack, Text, Card } from '@shopify/polaris';
import HelpTooltip from '../HelpTooltip';

const defaultFormData = {
  hesitationThreshold: 50
};

export default function HesitationThreshold({ formData = defaultFormData, handleChange }) {
  const handleSliderChange = (value) => {
    handleChange('hesitationThreshold', value);
  };

  const getThresholdDescription = (value) => {
    if (value <= 25) {
      return 'Show discount immediately to hesitant users';
    } else if (value <= 50) {
      return 'Show discount to users showing moderate hesitation';
    } else if (value <= 75) {
      return 'Show discount only to highly hesitant users';
    } else {
      return 'Show discount only to extremely hesitant users';
    }
  };

  return (
    <div className="p-4">
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Hesitation Threshold</Text>
          <HelpTooltip content="Set the hesitation score threshold. The discount popup will only show when a user's hesitation score reaches or exceeds this value. Lower values = show sooner, Higher values = show only to very hesitant users." />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>
        Adjust when to offer discounts based on user hesitation. The hesitation score (0-100) is calculated from behavioral signals like cart dwell time, variant switches, scroll depth, and more.
      </div>
      <br />

      <Card>
        <div style={{ padding: "20px" }}>
          <RangeSlider
            label="Hesitation Score Threshold"
            value={formData.hesitationThreshold || 50}
            onChange={handleSliderChange}
            min={0}
            max={100}
            step={5}
            output
          />
          
          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f4f6f8", borderRadius: "8px" }}>
            <Text variant="bodyMd" fontWeight="semibold" as="p">
              Current Setting: {formData.hesitationThreshold || 50}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: "8px" }}>
              {getThresholdDescription(formData.hesitationThreshold || 50)}
            </Text>
          </div>

          <div style={{ marginTop: "20px" }}>
            <Text variant="bodySm" as="p" fontWeight="semibold">How it works:</Text>
            <ul style={{ marginTop: "8px", paddingLeft: "20px", fontSize: "13px", color: "#6d7175" }}>
              <li style={{ marginBottom: "5px" }}>
                <strong>0-25:</strong> Show discount quickly to engage users early
              </li>
              <li style={{ marginBottom: "5px" }}>
                <strong>26-50:</strong> Show to users showing moderate hesitation signals (recommended)
              </li>
              <li style={{ marginBottom: "5px" }}>
                <strong>51-75:</strong> Show only to highly hesitant users (higher conversion, fewer discounts)
              </li>
              <li style={{ marginBottom: "5px" }}>
                <strong>76-100:</strong> Show only to extremely hesitant users (maximum conversion rate)
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
