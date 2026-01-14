import React, { useState } from 'react';
import { Page, Popover, ColorPicker, TextField, Text } from '@shopify/polaris';

const Colors = ({ formData, onChange }) => {
  // Helper functions
  const hsbToRgb = ({ hue = 0, saturation = 0, brightness = 0 }) => {
    const chroma = brightness * saturation;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
    let [red, green, blue] = [0, 0, 0];

    if (huePrime >= 0 && huePrime <= 1) {
      [red, green, blue] = [chroma, x, 0];
    } else if (huePrime > 1 && huePrime <= 2) {
      [red, green, blue] = [x, chroma, 0];
    } else if (huePrime > 2 && huePrime <= 3) {
      [red, green, blue] = [0, chroma, x];
    } else if (huePrime > 3 && huePrime <= 4) {
      [red, green, blue] = [0, x, chroma];
    } else if (huePrime > 4 && huePrime <= 5) {
      [red, green, blue] = [x, 0, chroma];
    } else if (huePrime > 5 && huePrime <= 6) {
      [red, green, blue] = [chroma, 0, x];
    }

    const m = brightness - chroma;
    [red, green, blue] = [
      Math.round((red + m) * 255),
      Math.round((green + m) * 255),
      Math.round((blue + m) * 255),
    ];

    return { red, green, blue };
  };

  const rgbToHex = ({ red = 0, green = 0, blue = 0 }) => {
    const toHex = (value) => {
      if (typeof value !== 'number' || isNaN(value)) {
        return '00';
      }
      return value.toString(16).padStart(2, '0');
    };
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  };

  const hexToRgb = (hex) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('');
    }
    if (hex.length !== 6) {
      return { red: 0, green: 0, blue: 0, alpha: 1 };
    }
    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) {
      return { red: 0, green: 0, blue: 0, alpha: 1 };
    }
    const red = (bigint >> 16) & 255;
    const green = (bigint >> 8) & 255;
    const blue = bigint & 255;
    return { red, green, blue, alpha: 1 };
  };

  const rgbToHsb = ({ red, green, blue }) => {
    red /= 255;
    green /= 255;
    blue /= 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const diff = max - min;

    let hue = 0;
    if (max === min) {
      hue = 0;
    } else if (max === red) {
      hue = (60 * ((green - blue) / diff) + 360) % 360;
    } else if (max === green) {
      hue = (60 * ((blue - red) / diff) + 120) % 360;
    } else if (max === blue) {
      hue = (60 * ((red - green) / diff) + 240) % 360;
    }

    const saturation = max === 0 ? 0 : (diff / max) * 100;
    const brightness = max * 100;

    return { hue, saturation, brightness };
  };

  const [popoverActive, setPopoverActive] = useState(false);
  const [currentColor, setCurrentColor] = useState({ hue: 0, saturation: 0, brightness: 100 });
  const [currentHex, setCurrentHex] = useState('#FFFFFF');
  const [currentField, setCurrentField] = useState('');

  const colorData = {
    ...((formData?.backgroundImage && formData?.imagePosition !== 'background') || !formData?.backgroundImage ? {
      Colors: [{ label: 'Background', field: 'backgroundColor' }],
    } : {}),
    Text: [
      { label: 'Heading', field: 'headingColor' },
      { label: 'Description', field: 'descriptionColor' },
      { label: 'Input', field: 'inputColor' },
      { label: 'Consent', field: 'consentColor' },
      { label: 'Error', field: 'errorColor' },
      { label: 'Footer Text', field: 'footerTextColor' }
    ],
    'Primary Button': [
      { label: 'Background', field: 'primaryButtonBackground' },
      { label: 'Text', field: 'primaryButtonTextColor' }
    ],
    'Secondary Button': [
      // { label: 'Background', field: 'secondaryButtonBackground' },
      { label: 'Text', field: 'secondaryButtonTextColor' }
    ],
    'Sticky Discount Bar': [
      { label: 'Background', field: 'stickyDiscountBarBackground' },
      { label: 'Text', field: 'stickyDiscountBarText' }
    ],
    // 'Sidebar Widget': [
    //   { label: 'Background', field: 'sidebarWidgetBackground' },
    //   { label: 'Text', field: 'sidebarWidgetText' }
    // ]
  };

  const handleColorPickerOpen = (field) => {
    setCurrentField(field);
    const color = formData[field];
    const rgbColor = hexToRgb(color);
    const hsbColor = rgbToHsb(rgbColor);
    setCurrentColor(hsbColor);
    setCurrentHex(color);
    setPopoverActive(true);
  };

  const handleColorChange = (newColor) => {
    setCurrentColor(newColor);
    const rgbColor = hsbToRgb(newColor);
    const hexColor = rgbToHex(rgbColor);
    setCurrentHex(hexColor);
    onChange(currentField, hexColor);
  };

  const handleHexCodeChange = (hex) => {
    setCurrentHex(hex);
    // const isValidHex = /^#([0-9A-Fa-f]{6})$/.test(hex);
    // if (isValidHex) {
      // const rgbColor = hexToRgb(hex);
      setCurrentColor(hex);
      onChange(currentField, hex.toUpperCase());
    // }
  };

 
 

  return (
    <Page fullWidth>
      <div style={{ display: '', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
        {Object.entries(colorData).map(([section, colors], sectionIndex) => (
          <div key={sectionIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <Text variant="headingMd" as="h2">{section}</Text>
              <br />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                {colors.map((field, colorIndex) => (
                  <ColorBlock key={colorIndex} label={field.label} field={field.field} popoverActive={popoverActive} currentField={currentField} handleColorPickerOpen={handleColorPickerOpen} formData={formData} setPopoverActive={setPopoverActive} currentColor={currentColor} handleColorChange={handleColorChange} currentHex={currentHex} handleHexCodeChange={handleHexCodeChange}/>
                ))}
              </div>
            </div>
            </div>
        ))}
      </div>
    </Page>
  );
};

export default Colors;

 const ColorBlock = ({ label, field, popoverActive, currentField, handleColorPickerOpen, formData, setPopoverActive, currentColor, handleColorChange, currentHex, handleHexCodeChange }) => {
    return (
      <Popover
        active={popoverActive && currentField === field}
        activator={
          <div
            onClick={() => handleColorPickerOpen(field)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            <div
              style={{
                backgroundColor: formData[field],
                width: '30px',
                height: '30px',
                borderRadius: '4px',
                border: '1px solid #e1e3e5'
              }}
            />
            <Text variant="bodyMd">{label}</Text>
          </div>
        }
        onClose={() => setPopoverActive(false)}
        sectioned
      >
        <ColorPicker color={currentColor} onChange={handleColorChange} allowAlpha={false} />
        <TextField
          label="Hex Code"
          value={currentHex}
          onChange={handleHexCodeChange}
          autoComplete="off"
        />
      </Popover>
    );
  };
