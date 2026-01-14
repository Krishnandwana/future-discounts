import React from 'react';
import { Button, Text } from '@shopify/polaris';
import PropTypes from 'prop-types';

const AppEmbedChecker = ({ shopName, extensionId }) => {

  const getAppEmbedActivationUrl = () => {
    // Dynamically use the extension ID from props
    const handle = `${extensionId}/GeoDeals`;
    return `https://${shopName}/admin/themes/current/editor?context=apps&appEmbed=${handle}&target=newAppsSection`;
  };

  // This component now only shows the app embed not enabled message
  // The parent component determines when to show it
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* Left Aligned Text */}
      <div style={{ flex: 1 }}>
        <Text variant="headingMd">App Embed Not Enabled</Text>
        <Text variant="bodyMd" color="subdued">
          To ensure full functionality of the app, please enable the App Embed.
        </Text>
      </div>

      {/* Right Aligned Button */}
      <div>
        <Button
          onClick={() => window.open(getAppEmbedActivationUrl(), '_blank')}
        >
          Enable App Embed
        </Button>
      </div>
    </div>
  );
};

AppEmbedChecker.propTypes = {
  shopName: PropTypes.string.isRequired,
  extensionId: PropTypes.string,
};

export default AppEmbedChecker;