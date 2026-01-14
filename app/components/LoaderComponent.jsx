import React from 'react';
import { Layout, Page, Spinner, Text, BlockStack } from '@shopify/polaris';

const LoaderComponent = ({ setIsLoading }) => {
    const containerStyles = {
        width: '100%',
        height: '80vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 'auto'
    };

    return (
        <Page fullWidth>
            <Layout>
                <Layout.Section>
                    <style>
                        {`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}
                    </style>
                    <div style={containerStyles}>
                        <BlockStack align="center" gap="400">
                            <div style={{
                                width: '60px',
                                height: '60px',
                                border: '4px solid #f3f3f3',
                                borderTop: '4px solid #008060',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <Text variant="headingMd" style={{
                                color: '#6D7175'
                            }}>
                                Loading...
                            </Text>
                        </BlockStack>
                    </div>
                </Layout.Section>
            </Layout>
        </Page>
    );
};

export default LoaderComponent;
