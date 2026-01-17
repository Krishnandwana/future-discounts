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
      const body = await request.json();
      const { popupConfig, hesitationScore } = body;
      
      console.log('📨 Popup validation request received:', {
        popupId: popupConfig?.id,
        hesitationScore,
        threshold: popupConfig?.hesitationThreshold
      });

      // Validate required fields
      if (popupConfig.hesitationThreshold === undefined || popupConfig.hesitationThreshold === null) {
        console.log('❌ Missing hesitationThreshold in request');
        return json({
          success: false,
          error: 'Missing hesitationThreshold in popup config',
          shouldShow: false
        }, { 
          status: 400, 
          headers: corsHeaders
        });
      }

      // Validate hesitation score
      const threshold = popupConfig.hesitationThreshold || 50;
      const currentScore = hesitationScore || 0;
      
      // Show popup if hesitation score meets or exceeds threshold
      const shouldShowPopup = currentScore >= threshold;
      
      console.log(`🎯 Hesitation validation: Score ${currentScore.toFixed(2)} >= Threshold ${threshold} = ${shouldShowPopup ? 'SHOW' : 'HIDE'}`);

      // Return appropriate response
      if (shouldShowPopup) {
        return json({
          success: true,
          message: 'Popup should be shown',
          shouldShow: true,
          hesitationScore: currentScore,
          threshold: threshold,
          debug: {
            hesitationScore: currentScore,
            threshold: threshold,
            passed: true
          }
        }, { 
          status: 200, 
          headers: corsHeaders
        });
      } else {
        return json({
          success: false,
          message: 'Popup should not be shown - hesitation score below threshold',
          shouldShow: false,
          hesitationScore: currentScore,
          threshold: threshold,
          debug: {
            hesitationScore: currentScore,
            threshold: threshold,
            passed: false
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

// No default export - this is a resource route
