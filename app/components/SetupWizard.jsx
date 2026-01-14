import { useState, useCallback, useEffect } from "react";
import { Card, Button, Text, BlockStack, InlineStack, ProgressBar, TextField, RadioButton, Icon, Banner, Box, Collapsible, Autocomplete, Tag, Spinner, Select } from "@shopify/polaris";
import { TargetIcon, GlobeIcon, ChevronDownIcon, ChevronUpIcon, AlertCircleIcon } from "@shopify/polaris-icons";
import countriesData from '../routes/_index/countries.json';
import popupTemplates from '../data/popupTemplates.json';
import PreviewPopup from './PreviewPopup';

// Core wizard steps
const CORE_STEPS = [
  { id: "setup", label: "Setup", description: "Configure campaign" },
  { id: "template", label: "Template", description: "Choose style" },
  { id: "content", label: "Content", description: "Add copy" },
  { id: "review", label: "Review", description: "Launch" }
];

const TARGET_STRATEGIES = [
  {
    id: "geolocation",
    title: "Target Customers based on geolocation",
    description: "Show personalized offers to visitors from specific locations",
    icon: GlobeIcon,
    color: "#5c6ac4",
    benefits: [],
    defaultSettings: {
      trigger: "timer",
      triggerValue: 3,
      scrollValue: 50,
      discount: 15,
      headline: "Exclusive offer for your region!",
      subheadline: "Special 15% discount for local customers"
    }
  }
];

export default function SetupWizard({ onComplete, appEmbedEnabled, shopName, extensionId, existingData = {} }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [isBackLoading, setIsBackLoading] = useState(false);
  const [cityInputValue, setCityInputValue] = useState('');
  const [countryInputValue, setCountryInputValue] = useState('');
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  // Dynamically determine the steps based on appEmbedEnabled status
  const steps = [...CORE_STEPS];
  if (appEmbedEnabled === false) {
    // Insert activation before the final review step
    const reviewIndex = steps.findIndex(s => s.id === "review");
    if (reviewIndex !== -1) {
      steps.splice(reviewIndex, 0, { id: "activation", label: "Activate", description: "Enable app embed" });
    } else {
      steps.push({ id: "activation", label: "Activate", description: "Enable app embed" });
    }
  }

  const [wizardData, setWizardData] = useState({
    strategy: "geolocation",
    template: "minimalist",
    trigger: "timer",
    triggerValue: 3,
    scrollValue: 50,
    discount: 10,
    headline: "",
    subheadline: "",
    targetLocation: "all",
    selectedCountry: '',
    selectedCountries: [],
    selectedCity: [],
    cityOptions: [],
    locationType: 'country',
    ...existingData
  });

  const countryOptions = countriesData.map((country) => ({
    label: country.name,
    value: country.name
  }));

  useEffect(() => {
    if (wizardData.locationType === 'city' && wizardData.selectedCountry) {
      setIsLoadingCities(true);
      fetch(`https://convert-boost-backend.vercel.app/api/get_cities_by_country?country=${encodeURIComponent(wizardData.selectedCountry)}`)
        .then(response => response.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            const options = data.data
              .filter(city => city)
              .map(city => ({
                label: city,
                value: city
              }));
            setWizardData(prev => ({ ...prev, cityOptions: options }));
          } else {
            setWizardData(prev => ({ ...prev, cityOptions: [] }));
          }
        })
        .catch(error => {
          console.error('Error fetching cities:', error);
          setWizardData(prev => ({ ...prev, cityOptions: [] }));
        })
        .finally(() => {
          setIsLoadingCities(false);
        });
    }
  }, [wizardData.selectedCountry, wizardData.locationType]);

  const handleCountrySelection = useCallback((selected) => {
    const newCountry = selected[selected.length - 1];
    if (newCountry && !wizardData.selectedCountries?.includes(newCountry)) {
      setWizardData(prev => ({
        ...prev,
        selectedCountries: [...(prev.selectedCountries || []), newCountry]
      }));
    }
    setCountryInputValue('');
  }, [wizardData.selectedCountries]);

  const handleCitySelection = useCallback((selected) => {
    const newCity = selected[selected.length - 1];
    if (newCity && !wizardData.selectedCity?.includes(newCity)) {
      setWizardData(prev => ({
        ...prev,
        selectedCity: [...(prev.selectedCity || []), newCity]
      }));
    }
    setCityInputValue('');
  }, [wizardData.selectedCity]);

  const removeCountry = useCallback((country) => {
    setWizardData(prev => ({
      ...prev,
      selectedCountries: (prev.selectedCountries || []).filter(selected => selected !== country)
    }));
  }, []);

  const removeCity = useCallback((city) => {
    setWizardData(prev => ({
      ...prev,
      selectedCity: (prev.selectedCity || []).filter(selected => selected !== city)
    }));
  }, []);

  const filterAndSortItems = useCallback((inputValue, options) => {
    const lowercasedInput = inputValue.toLowerCase();
    const filteredOptions = (options || []).filter((option) =>
      option.label.toLowerCase().includes(lowercasedInput)
    );

    filteredOptions.sort((a, b) => {
      if (a.label.toLowerCase() === lowercasedInput) return -1;
      if (b.label.toLowerCase() === lowercasedInput) return 1;
      return a.label.localeCompare(b.label);
    });

    if (
      inputValue &&
      !filteredOptions.some((option) => option.label.toLowerCase() === lowercasedInput)
    ) {
      filteredOptions.unshift({ label: inputValue, value: inputValue });
    }

    return filteredOptions;
  }, []);

  const getPreviewData = () => {
    const strategy = TARGET_STRATEGIES.find(s => s.id === wizardData.strategy);
    const selectedTemplate = wizardData.template ? popupTemplates[wizardData.template] : null;
    const templateData = selectedTemplate?.data || {};

    return {
      heading: wizardData.headline || templateData.heading || strategy?.defaultSettings?.headline || 'Your Discount Awaits!',
      description: wizardData.subheadline || templateData.description || strategy?.defaultSettings?.subheadline || 'Complete your purchase and save',
      fields: templateData.fields || [{ label: 'Email', checked: true, type: 'email' }],
      primaryButton: true,
      primaryButtonText: templateData.primaryButtonText || 'Claim Discount Now',
      secondaryButton: true,
      secondaryButtonText: templateData.secondaryButtonText || 'No Thanks',
      footerText: templateData.footerText || 'You are signing up to receive communication via email and can unsubscribe at any time.',
      sucessStatusHeading: templateData.sucessStatusHeading || 'Discount Unlocked 🎉',
      successDescription: templateData.successDescription || 'Thanks for subscribing. Copy your discount code and apply to your next order.',
      buttonText: templateData.buttonText || 'Shop Now',
      backgroundColor: templateData.backgroundColor || '#F4F6F8',
      textColor: templateData.textColor || '#202223',
      headingColor: templateData.headingColor || '#202223',
      descriptionColor: templateData.descriptionColor || '#6D7175',
      primaryButtonBackground: templateData.primaryButtonBackground || '#008060',
      primaryButtonTextColor: templateData.primaryButtonTextColor || '#FFFFFF',
      secondaryButtonBackground: templateData.secondaryButtonBackground || '#FFFFFF',
      secondaryButtonTextColor: templateData.secondaryButtonTextColor || '#6D7175',
      footerTextColor: templateData.footerTextColor || '#6D7175',
      inputColor: templateData.inputColor || '#FFFFFF',
      consentColor: templateData.consentColor || '#C9CCCF',
      errorColor: templateData.errorColor || '#D82C0D',
      alignment: templateData.alignment || 'center',
      cornerRadius: templateData.cornerRadius || 'standard',
      template: wizardData.template || 'minimalist',
      imagePosition: templateData.imagePosition || 'background',
      stickyDiscountBarBackground: templateData.stickyDiscountBarBackground || templateData.backgroundColor || '#F4F6F8',
      stickyDiscountBarText: templateData.stickyDiscountBarText || templateData.textColor || '#202223',
      fontFamily: templateData.fontFamily || 'system',
      headingSize: templateData.headingSize || 18,
      bodySize: templateData.bodySize || 14,
      buttonSize: templateData.buttonSize || 12,
      footerSize: templateData.footerSize || 11,
      backgroundOpacity: templateData.backgroundOpacity || 100
    };
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0 || isCreating || isBackLoading) {
      return;
    }
    setIsBackLoading(true);
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setTimeout(() => setIsBackLoading(false), 250);
  };

  const handleComplete = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const selectedTemplate = popupTemplates[wizardData.template || 'minimalist'];
      const templateData = selectedTemplate?.data || {};

      const campaignData = {
        ...wizardData,
        discountName: wizardData.headline || 'Geo Deals Campaign',
        couponCode: '',
        subheading: wizardData.subheadline || '',
        discountType: 'automatic',
        valueType: 'percentage',
        discountValue: wizardData.discount || 10,
        devices: ['all'],
        mobileDevices: 'all',
        discountLocation: wizardData.targetLocation === 'all' ? 'exclude' : 'include',
        locationRules: wizardData.targetLocation === 'all' ? 'allCountries' : 'certainCountries',
        selectedCountries: wizardData.selectedCountries || [],
        selectedCity: wizardData.selectedCity || [],
        selectedCountry: wizardData.selectedCountry || 'India',
        locationType: wizardData.locationType || 'country',
        cityOptions: wizardData.cityOptions || [],
        trigger: wizardData.trigger === 'timer' ? 'timer' : wizardData.trigger === 'scroll' ? 'scroll' : 'intent',
        time: String(wizardData.triggerValue || 3),
        scrollPercentage: String(wizardData.scrollValue || 50),
        heading: wizardData.headline || 'Special Offer Just for You!',
        description: wizardData.subheadline || 'Get your discount now',
        fields: templateData.fields || [{ label: 'Email', checked: true, type: 'email' }],
        askForEmail: templateData.askForEmail ?? true,
        primaryButton: true,
        primaryButtonText: templateData.primaryButtonText || 'Claim Discount Now',
        secondaryButton: true,
        secondaryButtonText: templateData.secondaryButtonText || 'No Thanks',
        footerText: templateData.footerText || 'You are signing up to receive communication via email and can unsubscribe at any time.',
        sucessStatusHeading: templateData.sucessStatusHeading || 'Discount Unlocked 🎉',
        successDescription: templateData.successDescription || 'Thanks for subscribing. Copy your discount code and apply to your next order.',
        clickAction: 'closeForm',
        buttonText: templateData.buttonText || 'Shop Now',
        scheduleRules: 'showAllTime',
        pageRules: 'everyPage',
        stickyDiscountBar: 'yes',
        sidebarWidget: 'no',
        template: wizardData.template || 'minimalist',
        alignment: templateData.alignment || 'center',
        cornerRadius: templateData.cornerRadius || 'standard',
        stickyBarDescription: templateData.stickyBarDescription || "Don't forget to use your discount code",
        sidebarButtonText: templateData.sidebarButtonText || 'Get 25% OFF',
        expirationDate: false,
        selectedState: [],
        stateOptions: [],
        limitFrequency: true,
        popupFrequency: 3,
        popupPeriod: 'day',
        subPageRules: 'homepage',
        everydaystartTime: '00:00',
        everydayendTime: '23:59',
        startImmediately: true,
        startDate: new Date().toISOString().split('T')[0],
        startTime: new Date().toTimeString().slice(0, 5),
        endDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endTime: '23:59',
        minPurchaseValue: 0,
        purchaseType: 'both',
        maxUsesType: 'total',
        maxTotalUses: 100,
        combineWithProductDiscounts: false,
        combineWithOrderDiscounts: false,
        combineWithShippingDiscounts: false,
        logo: templateData.logo ?? null,
        imagePosition: templateData.imagePosition || 'background',
        imageWidth: templateData.imageWidth ? String(templateData.imageWidth) : '20%',
        backgroundImage: templateData.backgroundImage || null,
        backgroundOpacity: templateData.backgroundOpacity ?? 100,
        backgroundColor: templateData.backgroundColor || '#F4F6F8',
        textColor: templateData.textColor || '#202223',
        headingColor: templateData.headingColor || '#202223',
        descriptionColor: templateData.descriptionColor || '#6D7175',
        inputColor: templateData.inputColor || '#FFFFFF',
        consentColor: templateData.consentColor || '#202223',
        errorColor: templateData.errorColor || '#D82C0D',
        footerTextColor: templateData.footerTextColor || '#42474C',
        primaryButtonBackground: templateData.primaryButtonBackground || '#008060',
        primaryButtonTextColor: templateData.primaryButtonTextColor || '#FFFFFF',
        secondaryButtonBackground: templateData.secondaryButtonBackground || '#FFFFFF',
        secondaryButtonTextColor: templateData.secondaryButtonTextColor || '#008060',
        stickyDiscountBarBackground: templateData.stickyDiscountBarBackground || templateData.backgroundColor || '#F4F6F8',
        stickyDiscountBarText: templateData.stickyDiscountBarText || templateData.textColor || '#202223',
        sidebarWidgetBackground: templateData.sidebarWidgetBackground || '#F4F6F8',
        sidebarWidgetTextColor: templateData.sidebarWidgetTextColor || '#202223',
        redirectUrl: templateData.redirectUrl || '',
        fontFamily: templateData.fontFamily || 'system',
        headingSize: templateData.headingSize || 18,
        bodySize: templateData.bodySize || 14,
        buttonSize: templateData.buttonSize || 12,
        footerSize: templateData.footerSize || 11
      };

      await onComplete(campaignData);
    } catch (err) {
      setError(err.message || 'Failed to create campaign');
      setIsCreating(false);
    }
  };

  const getAppEmbedActivationUrl = () => {
    // Dynamically use the extension ID from props
    const handle = `${extensionId}/GeoDeals`;
    return `https://${shopName}/admin/themes/current/editor?context=apps&appEmbed=${handle}&target=newAppsSection`;
  };

  const verifyAppEmbed = async () => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const response = await fetch('/api/check-app-embed');
      const data = await response.json();

      if (data.success && data.enabled) {
        handleNext();
      } else {
        setVerificationError("We still can't detect the app embed. Please make sure you've toggled it ON and clicked SAVE in the Shopify editor.");
      }
    } catch (err) {
      setVerificationError("Something went wrong while checking. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const renderActivation = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <BlockStack gap="600">
        <Banner status="warning" title="Almost there! One final step required">
          To show the popup to your customers, you need to enable the "App Embed" in your theme settings.
        </Banner>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '32px', alignItems: 'start' }}>
          <BlockStack gap="400">
            <Text variant="headingLg">Enable App Embed</Text>
            <Text variant="bodyMd">
              Shopify requires you to manually toggle the app extension to ensure your store remains fast and secure.
            </Text>
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="300">
                <Text variant="bodyMd" fontWeight="bold">Instructions:</Text>
                <Text variant="bodyMd">1. Click the button below to open the Theme Editor.</Text>
                <Text variant="bodyMd">2. Ensure "Geo-Deals" is toggled <b>ON</b>.</Text>
                <Text variant="bodyMd">3. Click <b>Save</b> at the top right of the Shopify editor.</Text>
              </BlockStack>
            </Box>
            <Button
              primary
              size="large"
              onClick={() => window.open(getAppEmbedActivationUrl(), '_blank')}
            >
              Open Theme Editor to Enable
            </Button>
          </BlockStack>

          <div style={{
            background: '#f1f3f4',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}>
            {/* Mockup of the Shopify Sidebar toggle */}
            <div style={{ background: 'white', borderRadius: '4px', padding: '12px', textAlign: 'left', border: '1px solid #ccc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text variant="bodySm" fontWeight="bold">App embeds</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#e0f1ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '16px', height: '16px', background: '#008060', borderRadius: '40%' }} />
                  <Text variant="bodySm">Geo-Deals</Text>
                </div>
                <div style={{ width: '32px', height: '16px', background: '#008060', borderRadius: '10px', position: 'relative' }}>
                  <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
                </div>
              </div>
            </div>
            <Box paddingBlockStart="400">
              <Text variant="bodySm" color="subdued">Make sure it looks like this and click Save!</Text>
            </Box>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '24px' }}>
          {verificationError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <Icon source={AlertCircleIcon} color="critical" />
              <Text variant="bodyMd" color="critical" fontWeight="medium">
                {verificationError}
              </Text>
            </div>
          )}
        </div>
      </BlockStack>
    </div>
  );

  const renderStepContent = () => {
    const currentStepId = steps[currentStep].id;
    if (currentStepId === "activation") return renderActivation();

    const hasPreview = currentStep >= 1; // Show preview for template, content, review steps

    const content = () => {
      switch (currentStepId) {
        case "setup":
          // All-in-one setup page: Targeting + Trigger + Discount
          return (
            <div style={{ height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
              <BlockStack gap="500">
                <Text variant="headingLg" fontWeight="semibold">Campaign Setup</Text>

                {/* Targeting Section */}
                <div style={{ background: '#fafbfc', borderRadius: '8px', padding: '16px', border: '1px solid #e1e3e5' }}>
                  <BlockStack gap="400">
                    <Text variant="headingMd" fontWeight="medium">1. Audience Targeting</Text>
                    <BlockStack gap="300">
                      <RadioButton
                        label="All visitors worldwide"
                        checked={wizardData.targetLocation === "all"}
                        onChange={() => setWizardData({ ...wizardData, targetLocation: "all" })}
                      />
                      <RadioButton
                        label="Specific countries"
                        checked={wizardData.targetLocation === "countries"}
                        onChange={() => setWizardData({ ...wizardData, targetLocation: "countries", locationType: 'country' })}
                      />
                      <RadioButton
                        label="Specific cities"
                        checked={wizardData.targetLocation === "city"}
                        onChange={() => setWizardData({ ...wizardData, targetLocation: "city", locationType: 'city' })}
                      />
                    </BlockStack>

                    {wizardData.targetLocation === "countries" && (
                      <BlockStack gap="200">
                        <Autocomplete
                          allowMultiple
                          options={filterAndSortItems(countryInputValue, countryOptions)}
                          selected={wizardData.selectedCountries || []}
                          onSelect={handleCountrySelection}
                          textField={
                            <Autocomplete.TextField
                              onChange={(value) => setCountryInputValue(value)}
                              label="Select Countries"
                              value={countryInputValue}
                              placeholder="Type to search..."
                            />
                          }
                        />
                        {wizardData.selectedCountries?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {wizardData.selectedCountries.map((country) => (
                              <Tag key={country} onRemove={() => removeCountry(country)}>{country}</Tag>
                            ))}
                          </div>
                        )}
                      </BlockStack>
                    )}

                    {wizardData.targetLocation === "city" && (
                      <BlockStack gap="200">
                        <Select
                          label="Country"
                          options={[{ label: 'Choose a country', value: '' }, ...countryOptions]}
                          value={wizardData.selectedCountry || ''}
                          onChange={(value) => setWizardData({ ...wizardData, selectedCountry: value, selectedCity: [] })}
                        />
                        {wizardData.selectedCountry && (
                          <>
                            {isLoadingCities ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                                <Spinner size="small" />
                              </div>
                            ) : (
                              <Autocomplete
                                allowMultiple
                                options={filterAndSortItems(cityInputValue, wizardData.cityOptions || [])}
                                selected={wizardData.selectedCity || []}
                                onSelect={handleCitySelection}
                                textField={
                                  <Autocomplete.TextField
                                    onChange={(value) => setCityInputValue(value)}
                                    label="Cities"
                                    value={cityInputValue}
                                    placeholder="Type to search..."
                                  />
                                }
                              />
                            )}
                            {wizardData.selectedCity?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {wizardData.selectedCity.map((city) => (
                                  <Tag key={city} onRemove={() => removeCity(city)}>{city}</Tag>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </BlockStack>
                    )}
                  </BlockStack>
                </div>

                {/* Trigger Section */}
                <div style={{ background: '#fafbfc', borderRadius: '8px', padding: '16px', border: '1px solid #e1e3e5' }}>
                  <BlockStack gap="400">
                    <Text variant="headingMd" fontWeight="medium">2. Popup Trigger</Text>
                    <BlockStack gap="300">
                      <RadioButton
                        label="Timer based"
                        checked={wizardData.trigger === "timer"}
                        onChange={() => setWizardData({ ...wizardData, trigger: "timer" })}
                      />
                      {wizardData.trigger === "timer" && (
                        <Box paddingInlineStart="800">
                          <TextField
                            label="Delay (seconds)"
                            type="number"
                            value={String(wizardData.triggerValue || 3)}
                            onChange={(value) => setWizardData({ ...wizardData, triggerValue: parseInt(value) || 3 })}
                            suffix="seconds"
                            min="1"
                            max="60"
                          />
                        </Box>
                      )}

                      <RadioButton
                        label="Scroll based"
                        checked={wizardData.trigger === "scroll"}
                        onChange={() => setWizardData({ ...wizardData, trigger: "scroll" })}
                      />
                      {wizardData.trigger === "scroll" && (
                        <Box paddingInlineStart="800">
                          <TextField
                            label="Scroll depth"
                            type="number"
                            value={String(wizardData.scrollValue || 50)}
                            onChange={(value) => setWizardData({ ...wizardData, scrollValue: parseInt(value) || 50 })}
                            suffix="%"
                            min="10"
                            max="90"
                          />
                        </Box>
                      )}
                    </BlockStack>
                  </BlockStack>
                </div>

                {/* Discount Section */}
                <div style={{ background: '#fafbfc', borderRadius: '8px', padding: '16px', border: '1px solid #e1e3e5' }}>
                  <BlockStack gap="400">
                    <Text variant="headingMd" fontWeight="medium">3. Discount Percentage</Text>
                    <TextField
                      label="Discount"
                      type="number"
                      value={String(wizardData.discount)}
                      onChange={(value) => setWizardData({ ...wizardData, discount: parseInt(value) || 10 })}
                      suffix="%"
                      helpText="Recommended: 10-15%"
                      min="5"
                      max="75"
                      autoComplete="off"
                    />
                    <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '8px' }}>
                      <Text variant="heading2xl" fontWeight="bold" style={{ color: '#059669' }}>
                        {wizardData.discount}% OFF
                      </Text>
                    </div>
                  </BlockStack>
                </div>
              </BlockStack>
            </div>
          );

        case "template":
          return (
            <BlockStack gap="400">
              <Text variant="headingLg" fontWeight="semibold">Choose Template</Text>
              <Select
                label="Template"
                options={Object.entries(popupTemplates).map(([key, template]) => ({
                  label: template.name,
                  value: key
                }))}
                value={wizardData.template || 'minimalist'}
                onChange={(value) => {
                  const templateData = popupTemplates[value]?.data || {};
                  setWizardData(prev => ({
                    ...prev,
                    template: value,
                    ...(value !== 'minimalist' ? {
                      headline: templateData.heading || prev.headline,
                      subheadline: templateData.description || prev.subheadline,
                      discount: templateData.discountValue || prev.discount,
                    } : {})
                  }));
                }}
              />
            </BlockStack>
          );

        case "content":
          return (
            <BlockStack gap="400">
              <Text variant="headingLg" fontWeight="semibold">Content</Text>
              <TextField
                label="Headline"
                value={wizardData.headline}
                onChange={(value) => setWizardData({ ...wizardData, headline: value })}
                placeholder="Exclusive offer for your region!"
                maxLength={60}
                showCharacterCount
                autoComplete="off"
              />
              <TextField
                label="Subheadline"
                value={wizardData.subheadline}
                onChange={(value) => setWizardData({ ...wizardData, subheadline: value })}
                placeholder="Special discount for local customers"
                maxLength={100}
                showCharacterCount
                autoComplete="off"
              />
            </BlockStack>
          );

        case "review":
          return (
            <BlockStack gap="400">
              <Text variant="headingLg" fontWeight="semibold">Review & Launch</Text>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb' }}>
                <BlockStack gap="300">
                  <div>
                    <Text variant="bodyXs" color="subdued">Targeting</Text>
                    <Text variant="bodyMd" fontWeight="semibold">
                      {wizardData.targetLocation === 'all' && 'All locations worldwide'}
                      {wizardData.targetLocation === 'countries' && `${(wizardData.selectedCountries || []).length} countries`}
                      {wizardData.targetLocation === 'city' && `${(wizardData.selectedCity || []).length} cities`}
                    </Text>
                  </div>
                  <div>
                    <Text variant="bodyXs" color="subdued">Trigger</Text>
                    <Text variant="bodyMd" fontWeight="semibold">
                      {wizardData.trigger === 'timer' ? `After ${wizardData.triggerValue}s` : `At ${wizardData.scrollValue}% scroll`}
                    </Text>
                  </div>
                  <div>
                    <Text variant="bodyXs" color="subdued">Discount</Text>
                    <Text variant="bodyMd" fontWeight="semibold" style={{ color: '#059669' }}>
                      {wizardData.discount}% OFF
                    </Text>
                  </div>
                </BlockStack>
              </div>
            </BlockStack>
          );

        default:
          return null;
      }
    };

    if (!hasPreview) {
      return content();
    }

    // Two-column layout with preview
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', height: '100%', overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', paddingRight: '8px', height: '100%' }}>
          {content()}
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', paddingRight: '8px', height: '100%', overflow: 'hidden' }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid #e5e7eb',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Text variant="headingMd" fontWeight="semibold" style={{ marginBottom: '8px', flexShrink: 0 }}>Preview</Text>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              overflow: 'hidden',
              minHeight: 0,
              paddingTop: '8px'
            }}>
              <div style={{
                transform: 'scale(0.9)',
                transformOrigin: 'top center',
                width: '100%',
                height: 'fit-content'
              }}>
                <PreviewPopup formData={getPreviewData()} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Replace entire return or just the outer divs? I'll re-implement with new screens
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        maxWidth: currentStep === 0 ? '720px' : '1200px',
        margin: '0 auto',
        padding: '8px 24px 8px',
        transition: 'max-width 0.3s ease',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '12px 20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid #f1f3f4',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexShrink: 0,
          marginBottom: '8px'
        }}>
          <Text variant="bodyMd" fontWeight="medium" style={{ whiteSpace: 'nowrap' }}>
            Step {currentStep + 1}/{steps.length}
          </Text>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '3px', height: '8px' }}>
            <div style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
              borderRadius: '6px',
              transition: 'width 0.4s ease-out'
            }} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {steps.map((step, index) => (
              <div key={step.id} style={{
                width: "24px", height: "24px", borderRadius: "50%",
                backgroundColor: index <= currentStep ? "#059669" : "#e5e7eb",
                color: index <= currentStep ? "white" : "#6b7280",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "600", transition: 'all 0.3s ease'
              }}>
                {index < currentStep ? "✓" : index + 1}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ flexShrink: 0, marginBottom: '8px' }}>
            <Banner status="critical" onDismiss={() => setError(null)}>{error}</Banner>
          </div>
        )}

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #f1f3f4',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '8px',
          minHeight: 0
        }}>
          {renderStepContent()}
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #f1f3f4',
          flexShrink: 0,
          marginBottom: '8px'
        }}>
          <InlineStack justify="space-between" gap="300">
            <Button onClick={handleBack} disabled={currentStep === 0 || isCreating || isBackLoading} loading={isBackLoading} size="large">← Back</Button>
            <InlineStack gap="200">
              <Button onClick={() => onComplete(null)} disabled={isCreating} size="large">Skip</Button>
              {steps[currentStep].id === 'review' ? (
                <Button primary onClick={handleComplete} loading={isCreating} size="large">{isCreating ? 'Creating...' : 'Launch Campaign'}</Button>
              ) : steps[currentStep].id === 'activation' ? (
                <div className="wizard-launch-button-container">
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    .wizard-launch-button-container .Polaris-Button--primary {
                      background: #059669 !important;
                      border-color: #059669 !important;
                      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                    }
                    .wizard-launch-button-container .Polaris-Button--primary:hover {
                      background: #047857 !important;
                      border-color: #047857 !important;
                    }
                  `}} />
                  <Button
                    primary
                    size="large"
                    loading={isVerifying}
                    onClick={verifyAppEmbed}
                  >
                    {verificationError ? "Check Again & Continue →" : "I've enabled it, continue to review →"}
                  </Button>
                </div>
              ) : (
                <Button primary size="large" onClick={handleNext}>Continue →</Button>
              )}
            </InlineStack>
          </InlineStack>
        </div>
      </div>
    </div>
  );
}
