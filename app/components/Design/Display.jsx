import React from 'react';
import { Card, Select } from '@shopify/polaris';

const Display = ({ size, alignment, cornerRadius, onChange }) => {
  return (
    <>
      {/* <Select
        label="Size"
        options={[
          { label: 'Standard', value: 'standard' },
          { label: 'Large', value: 'large' },
          { label: 'Small', value: 'small' },
        ]}
        onChange={(value) => onChange('size', value)}
        value={size}
      /> */}
      <div style={{ marginBottom: '8px' }}>Alignment</div>
      <Select
        options={[
          { label: 'Center', value: 'center' },
          { label: 'Left', value: 'left' },
          // { label: 'Right', value: 'right' },
        ]}
        onChange={(value) => onChange('alignment', value)}
        value={alignment}
      />
      <br />
      <div style={{ marginBottom: '8px' }}>Corner Radius</div>
      <Select
        options={[
          { label: 'Standard', value: 'standard' },
          { label: 'Rounded', value: 'rounded' },
          { label: 'Sharp', value: 'sharp' },
        ]}
        onChange={(value) => onChange('cornerRadius', value)}
        value={cornerRadius}
      />
    </>
  );
};

export default Display;