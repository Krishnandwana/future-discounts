import React from 'react';
import { Card, TextField } from '@shopify/polaris';

export const StickyDiscountBar = ({ description, onChange }) => (
  <>
    <div ><b>Sticky Discount Bar</b></div>
    <div style={{ marginTop: "5px"}}></div>
    <TextField
      label="Description"
      value={description}
      onChange={(value) => onChange('stickyBarDescription', value)}
    />
  </>
);
export default StickyDiscountBar;