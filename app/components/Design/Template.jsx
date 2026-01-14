import React, { useState } from 'react';
import { Card, Select, Text, BlockStack, Button, Box } from '@shopify/polaris';
import popupTemplates from '../../data/popupTemplates.json';

const Template = ({ template, onChange, onTemplateApply }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(template || 'custom');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  return (
    <>
      <Text as="h1">Template</Text>
      <div style={{marginBottom:'8px'}}></div>
      <Select
        options={Object.entries(popupTemplates).map(([key, template]) => ({
          label: template.name,
          value: key
        }))}
        onChange={(value) => {
          setSelectedTemplate(value);
          onChange('template', value);

          // Auto-apply template when selected
          if (value !== 'custom' && onTemplateApply) {
            onTemplateApply(popupTemplates[value].data);
          }
        }}
        value={selectedTemplate}
      />
    </>
  );
};

export default Template;