import { json } from '@remix-run/node';

// CORS headers - allow all origins for now
function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'false'
  };
}

// Helper function to get user's location from IP
async function getUserLocationFromIP(request) {
  try {
    // Get IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || '127.0.0.1';

    console.log(`🌐 Getting location for IP: ${ip}`);

    // For development/localhost, return a default location
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'US',
        state: 'California', 
        city: 'San Francisco',
        countryCode: 'US'
      };
    }

    // For now, skip database lookup and use external API directly
    // TODO: Fix database integration later
    console.log('🔍 Skipping database lookup, using external API...');

    // If not found in database, use external API
    console.log('📡 IP not found in database, using external API...');
    
    let data = {};
    try {
      // Try multiple free IP geolocation services
      const apis = [
        `http://ip-api.com/json/${ip}`,
        `https://ipapi.co/${ip}/json/`,
        `https://api.ipgeolocation.io/ipgeo?apiKey=free&ip=${ip}`
      ];
      
      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          const apiData = await response.json();
          
          // Check if this API returned valid data
          if (apiData && !apiData.error && (apiData.city || apiData.region || apiData.country)) {
            data = apiData;
            console.log(`✅ Got location from API: ${apiUrl}`);
            break;
          }
        } catch (apiError) {
          console.log(`⚠️ API failed: ${apiUrl}`, apiError.message);
          continue;
        }
      }
    } catch (error) {
      console.error('All IP APIs failed:', error);
    }
    
    const locationData = {
      country: data.country || data.country_name || data.country_code || 'Unknown',
      state: data.regionName || data.region || 'Unknown', 
      city: data.city || 'Unknown',
      countryCode: data.countryCode || data.country_code || 'Unknown'
    };

    // TODO: Store the new IP data in database later

    return locationData;

  } catch (error) {
    console.error('❌ Error getting user location:', error);
    return {
      country: 'US',
      state: 'California',
      city: 'San Francisco',
      countryCode: 'US'
    };
  }
}

// Helper function to normalize location names for comparison
function normalizeLocation(location) {
  if (!location) return '';
  return location.toString().toLowerCase().trim();
}

// Helper function to check if location matches
function locationMatches(userLocation, configuredLocations) {
  if (!userLocation || !configuredLocations) return false;
  
  const normalizedUser = normalizeLocation(userLocation);
  
  // Handle both string and array formats
  const locations = Array.isArray(configuredLocations) ? configuredLocations : [configuredLocations];
  
  return locations.some(location => {
    const normalizedConfig = normalizeLocation(location);
    return normalizedUser === normalizedConfig || 
           normalizedUser.includes(normalizedConfig) ||
           normalizedConfig.includes(normalizedUser);
  });
}

// Handle all HTTP methods
export async function loader({ request }) {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    console.log('🎯 Handling OPTIONS preflight request');
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  
  // Handle other methods
  return json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: corsHeaders
  });
}

export async function action({ request }) {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  console.log('🔍 Action - Method:', request.method, 'Origin:', origin);

  // Handle OPTIONS in action as well
  if (request.method === 'OPTIONS') {
    console.log('🎯 Handling OPTIONS in action');
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (request.method === 'POST') {
    try {
      const popupConfig = await request.json();
      console.log('📨 Popup validation request received:', popupConfig);

      // Get user's location from IP
      const userLocation = await getUserLocationFromIP(request);
      console.log('🌍 User location detected:', userLocation);

      // Validate required fields
      if (!popupConfig.locationRules) {
        console.log('❌ Missing locationRules in request');
        return json({
          success: false,
          error: 'Missing locationRules in request',
          shouldShow: false
        }, { 
          status: 400, 
          headers: corsHeaders
        });
      }

      // Validate location rules using the same logic as backend
      const shouldShowPopup = validateLocationRules(userLocation, popupConfig);
      console.log(`🎯 Popup decision: ${shouldShowPopup ? 'SHOW' : 'HIDE'}`);

      // Return appropriate response
      if (shouldShowPopup) {
        return json({
          success: true,
          message: 'Popup should be shown',
          shouldShow: true,
          userLocation: userLocation,
          debug: {
            locationRules: popupConfig.locationRules,
            discountLocation: popupConfig.discountLocation,
            locationType: popupConfig.locationType
          }
        }, { 
          status: 200, 
          headers: corsHeaders
        });
      } else {
        return json({
          success: false,
          message: 'Popup should not be shown based on location rules',
          shouldShow: false,
          userLocation: userLocation,
          debug: {
            locationRules: popupConfig.locationRules,
            discountLocation: popupConfig.discountLocation,
            locationType: popupConfig.locationType
          }
        }, { 
          status: 401, 
          headers: corsHeaders
        });
      }

    } catch (error) {
      console.error('❌ Error validating popup:', error);
      
      // In case of error, default to not showing popup for safety
      return json({
        success: false,
        error: 'Internal server error during validation',
        shouldShow: false,
        message: error.message
      }, { 
        status: 500, 
        headers: corsHeaders
      });
    }
  } else {
    return json({ error: 'Method not allowed' }, { 
      status: 405, 
      headers: corsHeaders
    });
  }
}

// Main validation function
function validateLocationRules(userLocation, popupConfig) {
  const {
    locationRules = 'everyWhere',
    discountLocation = 'include',
    locationType = 'country',
    selectedCountry,
    selectedCountries = [],
    selectedState = [],
    selectedCity = []
  } = popupConfig;

  console.log('🌍 Location validation:', {
    userLocation,
    locationRules,
    discountLocation,
    locationType,
    selectedCountry,
    selectedCountries,
    selectedState,
    selectedCity
  });

  // If showing everywhere, always allow
  if (locationRules === 'everyWhere') {
    console.log('✅ Showing everywhere - popup allowed');
    return true;
  }

  // If allCountries OR certainCountries, check specific location rules
  if (locationRules === 'allCountries' || locationRules === 'certainCountries') {
    let isLocationMatch = false;

    // Check based on location type
    switch (locationType) {
      case 'country':
        // Check against selectedCountries array or selectedCountry
        const countriesToCheck = selectedCountries.length > 0 ? selectedCountries : [selectedCountry].filter(Boolean);
        
        // Special case: exclude with empty countries means exclude nothing (show to everyone)
        if (discountLocation === 'exclude' && countriesToCheck.length === 0) {
          console.log('✅ Exclude mode with no countries selected - showing to everyone');
          return true;
        }
        
        isLocationMatch = locationMatches(userLocation.country, countriesToCheck) || 
                         locationMatches(userLocation.countryCode, countriesToCheck);
        break;

      case 'state':
        // Special case: exclude with empty states means exclude nothing (show to everyone)
        if (discountLocation === 'exclude' && selectedState.length === 0) {
          console.log('✅ Exclude mode with no states selected - showing to everyone');
          return true;
        }
        
        // Check against selectedState array
        isLocationMatch = locationMatches(userLocation.state, selectedState);
        break;

      case 'city':
        // Special case: exclude with empty cities means exclude nothing (show to everyone)
        if (discountLocation === 'exclude' && selectedCity.length === 0) {
          console.log('✅ Exclude mode with no cities selected - showing to everyone');
          return true;
        }
        
        // Check against selectedCity array
        isLocationMatch = locationMatches(userLocation.city, selectedCity);
        break;

      default:
        // Default to country check
        const defaultCountries = selectedCountries.length > 0 ? selectedCountries : [selectedCountry].filter(Boolean);
        
        if (discountLocation === 'exclude' && defaultCountries.length === 0) {
          console.log('✅ Exclude mode with no default countries - showing to everyone');
          return true;
        }
        
        isLocationMatch = locationMatches(userLocation.country, defaultCountries) || 
                         locationMatches(userLocation.countryCode, defaultCountries);
    }

    // Apply include/exclude logic
    if (discountLocation === 'include') {
      // Show popup if location matches
      const shouldShow = isLocationMatch;
      console.log(shouldShow ? '✅ Location matches include rule - popup allowed' : '❌ Location not in include list - popup blocked');
      return shouldShow;
    } else if (discountLocation === 'exclude') {
      // Show popup if location does NOT match
      const shouldShow = !isLocationMatch;
      console.log(shouldShow ? '✅ Location not in exclude list - popup allowed' : '❌ Location in exclude list - popup blocked');
      return shouldShow;
    }
  }

  // Default: don't show popup
  console.log('❌ Default rule - popup blocked');
  return false;
}

// No default export - this is a resource route