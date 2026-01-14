import React, { useCallback } from 'react';
import { Button, Card } from '@shopify/polaris';
import Logo from './Logo';
import Display from './Display';
import Layout from './Layout';
import Colors from './Colors';
import Typography from './Typography';
import TabNavigation from '../TabNavigation';
import PreviewPopup from '../PreviewPopup';

export const Style = ({ tabs, handleTabClick, activeTab, formData, setFormData,handlePublish }) => {

    const handleChange = useCallback((field, value) => {
        setFormData(prevData => ({ ...prevData, [field]: value }));
    }, []);

    const handleTemplateApply = useCallback((templateData) => {
        // Apply all template data to the form
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
                        <Logo
                            logo={formData.logo}
                            imageWidth={formData.imageWidth}
                            onChange={handleChange}
                        />
                        <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #e1e3e5' }} />
                        <Display
                            size={formData.size}
                            alignment={formData.alignment}
                            cornerRadius={formData.cornerRadius}
                            onChange={handleChange}
                        />
                        <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #e1e3e5' }} />
                        <Layout
                            imagePosition={formData.imagePosition}
                            backgroundImage={formData.backgroundImage}
                            backgroundOpacity={formData.backgroundOpacity}
                            onChange={handleChange}
                        />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '2px solid #e1e3e5' }} />
                        <Typography
                            fontFamily={formData.fontFamily}
                            headingSize={formData.headingSize}
                            bodySize={formData.bodySize}
                            buttonSize={formData.buttonSize}
                            footerSize={formData.footerSize}
                            onChange={handleChange}
                        />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '2px solid #e1e3e5' }} />
                        <Colors
                            formData={formData}
                            onChange={handleChange}
                        />
                        <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #e1e3e5' }} />
                        <Button primary fullWidth onClick={handlePublish}>Continue to Publish</Button>
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

export default Style;