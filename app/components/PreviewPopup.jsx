import { Button, Card, Icon, InlineStack, Text, TextField } from '@shopify/polaris';
import React, { useState, useEffect, useRef } from 'react';

const PreviewPopup = ({ formData }) => {
  const [activeTab, setActiveTab] = useState('startStatus');
  const [popupHeight, setPopupHeight] = useState('auto');
  const imageRef = useRef(null);
  
  // Get font settings
  const fontFamily = formData?.fontFamily === 'system' ? 'inherit' : formData?.fontFamily;
  const fontSizes = {
    heading: `${formData?.headingSize || 18}px`,
    body: `${formData?.bodySize || 14}px`,
    button: `${formData?.buttonSize || 12}px`,
    footer: `${formData?.footerSize || 11}px`
  };
  
  // Add effect to adjust height based on image loading
  useEffect(() => {
    // Function to update the height based on image
    const updateHeight = () => {
      if (formData?.backgroundImage && formData?.imagePosition === 'background' && imageRef.current) {
        // Let the image dictate the height naturally
        setPopupHeight('auto');
      } else {
        // Default height for other cases
        setPopupHeight('auto');
      }
    };

    // Call immediately and also set up image onload handler
    updateHeight();
    
    // Create an image element to check dimensions
    if (formData?.backgroundImage) {
      const img = new Image();
      img.onload = updateHeight;
      img.src = formData.backgroundImage;
    }
  }, [formData?.backgroundImage, formData?.imagePosition]);
  
  const getBorderRadius = (cornerRadius) => {
    switch (cornerRadius) {
      case 'standard':
        return '16px';
      case 'rounded':
        return '100%';
      case 'sharp':
        return '0';
      default:
        return '16px';
    }
  };
  const radius = activeTab === 'stickyDiscountBar' ? '0px' : getBorderRadius(formData?.cornerRadius);

  
  const tabStyle = (tabName) => ({
    padding: '5px 20px',
    cursor: 'pointer',
    borderRadius: '10px',
    backgroundColor: activeTab === tabName ? '#E3E3E3' : 'transparent',
  });


  return (
    <div>
      <div style={{ background: 'white', padding: '8px', borderRadius: '10px' }}>
        <InlineStack>
          <div style={tabStyle('startStatus')} onClick={() => setActiveTab('startStatus')}>
            <Text>Start Status</Text>
          </div>
          <div style={tabStyle('successStatus')} onClick={() => setActiveTab('successStatus')}>
            <Text>Success Status</Text>
          </div>
          <div style={tabStyle('stickyDiscountBar')} onClick={() => setActiveTab('stickyDiscountBar')}>
            <Text>Sticky Discount Bar</Text>
          </div>
          {/* <div style={{ marginLeft: 'auto', marginRight: '5px' }}>
            <a
              href="https://youtu.be/Xv-R7c-wog0"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'black' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 333333 333333"
                shapeRendering="geometricPrecision"
                textRendering="geometricPrecision"
                imageRendering="optimizeQuality"
                fillRule="evenodd"
                clipRule="evenodd"
                style={{ width: '24px', height: '24px', marginRight: '5px' }}
              >
                <path
                  d="M329930 100020s-3254-22976-13269-33065c-12691-13269-26901-13354-33397-14124-46609-3396-116614-3396-116614-3396h-122s-69973 0-116608 3396c-6522 793-20712 848-33397 14124C6501 77044 3316 100020 3316 100020S-1 126982-1 154001v25265c0 26962 3315 53979 3315 53979s3254 22976 13207 33082c12685 13269 29356 12838 36798 14254 26685 2547 113354 3315 113354 3315s70065-124 116675-3457c6522-770 20706-848 33397-14124 10021-10089 13269-33090 13269-33090s3319-26962 3319-53979v-25263c-67-26962-3384-53979-3384-53979l-18 18-2-2zM132123 209917v-93681l90046 46997-90046 46684z"
                  fill="red"
                />
              </svg>
              <Text>Watch Tutorial</Text>
            </a>
          </div> */}
        </InlineStack>
      </div>
      <br />
      <Card>
        <div className="preview-popup" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: activeTab === 'stickyDiscountBar' ? 'flex-start' : 'center',
          height: '65vh',
          padding: activeTab === 'stickyDiscountBar' ? '0px' : '8px',
          backgroundColor: 'lightgray'
        }}>
          <div
            style={{
              position: 'relative',
              textAlign: 'center',
              padding: '0px',
              backgroundColor: formData?.backgroundColor,
              backgroundImage: formData?.imagePosition === 'background' && formData?.backgroundImage
                ? `url(${formData?.backgroundImage})`
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: radius,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              maxWidth: activeTab === 'stickyDiscountBar' ? '100%' : '500px',
              width: '100%',
              marginInline: 'auto',
              overflow: 'hidden',
              maxHeight: activeTab === 'stickyDiscountBar' ? 'auto' : (formData?.imagePosition === 'background' ? 'none' : '500px'),
              height: activeTab === 'stickyDiscountBar' ? 'auto' : (formData?.imagePosition === 'background' ? popupHeight : 'auto')
            }}
            ref={imageRef}
          >
            {/* Background overlay for opacity control */}
            {formData?.imagePosition === 'background' && formData?.backgroundImage && formData?.backgroundOpacity < 100 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: formData?.backgroundColor || '#FFFFFF',
                opacity: (100 - (formData?.backgroundOpacity || 100)) / 100,
                borderRadius: radius,
                pointerEvents: 'none'
              }} />
            )}
            
            <div
              style={{
                display: (formData?.imagePosition === 'left' || formData?.imagePosition === 'right') ? 'flex' : 'block',
                flexDirection: formData?.imagePosition === 'left' ? 'row' : 'row-reverse',
                borderRadius: radius,
                width: '100%',
                height: activeTab === 'stickyDiscountBar' ? 'auto' : '100%',
                alignItems: 'stretch', // Ensures full height
                overflow: 'hidden', // Prevents content from spilling out
                position: 'relative'
              }}
            >
              {/* Image container with adaptive sizing */}
              {(formData?.imagePosition === 'left' || formData?.imagePosition === 'right') && formData?.backgroundImage && activeTab !== 'stickyDiscountBar' && (
                <div
                  style={{
                    width: '40%', // Give more room for content
                    minHeight: '100%', // Ensure image fills the entire height
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                  <img 
                    src={formData?.backgroundImage}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      position: 'absolute', // Position absolute to fill container
                      top: 0,
                      left: 0,
                      opacity: (formData?.backgroundOpacity || 100) / 100,
                      borderTopLeftRadius: formData?.imagePosition === 'left' ? radius : '0',
                      borderBottomLeftRadius: formData?.imagePosition === 'left' ? radius : '0',
                      borderTopRightRadius: formData?.imagePosition === 'right' ? radius : '0',
                      borderBottomRightRadius: formData?.imagePosition === 'right' ? radius : '0'
                    }}
                    alt="" 
                    ref={imageRef}
                  />
                </div>
              )}
              
              {/* Content container - adaptive width to match parent */}
              <div
                style={{
                  flex: 1, // Take the remaining space
                  height: 'auto', // Allow natural height
                  padding: activeTab === 'stickyDiscountBar' ? '0' : '32px 24px',
                  position: 'relative'
                }}
              >
                {activeTab === 'startStatus' ? (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        direction: formData?.alignment === 'right' ? 'rtl' : 'ltr',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ 
                        width: '100%', 
                        display: 'flex',
                        flexDirection: formData?.alignment === 'left' && formData?.logo ? 'row' : 'column',
                        justifyContent: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                        alignItems: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : formData?.logo && formData?.alignment === 'left' ? 'center' : 'flex-start',
                        marginBottom: '24px',
                        gap: formData?.alignment === 'left' && formData?.logo ? '16px' : '0'
                      }}>
                        {formData?.logo && (
                          <div style={{ 
                            marginBottom: formData?.alignment === 'left' ? '0' : '24px',
                            display: 'flex',
                            justifyContent: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                            flexShrink: 0
                          }}>
                            <img
                              src={formData?.logo}
                              alt="Logo"
                              style={{
                                width: formData?.imageWidth || '80px',
                                height: formData?.imageWidth || '80px',
                                objectFit: 'cover',
                                borderRadius: getBorderRadius(formData?.cornerRadius),
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                          </div>
                        )}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          justifyContent: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                          alignItems: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                          ...(formData?.alignment === 'left' && formData?.logo ? { flex: 1 } : { width: '100%' }),
                          marginBottom: '0'
                        }}>
                          <h2 style={{ 
                            fontSize: fontSizes.heading, 
                            fontWeight: 700, 
                            color: formData?.headingColor, 
                            fontFamily: fontFamily,
                            margin: '0 0 12px 0',
                            lineHeight: '1.3',
                            letterSpacing: '-0.02em',
                            textAlign: formData?.alignment,
                            width: '100%'
                          }}>
                            {formData?.heading}
                          </h2>
                          <p style={{
                            margin: '0', 
                            color: formData?.descriptionColor, 
                            fontSize: fontSizes.body, 
                            direction: formData?.alignment === 'right' ? 'rtl' : 'ltr', 
                            fontFamily: fontFamily,
                            lineHeight: '1.6',
                            textAlign: formData?.alignment,
                            width: '100%'
                          }}>
                            {formData?.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    {formData?.fields && formData?.fields.map((field, index) => (
                      field.checked && (
                        <input
                          key={index}
                          type={field.type}
                          placeholder={`Enter ${field.label}`}
                          style={{
                            padding: '14px 16px',
                            width: '100%',
                            borderRadius: '8px',
                            border: `2px solid #e1e3e5`,
                            marginBottom: '16px',
                            fontSize: fontSizes.button,
                            backgroundColor: formData?.inputColor,
                            color: formData?.textColor,
                            fontFamily: fontFamily,
                            boxSizing: 'border-box',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      )
                    ))}
                    {formData?.primaryButton && (
                      <button
                        style={{
                          background: `linear-gradient(135deg, ${formData?.primaryButtonBackground} 0%, ${formData?.primaryButtonBackground}dd 100%)`,
                          color: formData?.primaryButtonTextColor,
                          padding: '14px 24px',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          width: '100%',
                          marginBottom: '12px',
                          fontSize: fontSizes.button,
                          fontWeight: 600,
                          fontFamily: fontFamily,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          letterSpacing: '0.3px'
                        }}
                      >
                        {formData?.primaryButtonText}
                      </button>
                    )}

                    {formData?.secondaryButton && (
                      <p style={{ 
                        margin: '0', 
                        color: formData?.secondaryButtonTextColor, 
                        cursor: 'pointer', 
                        fontSize: fontSizes.button, 
                        fontFamily: fontFamily,
                        fontWeight: 500,
                        padding: '8px 0',
                        transition: 'color 0.2s ease'
                      }}>
                        {formData?.secondaryButtonText}
                      </p>
                    )}

                    <small style={{ 
                      display: 'block',
                      fontSize: fontSizes.footer,
                      lineHeight: '1.6',
                      paddingTop: '16px',
                      margin: '0', 
                      color: formData?.footerTextColor, 
                      fontFamily: fontFamily,
                      opacity: 0.8
                    }}>
                      {formData?.footerText || "You are signing up to receive communication via email and can unsubscribe at any time."}
                    </small>
                  </div>
                ) : activeTab === 'successStatus' ? (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        direction: formData?.alignment === 'right' ? 'rtl' : 'ltr',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ 
                        width: '100%', 
                        display: 'flex',
                        flexDirection: formData?.alignment === 'left' && formData?.logo ? 'row' : 'column',
                        justifyContent: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                        alignItems: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : formData?.logo && formData?.alignment === 'left' ? 'center' : 'flex-start',
                        marginBottom: '24px',
                        gap: formData?.alignment === 'left' && formData?.logo ? '16px' : '0'
                      }}>
                        {formData?.logo && (
                          <div style={{ 
                            marginBottom: formData?.alignment === 'left' ? '0' : '24px',
                            display: 'flex',
                            justifyContent: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                            flexShrink: 0
                          }}>
                            <img
                              src={formData?.logo}
                              alt="Logo"
                              style={{
                                width: formData?.imageWidth || '80px',
                                height: formData?.imageWidth || '80px',
                                objectFit: 'cover',
                                borderRadius: getBorderRadius(formData?.cornerRadius),
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                          </div>
                        )}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          justifyContent: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                          alignItems: formData?.alignment === 'center' ? 'center' : formData?.alignment === 'right' ? 'flex-end' : 'flex-start',
                          ...(formData?.alignment === 'left' && formData?.logo ? { flex: 1 } : { width: '100%' }),
                          marginBottom: '0'
                        }}>
                          <h2 style={{
                            fontSize: fontSizes.heading, 
                            margin: '0 0 12px 0', 
                            fontWeight: 700, 
                            color: formData?.headingColor, 
                            fontFamily: fontFamily,
                            lineHeight: '1.3',
                            letterSpacing: '-0.02em',
                            textAlign: formData?.alignment
                          }}>
                            {formData?.sucessStatusHeading}
                          </h2>                 
                        </div>
                      </div>
                      <div style={{position: 'relative', marginBottom: '20px'}}>
                        <input
                          type="text"
                          value="discount_code"
                          readOnly
                          style={{
                            padding: '14px 40px 14px 16px',
                            width: '100%',
                            borderRadius: '8px',
                            border: `2px solid ${formData?.consentColor}`,
                            marginBottom: '0',
                            fontSize: fontSizes.button,
                            backgroundColor: formData?.inputColor,
                            color: formData?.textColor,
                            fontFamily: fontFamily,
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ 
                          cursor: 'pointer', 
                          position: 'absolute', 
                          right: '12px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          padding: '8px',
                          borderRadius: '6px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </div>
                      </div>

                      {(formData?.clickAction === 'closeForm' || formData?.clickAction === 'redirect') && (
                        <button
                          style={{
                            background: `linear-gradient(135deg, ${formData?.primaryButtonBackground} 0%, ${formData?.primaryButtonBackground}dd 100%)`,
                            color: formData?.primaryButtonTextColor,
                            padding: '14px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            width: '100%',
                            marginBottom: '12px',
                            fontSize: fontSizes.button,
                            fontWeight: 600,
                            fontFamily: fontFamily,
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            letterSpacing: '0.3px'
                          }}
                        >
                          {formData?.buttonText}
                        </button>
                      )}
                    </div>
                    <p style={{ 
                      margin: '0', 
                      color: formData?.descriptionColor, 
                      fontSize: fontSizes.body, 
                      fontFamily: fontFamily,
                      lineHeight: '1.6',
                      textAlign: formData?.alignment,
                      width: '100%'
                    }}>
                      {formData?.successDescription}
                    </p>
                  </div>
                ) : activeTab === 'stickyDiscountBar' ? (
                  <div style={{
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center', 
                    padding: '16px 20px',
                    textAlign: 'center',
                    width: '100%', 
                    backgroundColor: formData?.stickyDiscountBarBackground,
                    gap: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                  }}>
                    <div style={{
                      fontSize: fontSizes.body, 
                      fontWeight: 500,
                      color: formData?.stickyDiscountBarText,
                      fontFamily: fontFamily
                    }}>
                      Here you go
                    </div>
                    <div style={{position: 'relative', flex: 1, maxWidth: '280px'}}>
                      <input
                        type="text"
                        value="discount_code"
                        readOnly
                        style={{
                          padding: '12px 40px 12px 16px',
                          width: '100%',
                          borderRadius: '8px',
                          border: `2px solid ${formData?.consentColor}`,
                          fontSize: fontSizes.button,
                          backgroundColor: formData?.inputColor,
                          color: formData?.textColor,
                          fontFamily: fontFamily,
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ 
                        cursor: 'pointer', 
                        position: 'absolute',
                        right: '12px',
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        padding: '6px',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              
              {/* Close button */}
              {activeTab !== 'stickyDiscountBar' && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '50%',
                  padding: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  zIndex: 10
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PreviewPopup;