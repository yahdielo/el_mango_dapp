/**
 * Slippage Validation Utilities
 * Validates slippage tolerance and calculates price impact warnings
 */

import chainConfig from '../services/chainConfig';
import { getSlippageToleranceInBasisPoints } from './slippageUtils';

// Slippage warning thresholds
const SLIPPAGE_WARNING_THRESHOLD = 1.0; // 1% - show warning
const SLIPPAGE_DANGER_THRESHOLD = 3.0; // 3% - show danger warning
const PRICE_IMPACT_WARNING_THRESHOLD = 1.0; // 1% price impact
const PRICE_IMPACT_DANGER_THRESHOLD = 3.0; // 3% price impact

/**
 * Validate slippage tolerance
 * @param {number} slippagePercent - Slippage percentage (e.g., 0.5 for 0.5%)
 * @param {number} chainId - Chain ID
 * @returns {Object} Validation result
 */
export const validateSlippage = (slippagePercent, chainId) => {
    const slippageSettings = chainConfig.getSlippageTolerance(chainId);
    const min = slippageSettings?.min || 0.1;
    const max = slippageSettings?.max || 5.0;
    
    if (slippagePercent < min) {
        return {
            isValid: false,
            severity: 'error',
            message: `Slippage tolerance must be at least ${min}%`,
        };
    }
    
    if (slippagePercent > max) {
        return {
            isValid: false,
            severity: 'error',
            message: `Slippage tolerance cannot exceed ${max}%`,
        };
    }
    
    if (slippagePercent >= SLIPPAGE_DANGER_THRESHOLD) {
        return {
            isValid: true,
            severity: 'danger',
            message: `High slippage tolerance (${slippagePercent}%). Your trade may execute at a significantly worse price.`,
        };
    }
    
    if (slippagePercent >= SLIPPAGE_WARNING_THRESHOLD) {
        return {
            isValid: true,
            severity: 'warning',
            message: `Slippage tolerance is ${slippagePercent}%. Consider using a lower value for better price protection.`,
        };
    }
    
    return {
        isValid: true,
        severity: 'info',
        message: null,
    };
};

/**
 * Validate price impact
 * @param {number} priceImpact - Price impact percentage
 * @returns {Object} Validation result
 */
export const validatePriceImpact = (priceImpact) => {
    if (priceImpact >= PRICE_IMPACT_DANGER_THRESHOLD) {
        return {
            isValid: false,
            severity: 'danger',
            message: `High price impact (${priceImpact.toFixed(2)}%). This trade will significantly move the market price.`,
        };
    }
    
    if (priceImpact >= PRICE_IMPACT_WARNING_THRESHOLD) {
        return {
            isValid: true,
            severity: 'warning',
            message: `Price impact is ${priceImpact.toFixed(2)}%. Consider splitting your trade into smaller amounts.`,
        };
    }
    
    return {
        isValid: true,
        severity: 'info',
        message: null,
    };
};

/**
 * Check if slippage will be exceeded
 * @param {number} expectedAmountOut - Expected output amount
 * @param {number} minAmountOut - Minimum output amount (from contract)
 * @param {number} slippageTolerance - Slippage tolerance in basis points
 * @returns {Object} Validation result
 */
export const checkSlippageExceeded = (expectedAmountOut, minAmountOut, slippageTolerance) => {
    if (!expectedAmountOut || !minAmountOut) {
        return {
            exceeded: false,
            message: null,
        };
    }
    
    const actualSlippage = ((expectedAmountOut - minAmountOut) / expectedAmountOut) * 100;
    const tolerancePercent = Number(slippageTolerance) / 100;
    
    if (actualSlippage > tolerancePercent) {
        return {
            exceeded: true,
            actualSlippage: actualSlippage.toFixed(2),
            tolerance: tolerancePercent.toFixed(2),
            message: `Slippage exceeded: ${actualSlippage.toFixed(2)}% > ${tolerancePercent.toFixed(2)}%`,
        };
    }
    
    return {
        exceeded: false,
        actualSlippage: actualSlippage.toFixed(2),
        tolerance: tolerancePercent.toFixed(2),
        message: null,
    };
};

/**
 * Get slippage warning message
 * @param {number} slippagePercent - Slippage percentage
 * @param {number} chainId - Chain ID
 * @returns {string|null} Warning message or null
 */
export const getSlippageWarning = (slippagePercent, chainId) => {
    const validation = validateSlippage(slippagePercent, chainId);
    return validation.message;
};

/**
 * Get recommended slippage tolerance
 * @param {number} chainId - Chain ID
 * @param {number} priceImpact - Optional: price impact percentage
 * @returns {number} Recommended slippage percentage
 */
export const getRecommendedSlippage = (chainId, priceImpact = 0) => {
    const slippageSettings = chainConfig.getSlippageTolerance(chainId);
    const defaultSlippage = slippageSettings?.default || 0.5;
    
    // If price impact is high, recommend higher slippage
    if (priceImpact > PRICE_IMPACT_DANGER_THRESHOLD) {
        return Math.min(defaultSlippage * 2, slippageSettings?.max || 5.0);
    }
    
    if (priceImpact > PRICE_IMPACT_WARNING_THRESHOLD) {
        return Math.min(defaultSlippage * 1.5, slippageSettings?.max || 5.0);
    }
    
    return defaultSlippage;
};

export default {
    validateSlippage,
    validatePriceImpact,
    checkSlippageExceeded,
    getSlippageWarning,
    getRecommendedSlippage,
};

