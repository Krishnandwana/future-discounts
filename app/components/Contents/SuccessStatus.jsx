import React from 'react';
import { FormLayout, TextField, Select, BlockStack } from '@shopify/polaris';

export const SuccessStatus = ({
    heading,
    description,
    clickAction,
    buttonText,
    redirectUrl,
    onChange
}) => {
    return (
        <FormLayout>
            <TextField
                label="Success Heading"
                value={heading || ''}
                onChange={(value) => onChange('sucessStatusHeading', value)}
                placeholder="e.g., Welcome to the Family! 🎊"
                helpText="Title shown after form submission"
                autoComplete="off"
            />
            <TextField
                label="Success Description"
                value={description || ''}
                onChange={(value) => onChange('successDescription', value)}
                multiline={3}
                placeholder="e.g., Check your email for your exclusive discount code."
                helpText="Message shown after successful submission"
                autoComplete="off"
            />
            <BlockStack gap="300">
                <Select
                    label="Button Action"
                    options={[
                        { label: 'Close Form', value: 'closeForm' },
                        { label: 'No Call To Action', value: 'NoAction' },
                        { label: 'Redirect', value: 'redirect' }
                    ]}
                    onChange={(value) => onChange('clickAction', value)}
                    value={clickAction || 'closeForm'}
                    helpText="What happens when the button is clicked"
                />
                {(clickAction === 'closeForm' || clickAction === 'redirect') && (
                    <TextField
                        label="Button Text"
                        value={buttonText || ''}
                        onChange={(value) => onChange('buttonText', value)}
                        placeholder="e.g., Continue Shopping"
                        autoComplete="off"
                    />
                )}
                {clickAction === 'redirect' && (
                    <TextField
                        label="Redirect URL"
                        value={redirectUrl || ''}
                        onChange={(value) => onChange('redirectUrl', value)}
                        placeholder="https://example.com"
                        helpText="Full URL to redirect to"
                        autoComplete="off"
                    />
                )}
            </BlockStack>
        </FormLayout>
    );
}
export default SuccessStatus;