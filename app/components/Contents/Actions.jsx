import React from 'react';
import { BlockStack, Checkbox, TextField } from '@shopify/polaris';

export const Actions = ({ primaryButton, primaryButtonText, secondaryButton, secondaryButtonText, onToggle, onChange }) => (
  <BlockStack gap="400">
    <div>
      <Checkbox
        label="Show Primary Button"
        checked={primaryButton}
        onChange={() => onToggle('primaryButton')}
        helpText="The main call-to-action button"
      />
      {primaryButton && (
        <div style={{ marginTop: '12px', marginLeft: '28px' }}>
          <TextField
            label="Primary Button Text"
            value={primaryButtonText || ''}
            onChange={(value) => onChange('primaryButtonText', value)}
            placeholder="e.g., Get My Discount"
            autoComplete="off"
          />
        </div>
      )}
    </div>
    <div>
      <Checkbox
        label="Show Secondary Button"
        checked={secondaryButton}
        onChange={() => onToggle('secondaryButton')}
        helpText="Optional dismiss button"
      />
      {secondaryButton && (
        <div style={{ marginTop: '12px', marginLeft: '28px' }}>
          <TextField
            label="Secondary Button Text"
            value={secondaryButtonText || ''}
            onChange={(value) => onChange('secondaryButtonText', value)}
            placeholder="e.g., No Thanks"
            autoComplete="off"
          />
        </div>
      )}
    </div>
  </BlockStack>
);
export default Actions;
