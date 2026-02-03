/**
 * Fee Service
 * Calculates swap fees based on contract/API and whitelist tier
 */

import { whitelistApi } from './mangoApi';
import chainConfig from './chainConfig';

// Fee structure: 3% total
const FEE_BREAKDOWN = {
    graphics: 0.01,      // 1%
    corporation: 0.01,  // 1%
    referral: 0.01,     // 1%
    total: 0.03,        // 3%
};

// Whitelist tier fee discounts
const TIER_FEE_DISCOUNTS = {
    'None': 1.0,        // No discount - 100% of fee (3%)
    'Standard': 1.0,    // No discount - 100% of fee (3%)
    'VIP': 0.5,        // 50% discount - 1.5% fee
    'Premium': 0.0,    // 100% exemption - 0% fee
};

/**
 * Get fee multiplier based on whitelist tier
 * @param {string} tier - Whitelist tier ('None', 'Standard', 'VIP', 'Premium')
 * @returns {number} Fee multiplier (0.0 to 1.0)
 */
export const getFeeMultiplier = (tier) => {
    return TIER_FEE_DISCOUNTS[tier] ?? 1.0;
};

/**
 * Calculate swap fee
 * @param {number} amount - Swap amount
 * @param {string} tier - Whitelist tier
 * @returns {Object} Fee breakdown
 */
export const calculateSwapFee = (amount, tier = 'None') => {
    const multiplier = getFeeMultiplier(tier);
    const baseFee = amount * FEE_BREAKDOWN.total;
    const actualFee = baseFee * multiplier;
    
    return {
        total: actualFee,
        graphics: actualFee * (FEE_BREAKDOWN.graphics / FEE_BREAKDOWN.total),
        corporation: actualFee * (FEE_BREAKDOWN.corporation / FEE_BREAKDOWN.total),
        referral: actualFee * (FEE_BREAKDOWN.referral / FEE_BREAKDOWN.total),
        baseFee: baseFee,
        discount: baseFee - actualFee,
        tier: tier,
        multiplier: multiplier,
    };
};

/**
 * Get fee breakdown with whitelist status
 * @param {number} amount - Swap amount
 * @param {string} address - User address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Object>} Fee breakdown with tier information
 */
export const getFeeBreakdown = async (amount, address, chainId) => {
    if (!address || !amount) {
        return calculateSwapFee(amount, 'None');
    }

    try {
        const whitelistStatus = await whitelistApi.getWhitelistStatus(address, chainId);
        const tier = whitelistStatus?.tier || 'None';
        return calculateSwapFee(amount, tier);
    } catch (error) {
        console.warn('Failed to fetch whitelist status, using default fee:', error);
        return calculateSwapFee(amount, 'None');
    }
};

/**
 * Format fee for display
 * @param {Object} feeBreakdown - Fee breakdown object
 * @param {string} tokenSymbol - Token symbol
 * @returns {Object} Formatted fee strings
 */
export const formatFeeForDisplay = (feeBreakdown, tokenSymbol) => {
    return {
        total: `${feeBreakdown.total.toFixed(6)} ${tokenSymbol}`,
        graphics: `${feeBreakdown.graphics.toFixed(6)} ${tokenSymbol}`,
        corporation: `${feeBreakdown.corporation.toFixed(6)} ${tokenSymbol}`,
        referral: `${feeBreakdown.referral.toFixed(6)} ${tokenSymbol}`,
        discount: feeBreakdown.discount > 0 
            ? `${feeBreakdown.discount.toFixed(6)} ${tokenSymbol}` 
            : null,
        tier: feeBreakdown.tier,
        multiplier: feeBreakdown.multiplier,
    };
};

export default {
    getFeeMultiplier,
    calculateSwapFee,
    getFeeBreakdown,
    formatFeeForDisplay,
};

