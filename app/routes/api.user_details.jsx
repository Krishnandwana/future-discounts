import { json } from '@remix-run/node';
import prisma from '../db.server.js';

// Function to get shop name based on access token
async function getShopNameByAccessToken(accessToken) {
  const session = await prisma.session.findFirst({
    where: { accessToken },
    select: { shop: true },
  });
  if (!session) {
    throw new Error('Invalid access token');
  }
  return session.shop;
}

// Function to get coupons and user data, filtered by shop name and grouped by popupConfigId
async function getCouponsGroupedByPopup(shopName) {
  // Get all popup IDs for this shop (existing popups) for discount name lookup
  const shopPopupIds = await prisma.popupConfiguration.findMany({
    where: { shopName },
    select: { id: true, discountName: true }
  });
  
  const popupIdMap = new Map(shopPopupIds.map(p => [p.id, p.discountName]));

  // Query ALL coupons for this shop, including those from deleted popups
  // Now that Coupon has shopName field, we can query directly by shopName
  const coupons = await prisma.coupon.findMany({
    where: {
      shopName, // Query by shopName to include coupons from deleted popups
    },
    include: {
      popupConfig: {
        select: {
          discountName: true,
        },
      },
    },
  });

  // Group coupons by popupConfigId
  const groupedCoupons = coupons.reduce((acc, coupon) => {
    const popupId = coupon.popupConfigId;

    if (!acc[popupId]) {
      // Get discount name from popupConfig if it exists, or from our map, or use a default
      const discountName = coupon.popupConfig?.discountName 
        || popupIdMap.get(popupId) 
        || `Deleted Popup (${popupId?.substring(0, 8) || 'Unknown'})`;
      
      acc[popupId] = {
        discountName,
        coupons: [],
        userDataFields: new Set(),
      };
    }

    acc[popupId].coupons.push(coupon);

    // Collect all userData field names for consistent CSV columns
    const userData = coupon.userData || {};
    Object.keys(userData).forEach((field) => {
      acc[popupId].userDataFields.add(field);
    });

    return acc;
  }, {});

  // Prepare the result array
  const result = Object.keys(groupedCoupons).map((popupId) => {
    const group = groupedCoupons[popupId];
    const userDataFields = Array.from(group.userDataFields);

    // Prepare data suitable for CSV output
    const csvData = group.coupons.map((coupon) => {
      const row = {
        couponCode: coupon.couponCode,
        generatedAt: coupon.generatedAt,
        ...coupon.userData, // Include userData fields
      };

      // Ensure all fields are present for CSV consistency
      userDataFields.forEach((field) => {
        if (!(field in row)) {
          row[field] = '';
        }
      });

      return row;
    });

    return {
      popupConfigId: popupId,
      discountName: group.discountName,
      userDataFields,
      csvData,
    };
  });

  return result;
}

// API endpoint with access token verification for GET request
export async function loader({ request }) {
  try {
    const accessToken = request.headers.get('access_token');
    if (!accessToken) {
      return json(
        { success: false, error: 'Access token is required' },
        { status: 401 }
      );
    }

    // Get shop name based on access token
    const shopName = await getShopNameByAccessToken(accessToken);

    // Fetch data only for the authenticated shop
    const data = await getCouponsGroupedByPopup(shopName);

    return json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
