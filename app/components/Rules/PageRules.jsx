import React, { useState } from 'react';
import { Text, RadioButton, BlockStack, Button, Collapsible } from '@shopify/polaris';

export default function PageRules({ formData, handleChange, onSelectProduct, onSelectCollection }) {
  const [showSpecificOptions, setShowSpecificOptions] = useState(formData.pageRules === 'specificPages');

  const handlePageRuleChange = (value) => {
    handleChange('pageRules', value);
    setShowSpecificOptions(value === 'specificPages');
  };

  return (
    <BlockStack gap="4">
      <Text variant="headingMd" as="h6">
        Select Pages to display the bar
      </Text>

      <RadioButton
        label="Show on every page"
        checked={formData.pageRules === 'everyPage'}
        onChange={() => handlePageRuleChange('everyPage')}
      />

      <RadioButton
        label="Show on specific pages/products"
        checked={formData.pageRules === 'specificPages'}
        onChange={() => handlePageRuleChange('specificPages')}
      />

      <Collapsible open={showSpecificOptions}>
        <BlockStack gap="4" inlineAlign="start">
          <div style={{ marginLeft: '20px' }}>
            <RadioButton
              label="Show on homepage only"
              checked={formData.subPageRules === 'homepage'}
              onChange={() => handleChange('subPageRules', 'homepage')}
            />
            <br />
            <RadioButton
              label="Show on all product pages"
              checked={formData.subPageRules === 'allProducts'}
              onChange={() => handleChange('subPageRules', 'allProducts')}
            />
            {/* <br />
            <RadioButton
              label="Show on specific product pages"
              checked={formData.subPageRules === 'specificProducts'}
              onChange={() => handleChange('subPageRules', 'specificProducts')}
            />
            {formData.subPageRules === 'specificProducts' && (
              <Button onClick={onSelectProduct} size="slim" textAlign="left">Select Product</Button>
            )} */}
            {/* <br />
            <RadioButton
              label="All products in specific collection"
              checked={formData.subPageRules === 'allProductsInCollection'}
              onChange={() => handleChange('subPageRules', 'allProductsInCollection')}
            />
            {formData.subPageRules === 'allProductsInCollection' && (
              <Button onClick={onSelectCollection} size="slim" textAlign="left">Select Collection</Button>
            )} */}
            <br />
            <RadioButton
              label="Show on all collection pages"
              checked={formData.subPageRules === 'allCollections'}
              onChange={() => handleChange('subPageRules', 'allCollections')}
            />
            {/* <br />
            <RadioButton
              label="Show on specific collection pages"
              checked={formData.subPageRules === 'specificCollections'}
              onChange={() => handleChange('subPageRules', 'specificCollections')}
            />
            {formData.subPageRules === 'specificCollections' && (
              <Button onClick={onSelectCollection} size="slim" textAlign="left">Select Collection</Button>
            )} */}
          </div>
        </BlockStack>
      </Collapsible>
    </BlockStack>
  );
}