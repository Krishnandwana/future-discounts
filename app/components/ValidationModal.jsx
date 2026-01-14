import React from 'react';
import { Modal, Text, BlockStack, InlineStack, Button, Icon, Box } from '@shopify/polaris';
import { AlertCircleIcon, AlertTriangleIcon } from '@shopify/polaris-icons';

export default function ValidationModal({ 
  open, 
  onClose, 
  onConfirm, 
  errors, 
  warnings, 
  action = 'save',
  hasOnlyWarnings = false 
}) {
  const actionText = action === 'publish' ? 'Publish' : 'Save';
  const hasErrors = errors && errors.length > 0;
  const hasWarnings = warnings && warnings.length > 0;
  const totalIssues = (errors?.length || 0) + (warnings?.length || 0);
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      primaryAction={{
        content: `${actionText} Anyway`,
        onAction: onConfirm,
        destructive: false,
      }}
      secondaryActions={[
        {
          content: 'Go Back & Fix',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="500">
          {/* Header with icon and title */}
          <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              backgroundColor: hasErrors ? '#FEE2E2' : '#FEF3C7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon 
                source={hasErrors ? AlertCircleIcon : AlertTriangleIcon} 
                color={hasErrors ? "critical" : "warning"}
              />
            </div>
            <Text variant="headingLg" as="h2" fontWeight="semibold">
              {totalIssues} {totalIssues === 1 ? 'Issue' : 'Issues'} Found
            </Text>
            <Text variant="bodyMd" color="subdued" style={{ marginTop: '4px' }}>
              We found some issues with your configuration
            </Text>
          </div>

          {/* Issues list with better styling */}
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            <BlockStack gap="300">
              {/* Errors Section */}
              {hasErrors && (
                <div style={{
                  backgroundColor: '#FAFAFA',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #E5E5E5'
                }}>
                  <InlineStack gap="200" align="start" blockAlign="start">
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#FEE2E2',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon source={AlertCircleIcon} color="critical" />
                    </div>
                    <BlockStack gap="200">
                      <Text variant="headingMd" fontWeight="semibold">
                        Critical Issues
                      </Text>
                      <BlockStack gap="100">
                        {errors.map((error, index) => {
                          const [field, ...messageParts] = error.split(':');
                          const message = messageParts.join(':').trim();
                          return (
                            <div key={index} style={{ paddingLeft: '4px' }}>
                              <Text variant="bodySm" color="subdued">
                                {field}:
                              </Text>
                              <Text variant="bodyMd">
                                {message}
                              </Text>
                            </div>
                          );
                        })}
                      </BlockStack>
                    </BlockStack>
                  </InlineStack>
                </div>
              )}

              {/* Warnings Section */}
              {hasWarnings && (
                <div style={{
                  backgroundColor: '#FFFBF0',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #F3E8D0'
                }}>
                  <InlineStack gap="200" align="start" blockAlign="start">
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#FEF3C7',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon source={AlertTriangleIcon} color="warning" />
                    </div>
                    <BlockStack gap="200">
                      <Text variant="headingMd" fontWeight="semibold">
                        Warnings
                      </Text>
                      <BlockStack gap="100">
                        {warnings.map((warning, index) => {
                          const [field, ...messageParts] = warning.split(':');
                          const message = messageParts.join(':').trim();
                          return (
                            <div key={index} style={{ paddingLeft: '4px' }}>
                              <Text variant="bodySm" color="subdued">
                                {field}:
                              </Text>
                              <Text variant="bodyMd">
                                {message}
                              </Text>
                            </div>
                          );
                        })}
                      </BlockStack>
                    </BlockStack>
                  </InlineStack>
                </div>
              )}
            </BlockStack>
          </div>

          {/* Important notice for "will never show" warnings */}
          {warnings && warnings.some(w => w.includes('will never show')) && (
            <div style={{
              backgroundColor: '#FFF4E6',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #FFD6A5',
              textAlign: 'center'
            }}>
              <Text variant="bodyMd" fontWeight="semibold">
                ⚠️ Important: Your popup won't be visible to customers with these settings
              </Text>
            </div>
          )}

          {/* Action message */}
          <div style={{ 
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <Text variant="bodyMd">
              You can still {actionText.toLowerCase()} with these issues and fix them later, or go back and fix them now.
            </Text>
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}