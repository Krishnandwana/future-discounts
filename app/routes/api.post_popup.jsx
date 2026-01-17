import { json } from '@remix-run/node';
import prisma from '../db.server.js';
import { uploadImageToGCP, isBase64Image, getContentTypeFromBase64 } from '../utils/gcpStorage.js';
import { enforceFreePlanLimit } from '../utils/popupLimits.server.js';

export async function action({ request }) {
  if (request.method === 'POST' || request.method === 'PATCH') {
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

      // Parse the request body
      const data = await request.json();

      // Set id to 0 if not present
      const id = data.id || 0;

      // Validate and sanitize the data
      const sanitizedData = {
        discountName: data.discountName || 'Sales Spot on Discount',
        couponCode: data.couponCode || null,
        subheading: data.subheading || null,
        discountType: data.discountType || 'automatic',
        valueType: data.valueType || 'percentage',
        discountValue: parseFloat(data.discountValue) || 10,
        expirationDate: data.expirationDate || false,
        hesitationThreshold: Number.isFinite(Number(data.hesitationThreshold)) ? parseInt(data.hesitationThreshold, 10) : 50,
        stickyDiscountBar: data.stickyDiscountBar || 'yes',
        sidebarWidget: data.sidebarWidget || 'no',
        trigger: data.trigger || 'scroll',
        scrollPercentage: data.scrollPercentage || '50',
        time: data.time || '3',
        devices: data.devices || ['all'],
        mobileDevices: data.mobileDevices || 'all',
        limitFrequency: data.limitFrequency ?? true,
        popupFrequency: parseInt(data.popupFrequency) || 3,
        popupPeriod: data.popupPeriod || 'day',
        pageRules: data.pageRules || 'everyPage',
        subPageRules: data.subPageRules || 'homepage',
        scheduleRules: data.scheduleRules || (data.scheduleType === 'specificDates' ? 'schedule' : 'showAllTime'),
        everydaystartTime: data.everydaystartTime || '00:00',
        everydayendTime: data.everydayendTime || '23:59',
        endDate: data.endDate ? new Date(data.endDate) : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        endTime: data.endTime || '23:59',
        askForEmail: data.askForEmail ?? true,
        startImmediately: data.startImmediately ?? true,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        startTime: data.startTime || new Date().toTimeString().slice(0, 5),
        minPurchaseValue: data.minPurchaseValue || 0.0,
        purchaseType: data.purchaseType || 'both',
        maxUsesType: data.maxUsesType || 'total',
        maxTotalUses: parseInt(data.maxTotalUses) || 1,
        combineWithProductDiscounts: data.combineWithProductDiscounts ?? false,
        combineWithOrderDiscounts: data.combineWithOrderDiscounts ?? false,
        combineWithShippingDiscounts: data.combineWithShippingDiscounts ?? false,
        heading: data.heading || 'Get any product for just 798!',
        description: data.description || 'Monsoon Sale end soon',
        fields: data.fields || [{ label: 'Email', checked: true, type: 'email' }],
        primaryButton: data.primaryButton ?? true,
        primaryButtonText: data.primaryButtonText || 'Claim Discount Now',
        secondaryButton: data.secondaryButton ?? true,
        secondaryButtonText: data.secondaryButtonText || 'No Thanks',
        footerText: data.footerText || 'You are signing up to receive communication via email and can unsubscribe at any time.',
        sucessStatusHeading: data.sucessStatusHeading || 'Discount Unlocked 🎉',
        successDescription: data.successDescription || 'Thanks for subscribing. Copy your discount code and apply to your next order.',
        clickAction: data.clickAction || 'closeForm',
        buttonText: data.buttonText || 'Shop Now',
        stickyBarDescription: data.stickyBarDescription || "Don't forget to use your discount code",
        sidebarButtonText: data.sidebarButtonText || 'Get 25% OFF',
        template: data.template || 'minimalist',
        logo: data.logo || null,
        intentMultiplier: data.intentMultiplier ||5,
        alignment: data.alignment || 'center',
        cornerRadius: data.cornerRadius || 'standard',
        imagePosition: data.imagePosition || 'background',
        imageWidth:  data.imageWidth ? parseInt(data.imageWidth) : undefined || 20,
        backgroundImage: data.backgroundImage || null,
        backgroundOpacity: data.backgroundOpacity ? parseInt(data.backgroundOpacity) : 100,
        backgroundColor: data.backgroundColor || '#F4F6F8',
        textColor: data.textColor || '#202223',
        headingColor: data.headingColor || '#202223',
        descriptionColor: data.descriptionColor || '#6D7175',
        inputColor: data.inputColor || '#FFFFFF',
        consentColor: data.consentColor || '#202223',
        errorColor: data.errorColor || '#D82C0D',
        footerTextColor: data.footerTextColor || '#42474C',
        primaryButtonBackground: data.primaryButtonBackground || '#008060',
        primaryButtonTextColor: data.primaryButtonTextColor || '#FFFFFF',
        secondaryButtonBackground: data.secondaryButtonBackground || '#FFFFFF',
        secondaryButtonTextColor: data.secondaryButtonTextColor || '#008060',
        stickyDiscountBarBackground: data.stickyDiscountBarBackground || '#F4F6F8',
        stickyDiscountBarText: data.stickyDiscountBarText || '#202223',
        sidebarWidgetBackground: data.sidebarWidgetBackground || '#F4F6F8',
        sidebarWidgetTextColor: data.sidebarWidgetTextColor || '#202223',
        redirectUrl: data.redirectUrl || 'https://example.com',
        
        // Typography
        fontFamily: data.fontFamily || 'system',
        headingSize: data.headingSize ? parseInt(data.headingSize) : 18,
        bodySize: data.bodySize ? parseInt(data.bodySize) : 14,
        buttonSize: data.buttonSize ? parseInt(data.buttonSize) : 12,
        footerSize: data.footerSize ? parseInt(data.footerSize) : 11,
        
        status: true, // Set the status to true for the new/updated configuration
      };

      // Handle image uploads to GCP
      if (sanitizedData.logo && isBase64Image(sanitizedData.logo)) {
        try {
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
        } catch (error) {
          console.error('Failed to upload logo:', error);
          return json({ success: false, error: 'Failed to upload logo image' }, 500);
        }
      }

      if (sanitizedData.backgroundImage && isBase64Image(sanitizedData.backgroundImage)) {
        try {
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
        } catch (error) {
          console.error('Failed to upload background image:', error);
          return json({ success: false, error: 'Failed to upload background image' }, 500);
        }
      }

      let popupConfig;

      // Enforce Free plan limit: Free users can only have 1 active popup at a time
      // If creating/updating with status: true, deactivate other active popups for Free users
      if (sanitizedData.status === true) {
        await enforceFreePlanLimit(shopName);
      }

      if (request.method === 'POST') {
        // Create a new record in the database
        popupConfig = await prisma.popupConfiguration.create({
          data: {
            shopName,
            ...sanitizedData,
          },
        });
      } else if (request.method === 'PATCH') {
        // Update an existing record
        if (id === 0) {
          return json({ success: false, error: 'Invalid ID for update' }, 400);
        }

        popupConfig = await prisma.popupConfiguration.update({
          where: { id },
          data: sanitizedData,
        });
      }

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
            console.error('❌ Metafield update failed:', error);
          }
        }
        
      } catch (metafieldError) {
        console.error('Error updating metafields:', metafieldError);
        // Don't fail the request if metafield updates fail
      }

      // Return the created or updated popup configuration
      return json({ success: true, data: popupConfig }, request.method === 'POST' ? 201 : 200);
    } catch (error) {
      console.error(error);
      return json({ success: false, error: 'Failed to save popup configuration' }, 500);
    }
  } else {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }
}
