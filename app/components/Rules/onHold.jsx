import React, { useState, useEffect, useCallback } from 'react';
import { RadioButton, Autocomplete, Tag } from '@shopify/polaris';
import citiesData from '../../routes/_index/cities.json';
import statesData from '../../routes/_index/states.json';

const defaultFormData = {
  selectedCountry: [], // Ensure selectedCountry is always an array
  locationType: 'city',
  selectedCity: [],
  selectedState: [],
  cityOptions: [],
  stateOptions: [],
  discountLocation: 'include'
};

export default function DiscountLocation({ formData = defaultFormData, handleChange }) {
  const [countryInputValue, setCountryInputValue] = useState('');
  const [cityInputValue, setCityInputValue] = useState('');
  const [stateInputValue, setStateInputValue] = useState('');

  useEffect(() => {
    if (formData.selectedCountry.length === 1) {
      if (formData.locationType === 'city') {
        const options = citiesData[formData.selectedCountry[0]]?.map((city) => ({
          label: city,
          value: city
        })) || [];
        handleChange('cityOptions', options);
      } else if (formData.locationType === 'state') {
        const options = statesData[formData.selectedCountry[0]]?.map((state) => ({
          label: state,
          value: state
        })) || [];
        handleChange('stateOptions', options);
      }
    } else {
      handleChange('cityOptions', []);
      handleChange('stateOptions', []);
    }
  }, [formData.selectedCountry, formData.locationType]);

  const handleCountrySelection = useCallback(
    (selected) => {
      handleChange('selectedCountry', selected);
      setCountryInputValue('');
    },
    [handleChange]
  );

  const removeCountry = useCallback(
    (country) => {
      const updatedCountries = formData.selectedCountry.filter((item) => item !== country);
      handleChange('selectedCountry', updatedCountries);
    },
    [formData.selectedCountry, handleChange]
  );

  const handleCitySelection = useCallback(
    (selected) => {
      const newCity = selected[selected.length - 1];
      if (newCity && !formData.selectedCity.includes(newCity)) {
        handleChange('selectedCity', [...(formData.selectedCity || []), newCity]);
      }
      setCityInputValue('');
    },
    [formData.selectedCity, handleChange]
  );

  const handleStateSelection = useCallback(
    (selected) => {
      const newState = selected[selected.length - 1];
      if (newState && !formData.selectedState.includes(newState)) {
        handleChange('selectedState', [...(formData.selectedState || []), newState]);
      }
      setStateInputValue('');
    },
    [formData.selectedState, handleChange]
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

  return (
    <div className="p-4">
      <div><b>Location Rules</b></div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>
        Choose whether to show or hide the popup for the selected locations.
      </div>
      <br />

      {/* Country Selection */}
      <div style={{ marginTop: "15px" }}>
        <Autocomplete
          allowMultiple
          options={[
            { label: 'India', value: 'India' },
            { label: 'United States', value: 'United States' },
            { label: 'United Kingdom', value: 'United Kingdom' },
            { label: 'Philippines', value: 'Philippines' },
          ]}
          selected={Array.isArray(formData.selectedCountry) ? formData.selectedCountry : []}
          onSelect={handleCountrySelection}
          textField={
            <Autocomplete.TextField
              onChange={(value) => setCountryInputValue(value)}
              label="Select Country"
              value={countryInputValue}
              placeholder="Select here"
            />
          }
        />
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {(Array.isArray(formData.selectedCountry) ? formData.selectedCountry : []).map((country) => (
            <Tag key={country} onRemove={() => removeCountry(country)}>
              {country}
            </Tag>
          ))}
        </div>
      </div>

      {/* State/City Options - Only show when a single country is selected */}
      {formData.selectedCountry.length <= 1 ? (
        <div>
          <div className="mt-6 flex flex-col gap-4" style={{ marginTop: "10px" }}>
            <RadioButton
              label="State Wise"
              checked={formData.locationType === 'state'}
              onChange={() => handleChange('locationType', 'state')}
            />
            <br />
            <RadioButton
              label="City Wise"
              checked={formData.locationType === 'city'}
              onChange={() => handleChange('locationType', 'city')}
            />
          </div>

          {formData.locationType === 'city' ? (
            <div style={{ marginTop: "15px" }}>
              <Autocomplete
                allowMultiple
                options={formData.cityOptions || []}
                selected={formData.selectedCity}
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
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {formData.selectedCity.map((city) => (
                  <Tag key={city} onRemove={() => removeCity(city)}>
                    {city}
                  </Tag>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "15px" }}>
              <Autocomplete
                allowMultiple
                options={formData.stateOptions || []}
                selected={formData.selectedState}
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
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {formData.selectedState.map((state) => (
                  <Tag key={state} onRemove={() => removeState(state)}>
                    {state}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "10px" }}>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <RadioButton
                  label={`Include - Show popup in selected ${formData.locationType === 'city' ? 'cities' : 'states'} only`}
                  checked={formData.discountLocation === 'include'}
                  onChange={() => handleChange('discountLocation', 'include')}
                />
                <br />
                <RadioButton
                  label={`Exclude - Hide popup in selected ${formData.locationType === 'city' ? 'cities' : 'states'} only`}
                  checked={formData.discountLocation === 'exclude'}
                  onChange={() => handleChange('discountLocation', 'exclude')}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "10px", color: "#6d7175", fontSize: "13px" }}>
          State and City options are disabled when multiple countries are selected.
        </div>
      )}
    </div>
  );
}
