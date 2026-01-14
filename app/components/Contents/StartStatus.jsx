import React from 'react';
import { FormLayout, TextField } from '@shopify/polaris';

export const StartStatus = ({ heading, description, onChange }) => (
    <FormLayout>
        <TextField
            label="Heading"
            value={heading || ''}
            onChange={(value) => onChange('heading', value)}
            placeholder="Enter your popup heading"
            helpText="This is the main title that appears at the top"
            autoComplete="off"
        />
        <TextField
            label="Description"
            value={description || ''}
            onChange={(value) => onChange('description', value)}
            multiline={4}
            placeholder="Enter your popup description"
            helpText="Provide more details about your offer"
            autoComplete="off"
        />
    </FormLayout>
);
export default StartStatus;