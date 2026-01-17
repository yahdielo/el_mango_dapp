/**
 * Slippage Utility Functions
 * 
 * Provides utilities for converting slippage tolerance between percentage and basis points.
 * The contract expects slippage in basis points (10000 = 100%), while ChainConfigService
 * returns slippage as a percentage (0.5 = 0.5%).
 */

/**
 * Convert slippage percentage to basis points
 * @param {number} slippagePercent - Slippage as percentage (e.g., 0.5 for 0.5%)
 * @returns {bigint} Slippage in basis points (e.g., 50 for 0.5%)
 * 
 * @example
 * convertPercentageToBasisPoints(0.5) // Returns 50n (0.5% = 50 basis points)
 * convertPercentageToBasisPoints(1.0) // Returns 100n (1% = 100 basis points)
 * convertPercentageToBasisPoints(5.0) // Returns 500n (5% = 500 basis points)
 */
export function convertPercentageToBasisPoints(slippagePercent) {
    if (typeof slippagePercent !== 'number' || isNaN(slippagePercent)) {
        throw new Error('Slippage percentage must be a valid number');
    }
    
    // Convert percentage to basis points: 0.5% * 100 = 50 basis points
    // Contract uses BASIS_POINTS = 10000, so 50 basis points = 0.5%
    return BigInt(Math.round(slippagePercent * 100));
}

/**
 * Convert basis points to slippage percentage
 * @param {bigint|number} basisPoints - Slippage in basis points (e.g., 50 for 0.5%)
 * @returns {number} Slippage as percentage (e.g., 0.5 for 0.5%)
 * 
 * @example
 * convertBasisPointsToPercentage(50n) // Returns 0.5 (50 basis points = 0.5%)
 * convertBasisPointsToPercentage(100n) // Returns 1.0 (100 basis points = 1%)
 */
export function convertBasisPointsToPercentage(basisPoints) {
    const bp = typeof basisPoints === 'bigint' ? Number(basisPoints) : basisPoints;
    if (typeof bp !== 'number' || isNaN(bp)) {
        throw new Error('Basis points must be a valid number');
    }
    
    // Convert basis points to percentage: 50 / 100 = 0.5%
    return bp / 100;
}

/**
 * Calculate minimum amount out based on expected amount and slippage tolerance
 * Formula: minAmountOut = expectedAmountOut * (1 - slippageTolerance / 10000)
 * 
 * @param {bigint} expectedAmountOut - Expected output amount
 * @param {bigint} slippageToleranceBasisPoints - Slippage tolerance in basis points
 * @returns {bigint} Minimum amount out
 * 
 * @example
 * calculateMinAmountOut(1000n, 50n) // Returns 995n (0.5% slippage)
 * calculateMinAmountOut(1000n, 100n) // Returns 990n (1% slippage)
 */
export function calculateMinAmountOut(expectedAmountOut, slippageToleranceBasisPoints) {
    if (typeof expectedAmountOut !== 'bigint' || typeof slippageToleranceBasisPoints !== 'bigint') {
        throw new Error('Both parameters must be BigInt');
    }
    
    const BASIS_POINTS = 10000n;
    // minAmountOut = expectedAmountOut * (BASIS_POINTS - slippageTolerance) / BASIS_POINTS
    return (expectedAmountOut * (BASIS_POINTS - slippageToleranceBasisPoints)) / BASIS_POINTS;
}

/**
 * Get slippage tolerance in basis points from ChainConfigService
 * @param {number} chainId - Chain ID
 * @param {Object} chainConfig - ChainConfigService instance
 * @param {number} [customSlippage] - Optional custom slippage percentage to override default
 * @returns {bigint} Slippage tolerance in basis points
 */
export function getSlippageToleranceInBasisPoints(chainId, chainConfig, customSlippage = null) {
    if (!chainId || !chainConfig) {
        return 50n; // Default 0.5% = 50 basis points
    }
    
    const slippageSettings = chainConfig.getSlippageTolerance(chainId);
    const slippagePercent = customSlippage !== null 
        ? customSlippage 
        : (slippageSettings?.default || 0.5);
    
    return convertPercentageToBasisPoints(slippagePercent);
}

/**
 * Validate slippage tolerance
 * Contract constraints: MIN_SLIPPAGE_TOLERANCE = 50 (0.5%), MAX_SLIPPAGE_TOLERANCE = 1000 (10%)
 * 
 * @param {bigint} slippageToleranceBasisPoints - Slippage tolerance in basis points
 * @returns {Object} Validation result { isValid, message }
 */
export function validateSlippageTolerance(slippageToleranceBasisPoints) {
    const MIN_SLIPPAGE = 50n; // 0.5%
    const MAX_SLIPPAGE = 1000n; // 10%
    
    if (slippageToleranceBasisPoints < MIN_SLIPPAGE) {
        return {
            isValid: false,
            message: `Slippage tolerance too low. Minimum is ${MIN_SLIPPAGE} basis points (0.5%)`,
        };
    }
    
    if (slippageToleranceBasisPoints > MAX_SLIPPAGE) {
        return {
            isValid: false,
            message: `Slippage tolerance too high. Maximum is ${MAX_SLIPPAGE} basis points (10%)`,
        };
    }
    
    return {
        isValid: true,
        message: 'Slippage tolerance is valid',
    };
}

export default {
    convertPercentageToBasisPoints,
    convertBasisPointsToPercentage,
    calculateMinAmountOut,
    getSlippageToleranceInBasisPoints,
    validateSlippageTolerance,
};

