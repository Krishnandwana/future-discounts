import React from 'react';
import { TextField } from '@shopify/polaris';

export const FooterText = ({ footerText, onChange }) => (
  <TextField
    label="Footer Text"
    value={footerText || ''}
    onChange={(value) => onChange('footerText', value)}
    multiline={3}
    placeholder="e.g., You can unsubscribe at any time. We respect your privacy."
    helpText="Legal text or additional information shown at the bottom"
    autoComplete="off"
  />
);

export default FooterText;