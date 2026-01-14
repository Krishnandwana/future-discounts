import prisma from '../db.server';
import { getPlanDetails } from '../config/planUtils';
import { PLANS } from '../config/plans';

/**
 * Calculates the start date of the current monthly usage cycle.
 * 
 * @param {Object} billingRecord - The shop's billing record from prisma
 * @returns {Date} The date when the current month's usage counting should begin
 */
export function getUsageCycleStartDate(billingRecord) {
    const now = new Date();

    // Default for Free plan (or if no billing start date is found)
    // We use the 1st of the current month as the reset day
    if (!billingRecord || !billingRecord.startDate) {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startDate = new Date(billingRecord.startDate);
    const dayOfMonth = startDate.getDate();

    // Create a candidate for this month's anniversary
    let cycleStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);

    // If the day doesn't exist in the current month (e.g., 31st in a 30-day month),
    // Date constructor will wrap it to the next month. We need to cap it.
    if (cycleStart.getMonth() !== now.getMonth()) {
        cycleStart = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    }

    // If the computed anniversary is in the future, the cycle started last month
    if (cycleStart > now) {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth);

        // Again, cap it for shorter months
        if (cycleStart.getDate() !== dayOfMonth) {
            cycleStart = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
        }
    }

    return cycleStart;
}

/**
 * Gets the total interaction count for the current monthly cycle.
 * 
 * @param {string} shopName - The shop name
 * @returns {Promise<number>} The total count of interactions in the current cycle
 */
export async function getMonthlyUsageCount(shopName) {
    // Get billing details to find the cycle start date
    const billing = await prisma.billingDetails.findFirst({
        where: { shopName, status: true }
    });

    const cycleStart = getUsageCycleStartDate(billing);

    const count = await prisma.popupInteraction.count({
        where: {
            shopName,
            createdAt: {
                gte: cycleStart
            }
        }
    });

    return count;
}

/**
 * Gets the current usage and limit for a shop.
 * 
 * @param {string} shopName - The shop name
 * @returns {Promise<Object>} { used, limit, plan, cycleStart }
 */
export async function getShopUsageLimits(shopName) {
    const billing = await prisma.billingDetails.findFirst({
        where: { shopName, status: true }
    });

    const currentPlan = billing?.plan || 'Free';
    const currentCycle = billing?.billingCycle?.toLowerCase() || 'monthly';

    const cycleStart = getUsageCycleStartDate(billing);
    const used = await prisma.popupInteraction.count({
        where: {
            shopName,
            createdAt: { gte: cycleStart }
        }
    });

    const limit = currentPlan === 'Free'
        ? PLANS.Free.viewLimit
        : getPlanDetails(currentPlan, currentCycle).viewLimit;

    return {
        used,
        limit,
        plan: currentPlan,
        cycleStart,
        requiresUpgrade: used >= limit
    };
}
