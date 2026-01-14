import React from 'react';
import { Button, Card } from '@shopify/polaris';
import DiscountOptions from './DiscountOptions';
import DiscountLocation from './DiscountLocation';
import StickyDiscountBar from './StickyDiscountBar';
import Trigger from './Trigger';
import When from './when';
import ScheduleRules from './ScheduleRules';
import TabNavigation from '../TabNavigation';
import PreviewPopup from '../PreviewPopup';
import Mobile from './MobileDevice';

const RulesPage = ({ tabs, handleTabClick, activeTab,formData, setFormData }) => {

    const handleChange = (field, value) => {
        setFormData((prevData) => ({ ...prevData, [field]: value }));
    };

    const handleContinueToContent = () => {
        // Find the index of the current tab
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        // If there's a next tab, navigate to it
        if (currentIndex < tabs.length - 1) {
            handleTabClick(tabs[currentIndex + 1].id);
        }
    };

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
                        <DiscountOptions formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                        <DiscountLocation formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                        <Trigger formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                        
                        {/* <SidebarWidget formData={formData} handleChange={handleChange} /> 
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />*/}
                        
                        <When formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                        
                        {!formData.devices.includes('desktop') && (
                            <>
                                <Mobile formData={formData} handleChange={handleChange} />
                                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                            </>
                        )}
                        
                        <StickyDiscountBar formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                        {/* <Frequency formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />
                        <PageRules formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} />*/}
                        <ScheduleRules formData={formData} handleChange={handleChange} />
                        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e3e5' }} /> 
                        <Button primary fullWidth onClick={handleContinueToContent}>Continue to Content</Button>
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
    )
}

export default RulesPage