import React from 'react';
import { Card, TextField } from '@shopify/polaris';

export const SidebarWidget = ({ buttonText, onChange }) => (
  <>
    <div style={{ marginTop: "14px" }}><b>Sidebar widget</b></div>
    <div style={{ marginTop: "5px" }}></div>
    <TextField
      label="Button text"
      value={buttonText}
      onChange={(value) => onChange('sidebarButtonText', value)}
    />
  </>
);
export default SidebarWidget;