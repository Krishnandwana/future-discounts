import prisma from '../db.server.js';

/**
 * Check if a shop is on Free plan
 * @param {string} shopName - The shop name
 * @returns {Promise<boolean>} True if shop is on Free plan
 */
export async function isFreePlan(shopName) {
  try {
    const billing = await prisma.billingDetails.findFirst({
      where: { 
        shopName,
        status: true
      },
      select: { plan: true }
    });

    // If no billing record, assume Free plan
    if (!billing) {
      return true;
    }

    return billing.plan === 'Free';
  } catch (error) {
    console.error('Error checking plan:', error);
    // Default to Free plan on error to be safe
    return true;
  }
}

/**
 * Enforce single active popup limit for Free plan users
 * If user is on Free plan and activating a popup, deactivate all other active popups
 * @param {string} shopName - The shop name
 * @param {number} currentPopupId - The popup being activated (to exclude from deactivation)
 * @returns {Promise<number>} Number of popups deactivated
 */
export async function enforceFreePlanLimit(shopName, currentPopupId = null) {
  try {
    const isFree = await isFreePlan(shopName);
    
    if (!isFree) {
      // Paid plans can have multiple active popups
      return 0;
    }

    // For Free plan, ensure only 1 active popup
    const activePopups = await prisma.popupConfiguration.findMany({
      where: {
        shopName,
        status: true
      },
      select: { id: true }
    });

    // If activating a specific popup, exclude it from deactivation
    const popupsToDeactivate = currentPopupId
      ? activePopups.filter(p => p.id !== currentPopupId)
      : activePopups;

    // If there are other active popups, deactivate them
    if (popupsToDeactivate.length > 0) {
      await prisma.popupConfiguration.updateMany({
        where: {
          shopName,
          id: { in: popupsToDeactivate.map(p => p.id) },
          status: true
        },
        data: {
          status: false
        }
      });

      console.log(`🆓 Free plan limit enforced: Deactivated ${popupsToDeactivate.length} popup(s) for shop ${shopName}`);
      return popupsToDeactivate.length;
    }

    return 0;
  } catch (error) {
    console.error('Error enforcing Free plan limit:', error);
    return 0;
  }
}
