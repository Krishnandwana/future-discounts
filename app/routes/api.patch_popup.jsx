import { json, redirect } from '@remix-run/node';
import prisma from '../db.server.js';
import { uploadImageToGCP, isBase64Image, getContentTypeFromBase64, deleteImageFromGCP } from '../utils/gcpStorage.js';
import { enforceFreePlanLimit } from '../utils/popupLimits.server.js';

export async function action({ request }) {
  if (request.method === 'PATCH') {
    try {
      // Extract the token from the Authorization header (Bearer token from frontend)
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return json({ success: false, error: 'Unauthorized' }, 401);
      }
      const accessToken = authHeader.split(' ')[1];

      // Query the session to get the shop name and Shopify access token
      const session = await prisma.session.findUnique({
        where: { accessToken },
        select: {
          shop: true,
          accessToken: true  // This is the Shopify access token
        }
      });

      if (!session) {
        return json({ success: false, error: 'Invalid access token' }, 401);
      }

      const shopName = session.shop;
      const shopifyAccessToken = session.accessToken; // Shopify API token
      const data = await request.json();
      delete data.cityOptions;
      delete data.stateOptions;

      // Get the popup configuration ID from the request body
      const { id } = data; // Expecting id to be passed in the request body
      if (!id) {
        return json({ success: false, error: 'Popup configuration ID is missing' }, 400);
      }

      // Define the allowed fields that can be updated
      const allowedFields = [
        'discountName','couponCode','subheading','discountType','valueType','discountValue','expirationDate','hesitationThreshold','stickyDiscountBar','sidebarWidget','mobileDevices','trigger','scrollPercentage','time','devices','limitFrequency','popupFrequency','popupPeriod','pageRules','subPageRules','scheduleRules','scheduleType','everydaystartTime','everydayendTime','endDate','endTime','askForEmail','startImmediately','startDate','startTime','minPurchaseValue','purchaseType','maxUsesType','maxTotalUses','combineWithProductDiscounts','combineWithShippingDiscounts','combineWithOrderDiscounts','heading','description','fields','primaryButton','primaryButtonText','secondaryButton','secondaryButtonText','footerText','sucessStatusHeading','successDescription','clickAction','buttonText','stickyBarDescription','sidebarButtonText','redirectUrl','template','logo','alignment','cornerRadius','imagePosition','imageWidth','backgroundImage','backgroundOpacity','backgroundColor','textColor','headingColor','descriptionColor','inputColor','consentColor','errorColor','footerTextColor','primaryButtonBackground','primaryButtonTextColor','secondaryButtonBackground','secondaryButtonTextColor','stickyDiscountBarBackground','stickyDiscountBarText','sidebarWidgetBackground','sidebarWidgetTextColor','status','intentMultiplier','fontFamily','headingSize','bodySize','buttonSize','footerSize'
      ];

      // Build sanitizedData only with the fields provided in the request
      const sanitizedData = {};
      for (const key of allowedFields) {
        if (key in data) {
          sanitizedData[key] = data[key];
        }
      }

      // Handle scheduleType to scheduleRules transformation
      if ('scheduleType' in sanitizedData) {
        sanitizedData.scheduleRules = sanitizedData.scheduleType === 'specificDates' ? 'schedule' : 'showAllTime';
        delete sanitizedData.scheduleType; // Remove scheduleType since we don't store it
      }

      // Typecasting and sanitization for specific fields
      if ('discountValue' in sanitizedData && sanitizedData.discountValue !== null) {
        sanitizedData.discountValue = parseFloat(sanitizedData.discountValue);
      }
      if ('hesitationThreshold' in sanitizedData && sanitizedData.hesitationThreshold !== null) {
        sanitizedData.hesitationThreshold = parseInt(sanitizedData.hesitationThreshold, 10);
      }
      if ('imageWidth' in sanitizedData && sanitizedData.imageWidth !== null) {
        sanitizedData.imageWidth = parseInt(sanitizedData.imageWidth);
      }
      if ('popupFrequency' in sanitizedData && sanitizedData.popupFrequency !== null) {
        sanitizedData.popupFrequency = parseInt(sanitizedData.popupFrequency);
      }
      if ('startDate' in sanitizedData && sanitizedData.startDate !== null) {
        sanitizedData.startDate = new Date(sanitizedData.startDate);
      }
      if ('endDate' in sanitizedData && sanitizedData.endDate !== null) {
        sanitizedData.endDate = new Date(sanitizedData.endDate);
      }
      if ('startTime' in sanitizedData && sanitizedData.startTime !== null) {
        sanitizedData.startTime = sanitizedData.startTime;
      } 
      else if ('startTime' in data) {
        // Use current time if startTime is not provided
        sanitizedData.startTime = new Date().toTimeString().slice(0, 5);
      }

      // Handle image uploads to GCP
      if (sanitizedData.logo && isBase64Image(sanitizedData.logo)) {
        try {
          // Get existing popup config to delete old logo if exists
          const existingConfig = await prisma.popupConfiguration.findUnique({
            where: { id },
            select: { logo: true }
          });
          
          const contentType = getContentTypeFromBase64(sanitizedData.logo);
          const logoUrl = await uploadImageToGCP(
            sanitizedData.logo,
            `logo-${shopName}-${Date.now()}.${contentType.split('/')[1]}`,
            contentType,
            {
              maxWidth: 400,
              maxHeight: 200,
              quality: 85,
              format: 'webp'
            }
          );
          sanitizedData.logo = logoUrl;
          
          // Delete old logo if it exists and is a GCP URL
          if (existingConfig?.logo && existingConfig.logo.includes('storage.googleapis.com')) {
            await deleteImageFromGCP(existingConfig.logo);
          }
        } catch (error) {
          console.error('Failed to upload logo:', error);
          return json({ success: false, error: 'Failed to upload logo image' }, 500);
        }
      }

      if (sanitizedData.backgroundImage && isBase64Image(sanitizedData.backgroundImage)) {
        try {
          // Get existing popup config to delete old background if exists
          const existingConfig = await prisma.popupConfiguration.findUnique({
            where: { id },
            select: { backgroundImage: true }
          });
          
          const contentType = getContentTypeFromBase64(sanitizedData.backgroundImage);
          const backgroundUrl = await uploadImageToGCP(
            sanitizedData.backgroundImage,
            `background-${shopName}-${Date.now()}.${contentType.split('/')[1]}`,
            contentType,
            {
              maxWidth: 1200,
              maxHeight: 800,
              quality: 80,
              format: 'webp'
            }
          );
          sanitizedData.backgroundImage = backgroundUrl;
          
          // Delete old background image if it exists and is a GCP URL
          if (existingConfig?.backgroundImage && existingConfig.backgroundImage.includes('storage.googleapis.com')) {
            await deleteImageFromGCP(existingConfig.backgroundImage);
          }
        } catch (error) {
          console.error('Failed to upload background image:', error);
          return json({ success: false, error: 'Failed to upload background image' }, 500);
        }
      }

      // Enforce Free plan limit: Free users can only have 1 active popup at a time
      // If updating with status: true, deactivate other active popups for Free users
      if (sanitizedData.status === true) {
        await enforceFreePlanLimit(shopName, id);
      }

      // Check if the popup exists first
      const existingPopup = await prisma.popupConfiguration.findUnique({
        where: { id }
      });

      if (!existingPopup) {
        return json({ 
          success: false, 
          error: 'Popup configuration not found. Please refresh the page and try again.' 
        }, 404);
      }

      // Update the record in the database
      const updatedPopupConfig = await prisma.popupConfiguration.update({
        where: {
          id, // Ensure the id is passed directly
        },
        data: sanitizedData,
      });

      // Update metafields with ALL active popups (prevents overwriting)
      // Use GraphQL metafieldsSet which is idempotent - creates or updates automatically
      try {
        // Get shop GID for GraphQL using direct Shopify API call
        const shopQuery = `
          query {
            shop {
              id
            }
          }
        `;
        const shopResponse = await fetch(`https://${shopName}/admin/api/2024-10/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': shopifyAccessToken
          },
          body: JSON.stringify({ query: shopQuery })
        });
        
        const shopResult = await shopResponse.json();
        const shopGid = shopResult.data?.shop?.id;

        if (!shopGid) {
          console.warn('⚠️ Could not get shop GID, skipping metafield update');
        } else {
          // Read ALL popups from database to ensure we don't lose any
          const allPopups = await prisma.popupConfiguration.findMany({
            where: { shopName },
            orderBy: { updatedAt: 'desc' }
          });

          // Filter for active popups only
          const activePopups = allPopups.filter(p => p.status);
          
          console.log(`📊 Updating metafields with ${activePopups.length} active popup(s)`);

          const sanitizedPopups = activePopups.map(popup => {
            const { cityOptions: omitCity, stateOptions: omitState, ...rest } = popup;
            return {
              ...rest,
              startDate: popup.startDate ? popup.startDate.toISOString() : null,
              endDate: popup.endDate ? popup.endDate.toISOString() : null,
              expirationDate: popup.expirationDate ? popup.expirationDate.toISOString() : null,
              lastUpdated: new Date().toISOString()
            };
          });

          const billingStatus = activePopups.length > 0
            ? {
                canUseService: true,
                plan: 'Active',
                lastUpdated: new Date().toISOString()
              }
            : {
                canUseService: false,
                plan: 'Inactive',
                lastUpdated: new Date().toISOString()
              };

          // Use GraphQL metafieldsSet - automatically creates or updates (idempotent)
          // This ensures all active popups are saved, not just the one being updated
          const mutation = `
            mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  id
                  key
                  namespace
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;
          
          const variables = {
            metafields: [
              {
                namespace: 'convertboost',
                key: 'popups_data',
                type: 'single_line_text_field',
                value: JSON.stringify(sanitizedPopups), // Array of ALL active popups
                ownerId: shopGid
              },
              {
                namespace: 'convertboost',
                key: 'billing_status',
                type: 'single_line_text_field',
                value: JSON.stringify(billingStatus),
                ownerId: shopGid
              }
            ]
          };
          
          try {
            // Use direct Shopify GraphQL API call
            const response = await fetch(`https://${shopName}/admin/api/2024-10/graphql.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': shopifyAccessToken
              },
              body: JSON.stringify({
                query: mutation,
                variables: variables
              })
            });
            
            const result = await response.json();
            
            if (result.data?.metafieldsSet?.userErrors?.length > 0) {
              console.error('❌ Metafield update errors:', result.data.metafieldsSet.userErrors);
            } else {
              console.log('✅ Successfully updated metafields with all active popups');
            }
          } catch (error) {
            console.error('❌ Metafield GraphQL mutation failed:', error);
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
              shopGid,
              popupCount: sanitizedPopups.length
            });
            // Don't fail the request if metafield updates fail - database update already succeeded
          }
        }
        
      } catch (metafieldError) {
        console.error('Error updating metafields:', metafieldError);
        // Don't fail the request if metafield updates fail - database update already succeeded
      }

      // Return the updated popup configuration
      return new Response(null, { status: 204 });
    } catch (error) {
      console.error('❌ Error in PATCH popup:', error);
      console.error('Error stack:', error.stack);
      return json({ 
        success: false, 
        error: error.message || 'Failed to update popup configuration',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 500);
    }
  } else {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }
}
