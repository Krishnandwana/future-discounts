import React, { useCallback } from 'react';
import { Button, Card, Select, BlockStack, Text } from '@shopify/polaris';
import Template from '../Design/Template';
import StartStatus from './StartStatus';
import FormFields from './FormFields';
import Actions from './Actions';
import FooterText from './FooterText';
import SuccessStatus from './SuccessStatus';
import TabNavigation from '../TabNavigation';
import PreviewPopup from '../PreviewPopup';

export const ContentPage = ({ tabs, handleTabClick, activeTab, formData, setFormData }) => {
    const handleChange = (field, value) => {
        setFormData(prevData => ({ ...prevData, [field]: value }));
    };

    const handleToggle = (field) => {
        setFormData(prevData => ({ ...prevData, [field]: !prevData[field] }));
    };

    const handleContinueToContent = () => {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        if (currentIndex < tabs.length - 1) {
            handleTabClick(tabs[currentIndex + 1].id);
        }
    };

    const handleTemplateApply = useCallback((templateData) => {
        setFormData(prevData => ({
            ...prevData,
            ...templateData
        }));
    }, [setFormData]);

    return (
        <div style={{ 
            display: 'flex', 
            height: 'calc(100vh - 120px)'
        }}>
            <div style={{ 
                width: '44%', 
                height: '100%', 
                overflowY: 'auto', 
                backgroundColor: '#f6f6f7',
                padding: '1.5rem'
            }}>
                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <TabNavigation tabs={tabs} activeTab={activeTab} onTabClick={handleTabClick} />
                        <div style={{ marginTop: "35px" }}></div>
                        
                        <BlockStack gap="400">
                            <div>
                                <Text as="h2" variant="headingMd">Template</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    Choose a pre-designed template or start from scratch
                                </Text>
                                <Template
                                    template={formData.template}
                                    onChange={handleChange}
                                    onTemplateApply={handleTemplateApply}
                                />
                            </div>

                            <div>
                                <Text as="h2" variant="headingMd">Text Alignment</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    Control how your text is aligned in the popup
                                </Text>
                                <Select
                                    label=""
                                    options={[
                                        { label: 'Center', value: 'center' },
                                        { label: 'Left', value: 'left' },
                                        { label: 'Right', value: 'right' },
                                    ]}
                                    onChange={(value) => handleChange('alignment', value)}
                                    value={formData.alignment || 'center'}
                                />
                            </div>

                            <div>
                                <Text as="h2" variant="headingMd">Start Status</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    Attract customers to subscribe with a discount code
                                </Text>
                                <StartStatus
                                    heading={formData.heading}
                                    description={formData.description}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <Text as="h2" variant="headingMd">Form Fields</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    Choose what information to collect from visitors
                                </Text>
                                <FormFields formData={formData} setFormData={setFormData} />
                            </div>

                            <div>
                                <Text as="h2" variant="headingMd">Actions</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    Configure primary and secondary buttons
                                </Text>
                                <Actions
                                    primaryButton={formData.primaryButton}
                                    primaryButtonText={formData.primaryButtonText}
                                    secondaryButton={formData.secondaryButton}
                                    secondaryButtonText={formData.secondaryButtonText}
                                    onToggle={handleToggle}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <Text as="h2" variant="headingMd">Footer Text</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    Add legal text or additional information
                                </Text>
                                <FooterText
                                    footerText={formData.footerText}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <Text as="h2" variant="headingMd">Success Status</Text>
                                <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px', marginBottom: '12px' }}>
                                    What visitors see after submitting the form
                                </Text>
                                <SuccessStatus
                                    heading={formData.sucessStatusHeading}
                                    description={formData.successDescription}
                                    clickAction={formData.clickAction}
                                    buttonText={formData.buttonText}
                                    redirectUrl={formData.redirectUrl}
                                    onChange={handleChange}
                                />
                            </div>
                        </BlockStack>

                        <div style={{ marginTop: '32px' }}>
                            <Button primary fullWidth onClick={handleContinueToContent}>Continue to Design</Button>
                        </div>
                    </div>
                </Card>
            </div>
            <div style={{ 
                width: '56%', 
                height: '100%', 
                backgroundColor: '#f6f6f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderLeft: '1px solid #e1e3e5'
            }}>
                <PreviewPopup formData={formData} />
            </div>
        </div>
    );
};

export default ContentPage;