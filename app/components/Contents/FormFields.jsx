import React, { useState } from 'react';
import { BlockStack, Checkbox, Button, TextField, Modal, Select } from '@shopify/polaris';

export const FormFields = ({ formData, setFormData }) => {
  const [defaultFields, setDefaultFields] = useState([
    { label: 'Name', checked: false, type: 'text' },
    { label: 'Email Address', checked: true, type: 'email' },
  ]);

  const [customFields, setCustomFields] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const handleAddField = () => {
    if (newFieldName.trim() !== '') {
      const newCustomField = {
        label: newFieldName.trim(),
        checked: true,
        type: newFieldType,
      };
      setCustomFields([...customFields, newCustomField]);
      setFormData(prevData => ({
        ...prevData,
        fields: [...prevData.fields, newCustomField],
      }));
      handleCloseModal();
    }
  };

  const handleCustomFieldToggle = (index) => {
    const updatedFields = [...customFields];
    updatedFields[index].checked = !updatedFields[index].checked;
    setCustomFields(updatedFields);
    setFormData(prevData => ({
      ...prevData,
      fields: [...defaultFields, ...updatedFields],
    }));
  };

  const handleDefaultFieldToggle = (index) => {
    const updatedFields = [...defaultFields];
    updatedFields[index].checked = !updatedFields[index].checked;
    setDefaultFields(updatedFields);
    setFormData(prevData => ({
      ...prevData,
      fields: [...updatedFields, ...customFields],
    }));
  };

  const fieldTypeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'tel' },
  ];

  return (
    <>
      <div style={{ marginTop: "14px" }}><b>Form</b></div>
      <div style={{ marginTop: "5px", color: 'gray' }}>Gather important details from your customers</div>
      <BlockStack>
        {defaultFields.map((field, index) => (
          <Checkbox
            key={index}
            label={field.label}
            checked={field.checked}
            onChange={() => handleDefaultFieldToggle(index)}
          />
        ))}
        {customFields.map((field, index) => (
          <Checkbox
            key={`custom-${index}`}
            label={field.label}
            checked={field.checked}
            onChange={() => handleCustomFieldToggle(index)}
          />
        ))}
      </BlockStack>
      <br />
      <Button onClick={handleOpenModal}>Add Form Field</Button>

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title="Add New Form Field"
        primaryAction={{
          content: 'Add Field',
          onAction: handleAddField,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack>
            <TextField
              label="Field Name"
              value={newFieldName}
              onChange={setNewFieldName}
              placeholder="e.g., Phone Number, Zip Code"
            />
            <Select
              label="Field Type"
              options={fieldTypeOptions}
              value={newFieldType}
              onChange={setNewFieldType}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
};

export default FormFields;
