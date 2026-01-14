import { json } from '@remix-run/node';
import prisma from '../db.server';

export const action = async ({ request }) => {
  try {
    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405);
    }

    const data = await request.json();
    const { 
      shopName, 
      popupConfigId, 
      eventType, 
      ipAddress, 
      location, 
      city,
      userAgent,
      reason 
    } = data;

    // Validate required fields
    if (!shopName || !eventType || !ipAddress) {
      return json({ 
        success: false, 
        error: 'Missing required fields: shopName, eventType, ipAddress' 
      }, 400);
    }

    console.log(`📊 [Analytics] Tracking ${eventType} event`, {
      shopName,
      popupConfigId,
      ipAddress: ipAddress.substring(0, 8) + '***', // Mask IP for logging
      location,
      city,
      reason
    });

    // Determine if IP should be masked (for privacy)
    const isPrivateIP = ipAddress.startsWith('192.168.') || 
                       ipAddress.startsWith('10.') || 
                       ipAddress.startsWith('127.') ||
                       ipAddress === '::1';

    const locationData = location || city || 'Unknown';
    const cityData = city || location || 'Unknown';

    // Handle different event types
    switch (eventType) {
      case 'view': {
        // Popup was shown to user
        console.log(`📈 [Analytics] Recording view`);
        
        // Update PopupAnalytics - increment viewCount
        await prisma.popupAnalytics.upsert({
          where: {
            popupConfigId_city: {
              popupConfigId: popupConfigId || 'unknown',
              city: cityData
            }
          },
          update: {
            viewCount: { increment: 1 },
            updatedAt: new Date()
          },
          create: {
            shopName,
            popupConfigId: popupConfigId || null,
            city: cityData,
            viewCount: 1,
            availCount: 0
          }
        });

        // Create PopupInteraction record
        await prisma.popupInteraction.create({
          data: {
            shopName,
            popupConfigId: popupConfigId || null,
            ipAddress,
            location: locationData,
            viewed: true,
            availed: false,
            masked: isPrivateIP
          }
        });

        break;
      }

      case 'conversion': {
        // User claimed the discount
        console.log(`📈 [Analytics] Recording conversion`);
        
        // Update PopupAnalytics - increment availCount
        await prisma.popupAnalytics.upsert({
          where: {
            popupConfigId_city: {
              popupConfigId: popupConfigId || 'unknown',
              city: cityData
            }
          },
          update: {
            availCount: { increment: 1 },
            updatedAt: new Date()
          },
          create: {
            shopName,
            popupConfigId: popupConfigId || null,
            city: cityData,
            viewCount: 0,
            availCount: 1
          }
        });

        // Update the existing PopupInteraction to mark as availed
        // Find the most recent interaction for this IP and popup
        const recentInteraction = await prisma.popupInteraction.findFirst({
          where: {
            shopName,
            popupConfigId: popupConfigId || null,
            ipAddress,
            viewed: true,
            availed: false
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (recentInteraction) {
          await prisma.popupInteraction.update({
            where: { id: recentInteraction.id },
            data: { availed: true }
          });
        } else {
          // Create new interaction if none found (shouldn't happen normally)
          await prisma.popupInteraction.create({
            data: {
              shopName,
              popupConfigId: popupConfigId || null,
              ipAddress,
              location: locationData,
              viewed: true,
              availed: true,
              masked: isPrivateIP
            }
          });
        }

        break;
      }

      default: {
        return json({ 
          success: false, 
          error: `Unknown event type: ${eventType}. Supported types: view, conversion` 
        }, 400);
      }
    }

    console.log(`✅ [Analytics] Successfully tracked ${eventType} event`);

    return json({ 
      success: true, 
      message: `${eventType} event tracked successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Analytics] Error tracking popup event:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
};