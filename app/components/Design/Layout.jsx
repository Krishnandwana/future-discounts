import React, { useState, useEffect } from 'react';
import { Card, Select, DropZone, InlineStack, Thumbnail, Text, Banner, RangeSlider, BlockStack } from '@shopify/polaris';

const Layout = ({ imagePosition, backgroundImage, backgroundOpacity, onChange }) => {
  const [showDropZone, setShowDropZone] = useState(!backgroundImage);
  const [error, setError] = useState('');

  useEffect(() => {
    onChange('backgroundImage', backgroundImage);
  }, [backgroundImage, onChange]);

  const handleDropZoneDrop = (files) => {
    const file = files[0];
    
    if (file && file.type.startsWith('image/')) {
      // Check file size (2MB = 2 * 1024 * 1024 bytes)
      if (file.size > 2 * 1024 * 1024) {
        setError('Please upload an image less than 2MB');
        return;
      }

      setError(''); // Clear any existing error
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Image = reader.result;
        onChange('backgroundImage', base64Image);
        setShowDropZone(false);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange('backgroundImage', null);
    setShowDropZone(true);
    setError(''); // Clear any error when removing image
  };

  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

  const fileUpload = !backgroundImage && (
    <DropZone.FileUpload
      actionTitle="Add file"
      actionHint="or drop files to upload"
    />
  );

  const uploadedFile = backgroundImage && (
    <InlineStack vertical>
      <InlineStack alignment="center">
        <div style={{ padding: '0.5rem' }}>
          <img
            src={backgroundImage}
            alt="Uploaded background"
            style={{
              maxWidth: '100px',
              maxHeight: '100px',
              objectFit: 'contain'
            }}
          />
        </div>
        <div>
          <InlineStack vertical spacing="extraTight">
            <p>Image</p>
            <p className="text-sm text-gray-500">
              Less than 2MB; Accepts .jpg, .png, .gif, .jpeg;
              recommended: 600x400 pixels.
            </p>
          </InlineStack>
        </div>
      </InlineStack>
      <div style={{ marginTop: '0.5rem' }}>
        <button
          onClick={handleRemove}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <span style={{ marginRight: '0.5rem' }}>Remove</span>
        </button>
      </div>
    </InlineStack>
  );

  return (
    <>
      <Text as="h2" variant="headingMd" style={{ marginTop: '1rem' }}>Background Image</Text>
      
      {error && (
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <Banner status="critical" onDismiss={() => setError('')}>
            <p>{error}</p>
          </Banner>
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        {showDropZone ? (
          <DropZone
            accept="image/*"
            type="image"
            onDrop={handleDropZoneDrop}
            allowMultiple={false}
            errorOverlayText={error}
          >
            {fileUpload}
          </DropZone>
        ) : (
          uploadedFile
        )}
      </div>

      <br />
      <BlockStack gap="400">
        <div>
          <div style={{ marginBottom: '8px' }}>Image Position</div>
          <Select
            options={[
              { label: 'Left', value: 'left' },
              { label: 'Right', value: 'right' },
              { label: 'Background', value: 'background' },
            ]}
            onChange={(value) => onChange('imagePosition', value)}
            value={imagePosition}
          />
        </div>
        
        {/* Image Transparency - Commented out as not working currently
        {backgroundImage && (
          <div>
            <RangeSlider
              label="Image Transparency"
              value={backgroundOpacity || 100}
              onChange={(value) => onChange('backgroundOpacity', value)}
              output
              min={10}
              max={100}
              step={5}
              suffix={<p style={{ minWidth: '35px' }}>{backgroundOpacity || 100}%</p>}
              helpText="Lower values make the image more transparent"
            />
          </div>
        )} */}
      </BlockStack>
    </>
  );
};

export default Layout;