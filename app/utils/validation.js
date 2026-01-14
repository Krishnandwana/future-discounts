// Validation utility for form fields with user-friendly error messages

export const validatePopupForm = (formData) => {
  const errors = {};

  // Rules validation
  if (!formData.discountName || formData.discountName.trim() === '') {
    errors.discountName = 'Campaign Name: Please give your campaign a name';
  } else if (formData.discountName.length > 100) {
    errors.discountName = 'Campaign Name: Too long (max 100 characters)';
  }

  // Discount validation
  if (formData.discountType === 'automatic' || formData.discountType === 'silent') {
    if (!formData.discountValue || formData.discountValue <= 0) {
      errors.discountValue = 'Discount Value: Please enter a value greater than 0';
    } else if (formData.valueType === 'percentage' && formData.discountValue > 100) {
      errors.discountValue = 'Discount Value: Percentage cannot exceed 100%';
    }
  }

  if (formData.discountType === 'manual' && !formData.couponCode) {
    errors.couponCode = 'Discount Code: Please enter a code for customers to use';
  }

  // Trigger validation - handle different trigger value formats
  if ((formData.trigger === 'timer' || formData.trigger === 'time_on_page') && (!formData.time || parseInt(formData.time) < 1)) {
    errors.time = 'Trigger Time: Please set at least 1 second';
  }

  if ((formData.trigger === 'scroll' || formData.trigger === 'scroll_percentage') && (!formData.scrollPercentage || parseInt(formData.scrollPercentage) < 1)) {
    errors.scrollPercentage = 'Scroll Trigger: Please select a scroll percentage';
  }

  // Content validation
  if (!formData.heading || formData.heading.trim() === '') {
    errors.heading = 'Popup Headline: Please add a headline to grab attention';
  } else if (formData.heading.length > 60) {
    errors.heading = 'Popup Headline: Too long (keep under 60 characters)';
  }

  if (!formData.description || formData.description.trim() === '') {
    errors.description = 'Popup Description: Please add a description for your offer';
  }

  // Email field validation - only if askForEmail is explicitly true
  if (formData.askForEmail === true && formData.fields) {
    const hasEmailField = formData.fields.some(field => field.type === 'email' && field.checked);
    if (!hasEmailField) {
      errors.fields = 'Email Collection: Please enable at least one email field';
    }
  }

  // Button validation - check for button existence more flexibly
  if (formData.primaryButton === false && formData.secondaryButton === false) {
    errors.buttons = 'Popup Buttons: Please enable at least one button';
  }

  if (formData.primaryButton === true && (!formData.primaryButtonText || formData.primaryButtonText.trim() === '')) {
    errors.primaryButtonText = 'Primary Button: Please add button text';
  }

  // Schedule validation
  if (formData.scheduleRules === 'schedule' || formData.scheduleRules === 'timePeriod' || formData.scheduleType === 'specificDates') {
    if (!formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      errors.schedule = 'Schedule Settings: Please set both start and end dates with times';
    } else {
      const now = new Date();
      const startDateTime = new Date(formData.startDate + 'T' + formData.startTime);
      const endDateTime = new Date(formData.endDate + 'T' + formData.endTime);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        errors.schedule = 'Schedule Settings: Invalid date or time format';
      } else {
        const timeDifference = endDateTime - startDateTime;
        const minutesDifference = timeDifference / (1000 * 60);

        if (endDateTime <= startDateTime) {
          errors.schedule = 'Schedule Settings: End date-time is before start date-time. Your popup will never show!';
        } else if (minutesDifference < 15) {
          errors.schedule = 'Schedule Settings: Must have at least 15 minutes between start and end times';
        } else if (endDateTime <= now) {
          errors.schedule = 'Schedule Settings: End date is in the past. Your popup will never show!';
        }
      }
    }
  }

  return errors;
};

// Helper function to get user-friendly error messages
export const getFieldErrorMessage = (field, value) => {
  const errorMessages = {
    network: {
      default: 'Unable to connect. Please check your internet connection and try again.',
      timeout: 'The request took too long. Please try again.',
      500: 'Something went wrong on our end. Please try again in a moment.',
      401: 'Your session has expired. Please refresh the page and try again.',
      403: 'You don\'t have permission to perform this action.',
      404: 'The requested resource could not be found.',
    },
    validation: {
      required: `This field is required`,
      email: 'Please enter a valid email address',
      url: 'Please enter a valid URL (starting with http:// or https://)',
      number: 'Please enter a valid number',
      positive: 'Please enter a positive number',
      percentage: 'Please enter a value between 0 and 100',
    }
  };

  if (errorMessages.validation[field]) {
    return errorMessages.validation[field];
  }

  return 'Please check this field';
};

// Validate individual field in real-time
export const validateField = (field, value, formData = {}) => {
  switch (field) {
    case 'discountName':
      if (!value || value.trim() === '') return 'Campaign name is required';
      if (value.length > 100) return 'Too long (max 100 characters)';
      return null;

    case 'discountValue':
      if (!value || value <= 0) return 'Must be greater than 0';
      if (formData.valueType === 'percentage' && value > 100) return 'Cannot exceed 100%';
      return null;

    case 'couponCode':
      if (!value || value.trim() === '') return 'Discount code is required';
      if (!/^[A-Z0-9_-]+$/i.test(value)) return 'Only letters, numbers, dashes and underscores allowed';
      return null;

    case 'email':
      if (!value) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
      return null;

    case 'redirectUrl':
      if (value && !/^https?:\/\/.+/.test(value)) return 'URL must start with http:// or https://';
      return null;

    default:
      return null;
  }
};

// Format error for display
export const formatError = (error) => {
  if (typeof error === 'string') return error;
  
  if (error.message) {
    // Network errors
    if (error.message.includes('Network')) {
      return 'Connection error. Please check your internet and try again.';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please try again.';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};