import React, { useEffect, useState } from 'react';
import { Text, RadioButton, TextField, BlockStack, Banner, InlineStack } from '@shopify/polaris';
import HelpTooltip from '../HelpTooltip';

export default function ScheduleRules({ formData, handleChange }) {
  const textFieldStyle = {
    width: "150px"
  };
  
  const [validationError, setValidationError] = useState(null);

  // Helper function to format DateTime to yyyy-MM-dd
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    return isoDate.split('T')[0]; // Extracts the date portion
  };

  // Helper function to convert 12-hour format to 24-hour format
  const convertTo24HourFormat = (time) => {
    if (!time) return '';
    const [hours, minutes, period] = time.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i).slice(1);
    let convertedHours = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && convertedHours < 12) {
      convertedHours += 12;
    } else if (period.toUpperCase() === 'AM' && convertedHours === 12) {
      convertedHours = 0;
    }
    return `${convertedHours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Validate date-time ranges
  useEffect(() => {
    if (formData.scheduleType === 'specificDates') {
      const startDate = formData.startDate ? new Date(formData.startDate) : null;
      const endDate = formData.endDate ? new Date(formData.endDate) : null;
      
      if (startDate && endDate) {
        // Set time components if available
        if (formData.startTime) {
          const [startHours, startMinutes] = formData.startTime.split(':');
          startDate.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10));
        }
        
        if (formData.endTime) {
          const [endHours, endMinutes] = formData.endTime.split(':');
          endDate.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10));
        }
        
        const timeDifference = endDate - startDate;
        const minutesDifference = timeDifference / (1000 * 60); // Convert to minutes
        
        if (endDate < startDate) {
          setValidationError('End date-time cannot be earlier than start date-time');
        } else if (minutesDifference < 15) {
          setValidationError('There must be at least 15 minutes between start and end times');
        } else {
          setValidationError(null);
        }
      }
    } else {
      setValidationError(null);
    }
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime, formData.scheduleType]);

  // Set initial schedule type based on existing data
  useEffect(() => {
    // Map scheduleRules to scheduleType on component mount or when scheduleRules changes
    if (formData.scheduleRules === 'schedule' || formData.scheduleRules === 'timePeriod') {
      if (formData.scheduleType !== 'specificDates') {
        handleChange('scheduleType', 'specificDates');
      }
      if (formData.startImmediately !== false) {
        handleChange('startImmediately', false);
      }
    } else if (formData.scheduleRules === 'showAllTime') {
      if (formData.scheduleType !== 'showAllTime') {
        handleChange('scheduleType', 'showAllTime');
      }
      if (formData.startImmediately !== true) {
        handleChange('startImmediately', true);
      }
    } else if (!formData.scheduleType) {
      // Only set defaults if scheduleType is not set
      if (formData.startImmediately) {
        handleChange('scheduleType', 'showAllTime');
        handleChange('scheduleRules', 'showAllTime');
      } else if (formData.everydayStartTime || formData.everydayEndTime) {
        handleChange('scheduleType', 'everyday');
      } else if (formData.startDate || formData.endDate || formData.startTime || formData.endTime) {
        handleChange('scheduleType', 'specificDates');
        handleChange('scheduleRules', 'schedule');
        handleChange('startImmediately', false);
      }
    }
  }, [formData.scheduleRules]);

  const handleSpecificDatesSelection = () => {
    handleChange('scheduleType', 'specificDates');
    handleChange('scheduleRules', 'schedule');
    handleChange('startImmediately', false);

    // Clear everyday values
    handleChange('everydayStartTime', null);
    handleChange('everydayEndTime', null);
  };

  // Handle date or time change with validation
  const handleDateTimeChange = (field, value) => {
    handleChange(field, value);
  };

  return (
    <>
      <div style={{ marginTop: "20px" }}>
        <InlineStack gap="2" blockAlign="center">
          <Text variant="headingSm" as="h3">Schedule rules</Text>
          <HelpTooltip content="Display the popup based on your set rules" />
        </InlineStack>
      </div>
      <div style={{ marginTop: "5px", fontSize: "13px", color: "#6d7175" }}>Display the popup based on your set rules</div>

        {validationError && (
          <div style={{ marginTop: "10px" }}>
            <Banner 
              status="critical"
              title={validationError.includes('will never') ? "Warning: Popup will never show!" : "Invalid schedule settings"}
            >
              {validationError}
              {validationError.includes('earlier than start') && (
                <p style={{ marginTop: '8px', fontWeight: 'bold' }}>
                  With these settings, your popup will NEVER be visible to customers!
                </p>
              )}
            </Banner>
          </div>
        )}

        <BlockStack gap="4" style={{ marginTop: "20px" }}>
          <BlockStack>
            <RadioButton
              label="Show popup always"
              checked={formData.scheduleType === 'showAllTime' || (formData.scheduleRules === 'showAllTime' && !formData.scheduleType)}
              onChange={() => {
                handleChange('scheduleType', 'showAllTime');
                handleChange('scheduleRules', 'showAllTime');
                handleChange('startImmediately', true);

                // Clear all other values
                handleChange('everydayStartTime', null);
                handleChange('everydayEndTime', null);
                handleChange('startDate', null);
                handleChange('endDate', null);
                handleChange('startTime', null);
                handleChange('endTime', null);
              }}
            />

            {/* 
            <RadioButton
              label="Show popup every day"
              checked={formData.scheduleType === 'everyday'}
              onChange={handleEverydaySelection}
            />

            {formData.scheduleType === 'everyday' && (
              <div style={{ marginLeft: "20px", marginTop: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={textFieldStyle}>
                    <TextField
                      label="Start Time"
                      type="time"
                      value={formData.everydayStartTime || ''}
                      onChange={(value) => handleChange('everydayStartTime', value)}
                    />
                  </div>
                  <div style={textFieldStyle}>
                    <TextField
                      label="End Time"
                      type="time"
                      value={formData.everydayEndTime || ''}
                      onChange={(value) => handleChange('everydayEndTime', value)}
                    />
                  </div>
                </div>
              </div>
            )}
            */}

            <RadioButton
              label="Show popup in specific dates"
              checked={formData.scheduleType === 'specificDates' || (formData.scheduleRules === 'schedule' && !formData.scheduleType) || (formData.scheduleRules === 'timePeriod' && !formData.scheduleType)}
              onChange={handleSpecificDatesSelection}
            />
            {(formData.scheduleType === 'specificDates' || formData.scheduleRules === 'schedule' || formData.scheduleRules === 'timePeriod') && (
              <div style={{ marginLeft: "20px", marginTop: "10px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={textFieldStyle}>
                      <TextField
                        label="Start Date"
                        type="date"
                        value={formatDate(formData.startDate)}
                        onChange={(value) => handleDateTimeChange('startDate', value)}
                      />
                    </div>
                    <div style={textFieldStyle}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={formData.startTime || ''}
                        onChange={(value) => handleDateTimeChange('startTime', value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={textFieldStyle}>
                      <TextField
                        label="End Date"
                        type="date"
                        value={formatDate(formData.endDate)}
                        onChange={(value) => handleDateTimeChange('endDate', value)}
                      />
                    </div>
                    <div style={textFieldStyle}>
                      <TextField
                        label="End Time"
                        type="time"
                        value={formData.endTime || ''}
                        onChange={(value) => handleDateTimeChange('endTime', value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </BlockStack>
        </BlockStack>
    </>
  );
}