import React, { useState, useEffect, useCallback } from 'react';
import { RadioButton, Select, Autocomplete, Tag, Spinner, InlineStack, Text } from '@shopify/polaris';
import countriesData from '../../routes/_index/countries.json'; // Import the countries JSON file
import HelpTooltip from '../HelpTooltip';

const defaultFormData = {
  locationType: 'city',
  selectedCountry: '',
  selectedCountries: [],
  selectedState: [],
  selectedCity: [],
  discountLocation: 'include'
};


export default function DiscountLocation({ formData = defaultFormData, handleChange }) {
  const [cityInputValue, setCityInputValue] = useState('');
  const [stateInputValue, setStateInputValue] = useState('');
  const [countryInputValue, setCountryInputValue] = useState('');
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Load country options from the imported JSON file
  const countryOptions = countriesData.map((country) => ({
    label: country.name,
    value: country.name
  }));

  useEffect(() => {
    if (formData.locationType === 'city') {
      if (formData.selectedCountry) {
        setIsLoadingCities(true);
        // Fetch cities from API
        fetch(`https://convert-boost-backend.vercel.app/api/get_cities_by_country?country=${encodeURIComponent(formData.selectedCountry)}`)
          .then(response => response.json())
          .then(data => {
            if (data.success && Array.isArray(data.data)) {
              const options = data.data
                .filter(city => city) // Filter out empty strings
                .map(city => ({
                  label: city,
                  value: city
                }));
              handleChange('cityOptions', options);
            } else {
              handleChange('cityOptions', []);
            }
          })
          .catch(error => {
            console.error('Error fetching cities:', error);
            handleChange('cityOptions', []);
          })
          .finally(() => {
            setIsLoadingCities(false);
          });
      } else {
        handleChange('cityOptions', []);
      }
    } else if (formData.locationType === 'state') {
      if (formData.selectedCountry) {
        setIsLoadingStates(true);
        // Fetch states from API
        fetch(`https://convert-boost-backend.vercel.app/api/get_regions_by_country?country=${encodeURIComponent(formData.selectedCountry)}`)
          .then(response => response.json())
          .then(data => {
            if (data.success && Array.isArray(data.data)) {
              const options = data.data
                .filter(state => state) // Filter out empty strings
                .map(state => ({
                  label: state,
                  value: state
                }));
              handleChange('stateOptions', options);
            } else {
              handleChange('stateOptions', []);
            }
          })
          .catch(error => {
            console.error('Error fetching states:', error);
            handleChange('stateOptions', []);
          })
          .finally(() => {
            setIsLoadingStates(false);
          });
      } else {
        handleChange('stateOptions', []);
      }
    }
  }, [formData.selectedCountry, formData.locationType]);

  const handleLocationTypeChange = useCallback(
    (type) => {
      handleChange('locationType', type);
      handleChange('selectedCity', []);
      handleChange('selectedState', []);
      handleChange('selectedCountry', '');
      handleChange('selectedCountries', []);
    },
    [handleChange]
  );

  const handleCitySelection = useCallback(
    (selected) => {
      const newCity = selected[selected.length - 1];
      if (newCity && !formData.selectedCity?.includes(newCity)) {
        handleChange('selectedCity', [...(formData.selectedCity || []), newCity]);
      }
      setCityInputValue('');
    },
    [formData.selectedCity, handleChange]
  );

  const handleStateSelection = useCallback(
    (selected) => {
      const newState = selected[selected.length - 1];
      if (newState && !formData.selectedState?.includes(newState)) {
        handleChange('selectedState', [...(formData.selectedState || []), newState]);
      }
      setStateInputValue('');
    },
    [formData.selectedState, handleChange]
  );

  const handleCountrySelection = useCallback(
    (selected) => {
      const newCountry = selected[selected.length - 1];
      if (newCountry && !formData.selectedCountries?.includes(newCountry)) {
        handleChange('selectedCountries', [...(formData.selectedCountries || []), newCountry]);
      }
      setCountryInputValue('');
    },
    [formData.selectedCountries, handleChange]
  );

  const removeCity = useCallback(
    (city) => {
      handleChange('selectedCity', (formData.selectedCity || []).filter((selected) => selected !== city));
    },
    [formData.selectedCity, handleChange]
  );

  const removeState = useCallback(
    (state) => {
      handleChange('selectedState', (formData.selectedState || []).filter((selected) => selected !== state));
    },
    [formData.selectedState, handleChange]
  );

  const removeCountry = useCallback(
    (country) => {
      handleChange('selectedCountries', (formData.selectedCountries || []).filter((selected) => selected !== country));
    },
    [formData.selectedCountries, handleChange]
  );

  const filterAndSortItems = useCallback(
    (inputValue, options) => {
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
    },
    []
  );

  const handleCountryValue = (value) => {
    handleChange('selectedCity', []);
    handleChange('selectedState', []);
    handleChange('selectedCountry', value);
  };

  const locationTypeLabel =
    formData.locationType === 'city'
      ? 'cities'
      : formData.locationType === 'state'
      ? 'states'
      : 'countries';

  return (
    <div className="p-4">
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Location Rules</Text>
          <HelpTooltip content="Choose whether to show or hide the popup for the selected locations." />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Choose whether to show or hide the popup for the selected locations.</div>
      <br />

      <div className="mt-6 flex flex-col gap-4" style={{ marginTop: "2px" }}>
        <div>
          <RadioButton
            label="Country Wise"
            checked={formData.locationType === 'country'}
            onChange={() => handleLocationTypeChange('country')}
          />
          <br />
          <RadioButton
            label="State Wise"
            checked={formData.locationType === 'state'}
            onChange={() => handleLocationTypeChange('state')}
          />
          <br />
          <RadioButton
            label="City Wise"
            checked={formData.locationType === 'city'}
            onChange={() => handleLocationTypeChange('city')}
          />
        </div>
      </div>

      {(formData.locationType === 'state' || formData.locationType === 'city') && (
        <div className="mt-6" style={{ marginTop: "15px" }}>
          <Select
            label="Select Country"
            options={[{ label: 'Select Here', value: '' }, ...countryOptions]}
            value={formData.selectedCountry || ''}
            onChange={handleCountryValue}
          />
        </div>
      )}

      {formData.locationType === 'city' && (
        <div style={{ marginTop: "15px" }}>
          {isLoadingCities ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Spinner size="small" />
            </div>
          ) : (
            <Autocomplete
              allowMultiple
              options={filterAndSortItems(cityInputValue, formData.cityOptions || [])}
              selected={formData.selectedCity || []}
              onSelect={handleCitySelection}
              textField={
                <Autocomplete.TextField
                  onChange={(value) => setCityInputValue(value)}
                  label="Select City"
                  value={cityInputValue}
                  placeholder="Select here"
                />
              }
            />
          )}
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {(formData.selectedCity || []).map((city) => (
              <Tag key={city} onRemove={() => removeCity(city)}>
                {city}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {formData.locationType === 'state' && (
        <div style={{ marginTop: "15px" }}>
          {isLoadingStates ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Spinner size="small" />
            </div>
          ) : (
            <Autocomplete
              allowMultiple
              options={filterAndSortItems(stateInputValue, formData.stateOptions || [])}
              selected={formData.selectedState || []}
              onSelect={handleStateSelection}
              textField={
                <Autocomplete.TextField
                  onChange={(value) => setStateInputValue(value)}
                  label="Select State"
                  value={stateInputValue}
                  placeholder="Select here"
                />
              }
            />
          )}
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {(formData.selectedState || []).map((state) => (
              <Tag key={state} onRemove={() => removeState(state)}>
                {state}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {formData.locationType === 'country' && (
        <div style={{ marginTop: "15px" }}>
          <Autocomplete
            allowMultiple
            options={filterAndSortItems(countryInputValue, countryOptions)}
            selected={formData.selectedCountries || []}
            onSelect={handleCountrySelection}
            textField={
              <Autocomplete.TextField
                onChange={(value) => setCountryInputValue(value)}
                label="Select Countries"
                value={countryInputValue}
                placeholder="Select here"
              />
            }
          />
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {(formData.selectedCountries || []).map((country) => (
              <Tag key={country} onRemove={() => removeCountry(country)}>
                {country}
              </Tag>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "10px" }}>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <RadioButton
              label={`Include - Show popup in selected ${locationTypeLabel} only`}
              checked={formData.discountLocation === 'include'}
              onChange={() => handleChange('discountLocation', 'include')}
            />
            <br />
            <RadioButton
              label={`Exclude - Hide popup in selected ${locationTypeLabel} only`}
              checked={formData.discountLocation === 'exclude'}
              onChange={() => handleChange('discountLocation', 'exclude')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}