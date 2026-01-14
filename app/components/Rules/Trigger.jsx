import React from 'react';
import { Text, ButtonGroup, Button, InlineStack } from '@shopify/polaris';
import HelpTooltip from '../HelpTooltip';

export default function Trigger({ formData, handleChange }) {
  return (
    <>
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Trigger</Text>
          <HelpTooltip content="Select Devices to display the popup on." />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Select Devices to display the popup on.</div>
      <div style={{ marginTop: "15px" }}></div>
      <ButtonGroup fullWidth segmented> 
        <Button
          size="large"
          pressed={formData.devices?.includes('all')}
          onClick={() => handleChange('devices', ['all'])}
          variant={formData.devices?.includes('all') ? 'primary' : 'tertiary'}
        >
          All Devices
        </Button>
        <Button
          size="large"
          pressed={formData.devices?.includes('desktop')}
          onClick={() => handleChange('devices', ['desktop'])}
          variant={formData.devices?.includes('desktop') ? 'primary' : 'tertiary'}
        >
          Desktop
        </Button>
        <Button
          size="large"
          pressed={formData.devices?.includes('mobile')}
          onClick={() => handleChange('devices', ['mobile'])}
          variant={formData.devices?.includes('mobile') ? 'primary' : 'tertiary'}
        >
          Mobile
        </Button>
      </ButtonGroup>
    </>
  );
}