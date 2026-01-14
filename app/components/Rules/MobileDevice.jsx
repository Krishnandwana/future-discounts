import React from 'react';
import { Text, ButtonGroup, Button, InlineStack } from '@shopify/polaris';
import HelpTooltip from '../HelpTooltip';

export default function Mobile({ formData, handleChange }) {
  const mobileDevices = formData.mobileDevices || 'all';

  const handleMobileDeviceChange = (mobileDevice) => {
    handleChange('mobileDevices', mobileDevice); // Save as a single string
  };
  if (formData.devices.includes('desktop')) {
    return null;
  }

  return (
    <>
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Mobile Device Selection</Text>
          <HelpTooltip content="Select Mobile Device Type to display the popup on." />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Select Mobile Device Type to display the popup on.</div>
      <div style={{ marginTop: "15px" }}></div>
      <ButtonGroup fullWidth segmented>
        <Button
          size="large"
          pressed={mobileDevices === 'all'}
          onClick={() => handleMobileDeviceChange('all')}
          variant={mobileDevices === 'all' ? 'primary' : 'tertiary'}
        >
          All
        </Button>
        <Button
          size="large"
          pressed={mobileDevices === 'android'}
          onClick={() => handleMobileDeviceChange('android')}
          variant={mobileDevices === 'android' ? 'primary' : 'tertiary'}
        >
          Android
        </Button>
        <Button
          size="large"
          pressed={mobileDevices === 'ios'}
          onClick={() => handleMobileDeviceChange('ios')}
          variant={mobileDevices === 'ios' ? 'primary' : 'tertiary'}
        >
          iOS
        </Button>
      </ButtonGroup>
    </>
  );
}