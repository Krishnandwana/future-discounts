import { json } from '@remix-run/node';
import prisma from '../db.server.js';

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const shopName = url.searchParams.get('shopName');

  if (!id || !shopName) {
    return json({ 
      success: false, 
      error: 'Popup ID and shop name are required' 
    }, { status: 400 });
  }

  try {
    // Fetch the popup configuration
    const popupConfig = await prisma.popupConfiguration.findFirst({
      where: {
        id: parseInt(id),
        shopName: shopName,
        status: true, // Only return active popups
      },
    });

    if (!popupConfig) {
      return json({ 
        success: false, 
        error: 'Active popup configuration not found' 
      }, { status: 404 });
    }

    // Return the popup configuration in the expected format
    return json({ 
      success: true, 
      data: [popupConfig] // Wrap in array to match expected format
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching popup configuration:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};