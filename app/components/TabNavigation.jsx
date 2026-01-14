import React from 'react';

const TabNavigation = ({ tabs, activeTab, onTabClick }) => {
    return (
        <div
            style={{
                width: '100%',
                background: 'white',
                border: '1px solid #EFEFEF',
                borderRadius: '12px',
                padding: '0px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap', // Allow tabs to wrap to the next line on smaller screens
                }}
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        style={{
                            flex: '1 1 auto', // Allow each tab to grow and shrink
                            padding: '8px 20px', // Adjust padding for a better look
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            backgroundColor: activeTab === tab.id ? '#E3E3E3' : 'transparent',
                            textAlign: 'center', // Center the tab content
                        }}
                    >
                        {tab.content}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabNavigation;
