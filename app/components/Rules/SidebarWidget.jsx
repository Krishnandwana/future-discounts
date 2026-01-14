import React from 'react';
import { RadioButton, BlockStack } from '@shopify/polaris';

export default function SidebarWidget({ formData, handleChange }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}></div>
      <h2><b>Sidebar widget</b></h2>
      <p style={{ marginTop: "5px" }}>Display a sidebar widget if the customer declines the popup without subscribing.</p>
      <div style={{ marginTop: "10px" }}></div>
      <BlockStack>
        <RadioButton
          label="Show"
          checked={formData.sidebarWidget === 'yes'}
          onChange={() => handleChange('sidebarWidget', 'yes')}
        />
        <RadioButton
          label="Don't Show"
          checked={formData.sidebarWidget === 'no'}
          onChange={() => handleChange('sidebarWidget', 'no')}
        />
      </BlockStack>
      <div style={{ marginTop: "15px" }}></div>
    </>
  );
}