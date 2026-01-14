import React from 'react';
import { TextField, Select, RadioButton, Checkbox, BlockStack, InlineStack, Text } from '@shopify/polaris';
import HelpTooltip from '../HelpTooltip';

export default function DiscountOptions({ formData, handleChange }) {
  const handleValueChange = (value) => {
    // Convert empty string to 0
    const numValue = value === '' ? '0' : value;
    // Ensure value is non-negative and remove any decimal places
    const validValue = Math.max(0, parseInt(numValue) || 0).toString();
    handleChange('discountValue', validValue);
  };

  const handleMinPurchaseValueChange = (value) => {
    // Convert empty string to 0
    const numValue = value === '' ? '0' : value;
    // Ensure value is non-negative
    const validValue = Math.max(0, parseFloat(numValue) || 0);
    handleChange('minPurchaseValue', validValue);
  };
  React.useEffect(() => {
    if (!formData?.discountType) {
      handleChange('discountType', 'automatic');
    }

    // Ensure a valid purchase type is always selected
    /* 
    if (formData?.discountType === 'silent' && (!formData?.purchaseType || formData.purchaseType === '')) {
      handleChange('purchaseType', 'both');
    }
    */
  }, [formData?.discountType]);

  // Add a new useEffect to set default values when discount type changes
  /* 
  React.useEffect(() => {
    if (formData?.discountType === 'silent') {
      // Set purchase type to 'both' by default
      if (!formData.purchaseType) {
        handleChange('purchaseType', 'both');
      }
    }
  }, [formData?.discountType]);
  */

  return (
    <>
      <TextField
        label="Discount Name / Title"
        value={formData?.discountName}
        onChange={(value) => handleChange('discountName', value)}
      />
      <br />
      <TextField
        label="Description"
        value={formData?.subheading}
        onChange={(value) => handleChange('subheading', value)}
      />
      <br />
      <hr style={{ margin: '10px 0', border: 'none', borderTop: '2px solid #e1e3e5' }} />
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Discount Options</Text>
          <HelpTooltip content="Choose how discounts are applied to maximize conversions" />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Automatically generate a random discount for every user or use a manual discount.</div>
      <br />
      <RadioButton
        label="Generate discount automatically"
        checked={formData?.discountType === 'automatic'}
        onChange={() => handleChange('discountType', 'automatic')}
      />
      <br />
      <RadioButton
        label="Use manual Discount coupon"
        checked={formData?.discountType === 'manual'}
        onChange={() => handleChange('discountType', 'manual')}
      />
      <br />
      {/* 
      <RadioButton
        label="Don't show popup and provide automatic discounts"
        checked={formData?.discountType === 'silent'}
        onChange={() => handleChange('discountType', 'silent')}
      /> 
      */}
      <div style={{ marginTop: "20px" }}></div>

      {formData?.discountType === 'automatic' && (
        <>
          <Select
            label="Select Type"
            options={[
              { label: 'Percentage Off', value: 'percentage' },
              { label: 'Fixed Amount', value: 'fixed' },
            ]}
            value={formData?.valueType}
            onChange={(value) => handleChange('valueType', value)}
          />
          <div style={{ marginTop: "15px" }}></div>
          <TextField
            label="Value"
            value={formData?.discountValue}
            onChange={handleValueChange}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            suffix={formData?.valueType === 'percentage' ? '%' : ''}
            autoComplete="off"
          />
        </>
      )}

      {formData?.discountType === 'manual' && (
        <TextField
          label="Discount Code"
          value={formData?.couponCode}
          onChange={(value) => handleChange('couponCode', value)}
        />
      )}
      {/* 
      {formData?.discountType === 'silent' && (
        ... omitted for brevity in chunk but will be in actual ...
      )}
      */}
      {/* 
      {formData?.discountType === 'silent' && (
        <>
          <Select
            label="Select Type"
            options={[
              { label: 'Percentage Off', value: 'percentage' },
              { label: 'Fixed Amount', value: 'fixed' },
            ]}
            value={formData?.valueType}
            onChange={(value) => handleChange('valueType', value)}
          />
          <div style={{ marginTop: "15px" }}></div>
          <TextField
            label="Value"
            value={formData?.discountValue}
            onChange={handleValueChange}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            suffix={formData?.valueType === 'percentage' ? '%' : ''}
            autoComplete="off"
          />
          <div style={{ marginTop: "15px" }}></div>
          <Select
            label="Purchase Type"
            options={[
              { label: 'Subscription', value: 'subscription' },
              { label: 'One-time Purchase', value: 'one-time' },
              { label: 'Both', value: 'both' },
            ]}
            value={formData?.purchaseType || 'both'}
            onChange={(value) => handleChange('purchaseType', value)}
            helpText="At least one purchase type must be selected"
          />
          <div style={{ marginTop: "15px" }}></div>
          <TextField
            label="Minimum Purchase Value"
            value={formData?.minPurchaseValue || ''}
            onChange={handleMinPurchaseValueChange}
            type="text"
            inputMode="decimal"
            suffix=" "
            autoComplete="off"
          />
          <div style={{ marginTop: "15px" }}></div>
          <div><b>Maximum Discount Uses</b></div>
          <div style={{ marginTop: "10px" }}></div>
          <BlockStack vertical>
            <RadioButton
              label="Limit number of times this discount can be used in total"
              checked={formData?.maxUsesType === 'total'}
              onChange={() => handleChange('maxUsesType', 'total')}
            />
            {formData?.maxUsesType === 'total' && (
              <div style={{ marginLeft: "25px", marginTop: "5px" }}>
                <TextField
                  label="Total uses"
                  value={formData?.maxTotalUses}
                  onChange={(value) => handleChange('maxTotalUses', value)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                />
              </div>
            )}
            <RadioButton
              label="Limit to one use per customer"
              checked={formData?.maxUsesType === 'perCustomer'}
              onChange={() => handleChange('maxUsesType', 'perCustomer')}
            />
          </BlockStack>
          <div style={{ marginTop: "15px" }}></div>
          <div><b>This order discount can be combined with:</b></div>
          <div style={{ marginTop: "10px" }}></div>
          <BlockStack vertical>
            <Checkbox
              label="Product discounts"
              checked={formData?.combineWithProductDiscounts}
              onChange={(checked) => handleChange('combineWithProductDiscounts', checked)}
            />
            <Checkbox
              label="Order discounts"
              checked={formData?.combineWithOrderDiscounts}
              onChange={(checked) => handleChange('combineWithOrderDiscounts', checked)}
            />
            <Checkbox
              label="Shipping discounts"
              checked={formData?.combineWithShippingDiscounts}
              onChange={(checked) => handleChange('combineWithShippingDiscounts', checked)}
            />
          </BlockStack>
        </>
      )}
      */}
      <br />
    </>
  );
}