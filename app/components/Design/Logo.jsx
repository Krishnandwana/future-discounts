import React, { useState, useEffect } from 'react';
import { DropZone, InlineStack, RangeSlider, Banner, Text } from '@shopify/polaris';

const Logo = ({ logo, imageWidth, onChange }) => {
  const [showDropZone, setShowDropZone] = useState(!logo);
  const [localImageWidth, setLocalImageWidth] = useState(imageWidth || 100);
  const [error, setError] = useState('');

  useEffect(() => {
    if (logo !== undefined) {
      onChange('logo', logo);
    }
  }, [logo]);

  useEffect(() => {
    onChange('imageWidth', localImageWidth);
  }, [localImageWidth]);

  const handleDropZoneDrop = (files) => {
    const file = files[0];

    if (file && file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Please upload a logo less than 2MB');
        return;
      }

      setError('');
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Image = reader.result;
        onChange('logo', base64Image);
        setShowDropZone(false);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange('logo', null);
    setShowDropZone(true);
    setError('');
  };

  const handleImageWidthChange = (value) => {
    setLocalImageWidth(value);
  };

  const fileUpload = !logo && (
    <DropZone.FileUpload
      actionTitle="Add file"
      actionHint="or drop files to upload"
    />
  );

  const uploadedFile = logo && (
    <InlineStack vertical>
      <InlineStack alignment="center">
        <div style={{ padding: '0.5rem' }}>
          <img
            src={logo}
            alt="Uploaded logo"
            style={{
              width: `${localImageWidth}px`,
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
      <Text as="h2" variant="headingMd">Logo</Text>

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
      {logo && (
        <div style={{ marginTop: '1rem' }}>
          <RangeSlider
            label="Image Width"
            value={localImageWidth}
            onChange={handleImageWidthChange}
            output
            min={10}
            max={100}
            step={10}
          />
        </div>
      )}
    </>
  );
};

export default Logo;
