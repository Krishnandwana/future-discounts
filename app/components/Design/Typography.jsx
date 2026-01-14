import React from 'react';
import { Select, Text, BlockStack, RangeSlider } from '@shopify/polaris';

const Typography = ({ fontFamily, headingSize, bodySize, buttonSize, footerSize, onChange }) => {
  const fontFamilyOptions = [
    { label: 'System Default', value: 'system' },
    { label: 'Arial / Helvetica', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia / Serif', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
    { label: 'Courier New', value: 'Courier New, Courier, monospace' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS, Helvetica, sans-serif' }
  ];


  return (
    <>
      <Text as="h1" variant="headingMd">Typography</Text>
      <div style={{ marginBottom: '16px' }}></div>
      
      <BlockStack gap="400">
        <div>
          <Text as="p" variant="bodyMd" color="subdued" style={{ marginBottom: '8px' }}>
            Font Family
          </Text>
          <Select
            options={fontFamilyOptions}
            onChange={(value) => onChange('fontFamily', value)}
            value={fontFamily || 'system'}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <RangeSlider
            label="Heading Size"
            value={headingSize || 18}
            onChange={(value) => onChange('headingSize', value)}
            output
            min={10}
            max={30}
            suffix={<p style={{ minWidth: '35px' }}>{headingSize || 18}px</p>}
          />
        </div>

        <div>
          <RangeSlider
            label="Body Text Size"
            value={bodySize || 14}
            onChange={(value) => onChange('bodySize', value)}
            output
            min={10}
            max={30}
            suffix={<p style={{ minWidth: '35px' }}>{bodySize || 14}px</p>}
          />
        </div>

        <div>
          <RangeSlider
            label="Button Text Size"
            value={buttonSize || 12}
            onChange={(value) => onChange('buttonSize', value)}
            output
            min={10}
            max={30}
            suffix={<p style={{ minWidth: '35px' }}>{buttonSize || 12}px</p>}
          />
        </div>

        <div>
          <RangeSlider
            label="Footer Text Size"
            value={footerSize || 11}
            onChange={(value) => onChange('footerSize', value)}
            output
            min={10}
            max={30}
            suffix={<p style={{ minWidth: '35px' }}>{footerSize || 11}px</p>}
          />
        </div>
      </BlockStack>
    </>
  );
};

export default Typography;