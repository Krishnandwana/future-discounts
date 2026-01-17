import React, { useEffect, useState, useCallback } from 'react';
import { Text, Card, Icon, InlineStack, BlockStack, Button } from '@shopify/polaris';
import { ArrowLeftIcon } from '@shopify/polaris-icons';
import { useLoaderData, useLocation, useNavigate } from '@remix-run/react';
import ContentPage from '../components/Contents/ContentPage';
import TabNavigation from '../components/TabNavigation';
import RulesPage from '../components/Rules/RulesPage';
import { Style } from '../components/Design/Style';
import { authenticate } from '../shopify.server';
import { validatePopupForm, formatError } from '../utils/validation';
import { Banner } from '@shopify/polaris';
import ValidationModal from '../components/ValidationModal';
import LoaderComponent from '../components/LoaderComponent';

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const accessToken = session.accessToken;
  const baseUrl = process.env.SHOPIFY_APP_URL;
  
  // Check if we're editing (has popup ID in URL or should load from sessionStorage)
  const url = new URL(request.url);
  const popupIdParam = url.searchParams.get('id');
  
  let popupData = null;
  let dataSource = null;
  let popupsFromMetafields = [];
  
  // Only load popup data if we're editing (have an ID), not creating new
  if (popupIdParam) {
    try {
      // First, try to get data from metafields (faster)
      const metafieldResponse = await admin.graphql(`
        query getMetafields {
          shop {
            metafields(namespace: "convertboost", first: 10) {
              edges {
                node {
                  key
                  value
                  type
                }
              }
            }
          }
        }
      `);
      
      const metafieldsData = await metafieldResponse.json();
      const metafields = metafieldsData.data?.shop?.metafields?.edges || [];
      
      // Find popups_data metafield (active popups array)
      const popupsDataMetafield = metafields.find(edge => edge.node.key === 'popups_data');
      
      if (popupsDataMetafield && popupsDataMetafield.node.value) {
        try {
          const rawValue = popupsDataMetafield.node.value;
          const parsedValue = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
          if (Array.isArray(parsedValue)) {
            popupsFromMetafields = parsedValue;
            // Find the specific popup by ID
            const targetPopup = parsedValue.find(p => p.id?.toString() === popupIdParam);
            if (targetPopup) {
              popupData = targetPopup;
              dataSource = 'metafields';
            }
          }
        } catch (parseError) {
        }
      }
    } catch (metafieldError) {
    }
  } else {
    // For creating new popup, still load the list but don't set popupData
    try {
      const metafieldResponse = await admin.graphql(`
        query getMetafields {
          shop {
            metafields(namespace: "convertboost", first: 10) {
              edges {
                node {
                  key
                  value
                  type
                }
              }
            }
          }
        }
      `);
      
      const metafieldsData = await metafieldResponse.json();
      const metafields = metafieldsData.data?.shop?.metafields?.edges || [];
      
      const popupsDataMetafield = metafields.find(edge => edge.node.key === 'popups_data');
      
      if (popupsDataMetafield && popupsDataMetafield.node.value) {
        try {
          const rawValue = popupsDataMetafield.node.value;
          const parsedValue = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
          if (Array.isArray(parsedValue)) {
            popupsFromMetafields = parsedValue;
          }
        } catch (parseError) {
        }
      }
    } catch (metafieldError) {
    }
  }
  
  return { 
    accessToken, 
    baseUrl, 
    popupData: popupData || null,
    popupsFromMetafields,
    dataSource: dataSource || 'database_fallback'
  };
}
let defaultData = {
  // Rules
  discountName: 'Sales Spot on Discount',
  couponCode: '',
  subheading: '',
  discountType: 'automatic', // Updated to include 'automatic', 'manual', or 'silent'
  valueType: 'percentage', // New: Type of discount value (percentage/fixed)
  discountValue: 10,
  expirationDate: false,
  discountLocation: 'exclude',
  selectedCountry: 'India',
  selectedCity: [],
  selectedCountries: [],
  selectedState: [],
  cityOptions: [],
  stateOptions: [],
  locationType: 'city',
  locationRules: 'certainCountries',
  stickyDiscountBar: 'yes',
  sidebarWidget: 'no',
  trigger: 'timer',
  scrollPercentage: '50',
  mobileDevices: 'all',
  time: '3',
  devices: ['all'],
  limitFrequency: true,
  popupFrequency: 3,
  popupPeriod: 'day',
  pageRules: 'everyPage',
  subPageRules: 'homepage',
  scheduleRules: 'showAllTime',
  everydaystartTime: '00:00',
  everydayendTime: '23:59',
  endDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endTime: '23:59',
  askForEmail: true,
  startImmediately: true,
  startDate: new Date().toISOString().split('T')[0],
  startTime: new Date().toTimeString().slice(0, 5),

  // New Variables
  minPurchaseValue: 0, // New: Minimum purchase amount required to apply the discount
  purchaseType: 'both', // New: Type of purchase (subscription, one-time, both)
  maxUsesType: 'total', // New: Determines whether max use is total or per customer
  maxTotalUses: 100, // New: Total allowed discount uses if `maxUsesType` is total
  combineWithProductDiscounts: false, // New: Whether to allow combining with product discounts
  combineWithOrderDiscounts: false, // New: Whether to allow combining with order discounts
  combineWithShippingDiscounts: false, // New: Whether to allow combining with shipping discounts

  // Content
  heading: 'Get any product for just 798!',
  description: 'Monsoon Sale ends soon',
  fields: [
    {
      label: 'Email',
      checked: true,
      type: 'email'
    }],
  primaryButton: true,
  primaryButtonText: 'Claim Discount Now',
  secondaryButton: true,
  secondaryButtonText: 'No Thanks',
  footerText: 'You are signing up to receive communication via email and can unsubscribe at any time.',
  sucessStatusHeading: 'Discount Unlocked 🎉',
  successDescription: 'Thanks for subscribing. Copy your discount code and apply to your next order.',
  redirectUrl: 'https://example.com',
  clickAction: 'closeForm',
  buttonText: 'Shop Now',
  stickyBarDescription: "Don't forget to use your discount code",
  sidebarButtonText: 'Get 25% OFF',

  // Display
  template: 'minimalist',
  logo: null,
  alignment: 'center',
  cornerRadius: 'standard',
  imagePosition: 'background',
  imageWidth: '20%',
  backgroundImage: null,
  backgroundOpacity: 100,
  backgroundColor: '#F4F6F8',
  textColor: '#202223',
  headingColor: '#202223',
  descriptionColor: '#6D7175',
  inputColor: '#FFFFFF',
  consentColor: '#202223',
  errorColor: '#D82C0D',
  footerTextColor: '#42474C',
  primaryButtonBackground: '#008060',
  primaryButtonTextColor: '#FFFFFF',
  secondaryButtonBackground: '#FFFFFF',
  secondaryButtonTextColor: '#008060',
  stickyDiscountBarBackground: '#F4F6F8',
  stickyDiscountBarText: '#202223',
  sidebarWidgetBackground: '#F4F6F8',
  sidebarWidgetTextColor: '#202223',
  intentMultiplier: 5,
  hesitationThreshold: 50,
  
  // Typography
  fontFamily: 'system',
  headingSize: 18,
  bodySize: 14,
  buttonSize: 12,
  footerSize: 11,
};
export default function DiscountPopupCreator() {
  const { accessToken, baseUrl, popupData, popupsFromMetafields = [], dataSource } = useLoaderData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rules');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [formData, setFormData] = useState(defaultData);
  const [selectedPopupID, setSelectedPopupID] = useState(null);
  const [wizardData, setWizardData] = useState(null);
  


  useEffect(() => {
    const storedId = sessionStorage.getItem('selectedPopupID');
    if (storedId) {
      try {
        setSelectedPopupID(JSON.parse(storedId));
      } catch (parseError) {
        setSelectedPopupID(storedId);
      }
    }
    
    // Check for wizard data
    const savedWizardData = sessionStorage.getItem('wizardData');
    if (savedWizardData) {
      const parsedData = JSON.parse(savedWizardData);
      setWizardData(parsedData);
      
      // Merge wizard data with default data
      setFormData(prevData => ({
        ...prevData,
        discountName: parsedData.headline || parsedData.discountName || prevData.discountName,
        heading: parsedData.headline || parsedData.heading || prevData.heading,
        description: parsedData.subheadline || parsedData.description || prevData.description,
        trigger: parsedData.trigger === 'timer' ? 'timer' : parsedData.trigger === 'scroll' ? 'scroll' : parsedData.trigger || prevData.trigger,
        time: (parsedData.trigger === 'timer' || parsedData.trigger === 'time_on_page') ? String(parsedData.triggerValue || parsedData.time || 3) : prevData.time,
        scrollPercentage: (parsedData.trigger === 'scroll' || parsedData.trigger === 'scroll_percentage') ? String(parsedData.scrollValue || parsedData.scrollPercentage || 50) : prevData.scrollPercentage,
        valueType: parsedData.discountType === 'free_shipping' ? 'percentage' : (parsedData.valueType || 'percentage'),
        discountValue: parsedData.discountType === 'free_shipping' ? 100 : (parsedData.discountValue || parsedData.discount || 10),
        discountType: parsedData.discountType || 'automatic',
        devices: Array.isArray(parsedData.devices) ? parsedData.devices : (parsedData.targetDevice === 'all' ? ['all'] : [parsedData.targetDevice || 'all']),
        mobileDevices: parsedData.targetDevice || parsedData.mobileDevices || 'all',
        // Location settings from wizard
        locationRules: parsedData.targetLocation === 'all' ? 'allCountries' : 'certainCountries',
        selectedCountries: parsedData.selectedCountries || [],
        selectedCity: parsedData.selectedCity || [],
        locationType: parsedData.locationType || 'country'
      }));
      
      // Clear wizard data from session
      sessionStorage.removeItem('wizardData');
    }
  }, [navigate]);
  
  // Handle metafield data loading
  useEffect(() => {
    if (dataSource !== 'metafields') {
      return;
    }

    const normalizedSelectedId = selectedPopupID ? selectedPopupID.toString().replace(/"/g, '') : null;
    
    // Don't auto-load popup data when creating new (no selectedPopupID)
    if (!normalizedSelectedId) {
      return;
    }

    let sourcePopup = popupData || null;

    if (normalizedSelectedId && popupsFromMetafields.length > 0) {
      const matchedPopup = popupsFromMetafields.find(p => p.id?.toString() === normalizedSelectedId);
      if (matchedPopup) {
        sourcePopup = matchedPopup;
      }
    }

    if (sourcePopup) {
      setFormData(prevData => ({
        ...prevData,
        ...sourcePopup
      }));

      const sourceId = sourcePopup.id?.toString();
      if (sourceId && sourceId !== normalizedSelectedId) {
        setSelectedPopupID(sourceId);
        sessionStorage.setItem('selectedPopupID', sourceId);
      }
    }
  }, [popupData, popupsFromMetafields, dataSource, selectedPopupID]);
  
  useEffect(() => {
    if (selectedPopupID && dataSource !== 'metafields') {
      setIsLoadingDetails(true);
      fetchDetails();
    } else if (selectedPopupID && dataSource === 'metafields') {
    }
  }, [selectedPopupID, accessToken, baseUrl, dataSource]);
  
  const fetchDetails = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/get_popup?id=${selectedPopupID?.replace(/"/g, '')}`, {
        method: 'GET',
        headers: {
          sessionToken: accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
  
      const data = await response.json();
      setFormData(data);
      
      // TODO: Consider syncing this data back to metafields for faster future loads
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingDetails(false);
      setLoading(false);
      setSaveLoading(false);
    }
  };
  
  const tabs = [
    { id: 'rules', content: 'Rules' },
    { id: 'content', content: 'Content' },
    { id: 'design', content: 'Design' },
  ];
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [backLoading, setBackLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [validationModal, setValidationModal] = useState({
    open: false,
    errors: [],
    warnings: [],
    action: 'save',
    hasOnlyWarnings: false,
    pendingAction: null
  });

  const handleAction = async (action, skipValidation = false) => {
    try {
      // Skip validation if explicitly told to (when user confirms warnings)
      if (!skipValidation) {
        // Validate form before submitting
        const errors = validatePopupForm(formData);
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          
          let criticalErrors = [];
          let warnings = [];
          
          // Categorize errors
          Object.entries(errors).forEach(([field, message]) => {
            if (message.includes('will never show') || message.includes('in the past')) {
              warnings.push(message);
            } else {
              criticalErrors.push(message);
            }
          });
          
          // Show modal with errors and warnings - always allow proceeding
          setValidationModal({
            open: true,
            errors: criticalErrors,
            warnings: warnings,
            action: action,
            hasOnlyWarnings: criticalErrors.length === 0 && warnings.length > 0,
            pendingAction: action
          });
          
          return; // Stop here, let modal handle the continuation
        }
      }
      
      setLoading(action === 'publish');
      setSaveLoading(action !== 'publish');
      setError(null);
      setValidationErrors({});
      setSuccess(false);
  
      const endpoint = selectedPopupID
        ? `${baseUrl}/api/patch_popup`
        : `${baseUrl}/api/post_popup`;
        
      const response = await fetch(endpoint, {
        method: selectedPopupID ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action === 'publish' ? { ...formData, status: true } : formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      if (response.status !== 204) {
        await response.json().catch(() => ({}));
      }

      if (action === 'publish') {
        navigate('/app');
      }
  
      setSuccess(true);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
      setSaveLoading(false);
  
      // Explicitly handle localStorage cleanup
      try {
        const popupShownTime = localStorage.getItem('popupShownTime');
        localStorage.removeItem('popupShown');
        localStorage.removeItem('popupShownTime');
      } catch (localStorageError) {
        console.error('Error clearing localStorage:', localStorageError);
      }
    }
  };
  
  const handlePublish = () => handleAction('publish');
  const handleSave = () => handleAction('save');
  
  const handleBackNavigation = useCallback(() => {
    if (backLoading) {
      return;
    }
    setBackLoading(true);
    navigate('/app');
  }, [backLoading, navigate]);
  
  const handleValidationModalClose = () => {
    setValidationModal({
      open: false,
      errors: [],
      warnings: [],
      action: 'save',
      hasOnlyWarnings: false,
      pendingAction: null
    });
  };
  
  const handleValidationModalConfirm = () => {
    // User confirmed to proceed despite issues
    const action = validationModal.pendingAction;
    handleValidationModalClose();
    setValidationErrors({});
    // Continue with the action, skipping validation
    handleAction(action, true);
  };
  
  const syncMetafields = async () => {
    if (!selectedPopupID) return;
    
    setSyncLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/sync-metafields`, {
        method: 'POST',
        headers: {
          sessionToken: accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ popupId: selectedPopupID.replace(/"/g, '') })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setError(null);
        
        // Refresh the page to load from metafields
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(`Sync failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Sync error: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };  

  return (
    <>
      {/* Validation Modal */}
      <ValidationModal
        open={validationModal.open}
        onClose={handleValidationModalClose}
        onConfirm={handleValidationModalConfirm}
        errors={validationModal.errors}
        warnings={validationModal.warnings}
        action={validationModal.action}
        hasOnlyWarnings={validationModal.hasOnlyWarnings}
      />
      
      {isLoadingDetails ? (
        <LoaderComponent />
      ) : (
        <>
          {/* Data source banner removed from production UI */}
          {process.env.NODE_ENV === 'development' && dataSource === 'database' && selectedPopupID && (
            <div style={{ paddingInline: '1.5rem', paddingBottom: '1rem' }}>
              <Banner
                title="Development Mode: Database Fallback Detected"
                status="critical"
              >
                Configuration loaded from database. Consider syncing to metafields for better performance.
                <Button 
                  size="micro" 
                  onClick={syncMetafields}
                  loading={syncLoading}
                  style={{ marginLeft: '10px' }}
                >
                  Sync to Metafields
                </Button>
              </Banner>
            </div>
          )}
          
          <div style={{ paddingInline: '1.5rem' }}>
            <Card roundedAbove="0" padding="300">
              <InlineStack align='space-between' blockAlign="center">
                <BlockStack inlineAlign="start">
                  <InlineStack blockAlign="center" gap="400">
                    <div style={{ cursor: 'pointer' }}>
                      <Button
                        onClick={handleBackNavigation}
                        icon={ArrowLeftIcon}
                        variant='plain'
                        size="large"
                        loading={backLoading}
                        disabled={backLoading}
                      />
                    </div>
                    <div style={{
                      borderLeft: '3px solid #008060',
                      paddingLeft: '16px',
                      paddingBlock: '8px'
                    }}>
                      <BlockStack gap="100">
                        <Text variant="headingLg" as="h1" style={{ 
                          color: '#202223',
                          fontWeight: '600',
                          fontSize: '24px',
                          lineHeight: '1.2'
                        }}>
                          {formData?.discountName ? formData.discountName : 'Geo Deals Campaign'}
                        </Text>
                        {formData?.subheading && (
                          <Text variant="bodyMd" style={{ 
                            color: '#6D7175',
                            fontSize: '14px',
                            fontWeight: '400'
                          }}>
                            {formData.subheading}
                          </Text>
                        )}
                        {!formData?.subheading && (
                          <Text variant="bodySm" style={{ 
                            color: '#8C9196',
                            fontStyle: 'italic',
                            fontSize: '13px'
                          }}>
                            Add a description in the Content tab
                          </Text>
                        )}
                      </BlockStack>
                    </div>
                  </InlineStack>
                </BlockStack>
                <InlineStack gap='300' align="center">
                  {selectedPopupID && (
                    <Button 
                      onClick={handleSave} 
                      loading={saveLoading}
                      size="large"
                      variant="secondary"
                    >
                      Save Draft
                    </Button>
                  )}
                  <Button 
                    variant="primary" 
                    onClick={handlePublish} 
                    loading={loading}
                    size="large"
                    tone="success"
                  >
                    {loading ? 'Publishing...' : 'Publish Campaign'}
                  </Button>
                </InlineStack>
              </InlineStack>
            </Card>
          </div>
          
          {/* Error Banner */}
          {error && (
            <div style={{ paddingInline: '1.5rem', marginTop: '1rem' }}>
              <Banner
                title="Error"
                status="critical"
                onDismiss={() => setError(null)}
              >
                <p>{error}</p>
              </Banner>
            </div>
          )}
          
          
          {activeTab === 'rules' && (
            <RulesPage
              tabs={tabs}
              handleTabClick={handleTabClick}
              activeTab={activeTab}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {activeTab === 'content' && (
            <div>
              <ContentPage
                tabs={tabs}
                handleTabClick={handleTabClick}
                activeTab={activeTab}
                formData={formData}
                setFormData={setFormData}
              />
            </div>
          )}
          {activeTab === 'design' && (
            <Style
              tabs={tabs}
              handleTabClick={handleTabClick}
              activeTab={activeTab}
              formData={formData}
              setFormData={setFormData}
              handlePublish={handlePublish}
            />
          )}
        </>
      )}
    </>
  );
}
