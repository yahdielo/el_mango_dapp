/**
 * Gas Estimation Utility
 * 
 * Provides gas estimation for different transaction types using ChainConfigService
 * for base gas settings and chain-specific requirements.
 */

import chainConfig from '../services/chainConfig';

/**
 * Transaction Types
 */
export const TRANSACTION_TYPES = {
    SWAP: 'swap',
    APPROVE: 'approve',
    TRANSFER: 'transfer',
    CROSS_CHAIN_SWAP: 'crossChainSwap',
    REFERRAL: 'referral',
};

/**
 * Base gas limits per transaction type (will be adjusted by chain)
 */
const BASE_GAS_LIMITS = {
    [TRANSACTION_TYPES.SWAP]: 300000,
    [TRANSACTION_TYPES.APPROVE]: 50000,
    [TRANSACTION_TYPES.TRANSFER]: 21000,
    [TRANSACTION_TYPES.CROSS_CHAIN_SWAP]: 500000,
    [TRANSACTION_TYPES.REFERRAL]: 100000,
};

/**
 * Chain-specific gas multipliers
 * Some chains require more gas due to complexity
 */
const CHAIN_GAS_MULTIPLIERS = {
    1: 1.2,      // Ethereum - higher gas
    10: 1.0,     // Optimism - L2, lower gas
    56: 1.0,     // BSC - similar to Ethereum
    137: 1.0,    // Polygon - L2, lower gas
    8453: 1.0,   // Base - L2, lower gas
    42161: 1.0,  // Arbitrum - L2, lower gas
    43114: 1.0,  // Avalanche - similar to Ethereum
};

/**
 * Estimate gas for a transaction
 * @param {number} chainId - Chain ID
 * @param {string} transactionType - Transaction type (from TRANSACTION_TYPES)
 * @param {Object} options - Additional options
 * @param {boolean} options.useChainConfig - Use chain config gas limit (default: true)
 * @param {number} options.customGasLimit - Custom gas limit override
 * @param {Object} options.publicClient - Public client for dynamic estimation (optional)
 * @param {Object} options.transactionParams - Transaction parameters for dynamic estimation
 * @returns {Promise<Object>} Gas estimation result
 */
export async function estimateGas(chainId, transactionType, options = {}) {
    const {
        useChainConfig = true,
        customGasLimit = null,
        publicClient = null,
        transactionParams = null,
    } = options;

    // Get chain-specific gas settings
    const gasSettings = chainConfig.getGasSettings(chainId);
    const chain = chainConfig.getChain(chainId);

    // Base gas limit from transaction type
    let estimatedGasLimit = BASE_GAS_LIMITS[transactionType] || 300000;

    // Apply chain-specific multiplier
    const multiplier = CHAIN_GAS_MULTIPLIERS[chainId] || 1.0;
    estimatedGasLimit = Math.floor(estimatedGasLimit * multiplier);

    // Use chain config gas limit if available and useChainConfig is true
    if (useChainConfig && gasSettings.gasLimit) {
        // Use chain config as base, but adjust for transaction type
        const baseLimit = gasSettings.gasLimit;
        const typeMultiplier = estimatedGasLimit / BASE_GAS_LIMITS[TRANSACTION_TYPES.SWAP];
        estimatedGasLimit = Math.floor(baseLimit * typeMultiplier);
    }

    // Custom gas limit override (allow 0 as valid value)
    if (customGasLimit !== null && customGasLimit !== undefined) {
        estimatedGasLimit = customGasLimit;
    }

    // Try dynamic estimation if publicClient and transactionParams are provided
    if (publicClient && transactionParams && chain?.type === 'EVM') {
        try {
            const dynamicEstimate = await publicClient.estimateGas(transactionParams);
            // Use dynamic estimate if it's higher than our base estimate
            if (dynamicEstimate > estimatedGasLimit) {
                estimatedGasLimit = Number(dynamicEstimate);
                // Add 20% buffer for safety
                estimatedGasLimit = Math.floor(estimatedGasLimit * 1.2);
            }
        } catch (error) {
            console.warn('Dynamic gas estimation failed, using static estimate:', error);
            // Fall back to static estimate
        }
    }

    // Build gas configuration
    const gasConfig = {
        gas: BigInt(estimatedGasLimit),
    };

    // Add gas price or maxFeePerGas based on chain settings
    if (gasSettings.gasPrice) {
        gasConfig.gasPrice = BigInt(gasSettings.gasPrice);
    } else if (gasSettings.maxFeePerGas || gasSettings.maxPriorityFeePerGas) {
        if (gasSettings.maxFeePerGas) {
            gasConfig.maxFeePerGas = BigInt(gasSettings.maxFeePerGas);
        }
        if (gasSettings.maxPriorityFeePerGas) {
            gasConfig.maxPriorityFeePerGas = BigInt(gasSettings.maxPriorityFeePerGas);
        }
    }

    return {
        gasLimit: estimatedGasLimit,
        gasConfig,
        gasSettings,
        chainName: chain?.chainName || 'Unknown',
        transactionType,
    };
}

/**
 * Get gas cost estimate in native token
 * @param {number} chainId - Chain ID
 * @param {number} gasLimit - Gas limit
 * @param {Object} options - Additional options
 * @param {Object} options.publicClient - Public client for gas price lookup
 * @returns {Promise<Object>} Gas cost estimate
 */
export async function estimateGasCost(chainId, gasLimit, options = {}) {
    const { publicClient = null } = options;
    const gasSettings = chainConfig.getGasSettings(chainId);
    const chain = chainConfig.getChain(chainId);

    let gasPrice = null;

    // Get current gas price from chain if publicClient is available
    if (publicClient && chain?.type === 'EVM') {
        try {
            const feeData = await publicClient.estimateFeesPerGas();
            gasPrice = feeData.maxFeePerGas || feeData.gasPrice || null;
        } catch (error) {
            console.warn('Failed to fetch current gas price:', error);
        }
    }

    // Fall back to chain config gas price
    if (gasPrice === null || gasPrice === undefined) {
        if (gasSettings.gasPrice !== null && gasSettings.gasPrice !== undefined) {
            gasPrice = BigInt(gasSettings.gasPrice);
        } else if (gasSettings.maxFeePerGas !== null && gasSettings.maxFeePerGas !== undefined) {
            gasPrice = BigInt(gasSettings.maxFeePerGas);
        }
    }

    // Check if gasPrice is null/undefined (not if it's BigInt(0), which is valid)
    if (gasPrice === null || gasPrice === undefined) {
        return {
            gasCost: null,
            gasCostFormatted: 'Unknown',
            gasPrice: null,
            error: 'Could not determine gas price',
        };
    }

    // Calculate gas cost
    const gasCost = BigInt(gasLimit) * gasPrice;
    const gasCostFormatted = formatGasCost(gasCost, chain?.nativeCurrency?.decimals || 18);

    return {
        gasCost,
        gasCostFormatted,
        gasPrice: Number(gasPrice),
        gasLimit,
        nativeCurrency: chain?.nativeCurrency?.symbol || 'ETH',
    };
}

/**
 * Format gas cost for display
 * @param {bigint} gasCost - Gas cost in wei
 * @param {number} decimals - Native currency decimals
 * @returns {string} Formatted gas cost
 */
function formatGasCost(gasCost, decimals = 18) {
    const divisor = BigInt(10 ** decimals);
    const whole = gasCost / divisor;
    const remainder = gasCost % divisor;
    
    if (remainder === 0n) {
        return whole.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmed = remainderStr.replace(/0+$/, '');
    
    if (trimmed === '') {
        return whole.toString();
    }
    
    return `${whole}.${trimmed}`;
}

/**
 * Handle gas estimation errors
 * @param {Error} error - Gas estimation error
 * @param {number} chainId - Chain ID
 * @returns {Object} Error information and recovery suggestion
 */
export function handleGasEstimationError(error, chainId) {
    const chain = chainConfig.getChain(chainId);
    const gasSettings = chainConfig.getGasSettings(chainId);

    let errorType = 'unknown';
    let message = error.message || 'Gas estimation failed';
    let recoverySuggestion = 'Try again or increase gas limit';

    // Parse common gas estimation errors
    if (message.includes('insufficient funds')) {
        errorType = 'insufficientFunds';
        message = 'Insufficient funds for gas';
        recoverySuggestion = 'Add more native token to your wallet';
    } else if (message.includes('execution reverted')) {
        errorType = 'executionReverted';
        message = 'Transaction would revert';
        recoverySuggestion = 'Check transaction parameters';
    } else if (message.includes('gas required exceeds allowance')) {
        errorType = 'gasExceedsAllowance';
        message = 'Gas limit too low';
        recoverySuggestion = `Try increasing gas limit to ${gasSettings.gasLimit * 1.5}`;
    }

    return {
        errorType,
        message,
        recoverySuggestion,
        chainName: chain?.chainName || 'Unknown',
        defaultGasLimit: gasSettings.gasLimit,
    };
}

/**
 * Get recommended gas limit for transaction type
 * @param {number} chainId - Chain ID
 * @param {string} transactionType - Transaction type
 * @returns {number} Recommended gas limit
 */
export function getRecommendedGasLimit(chainId, transactionType) {
    const gasSettings = chainConfig.getGasSettings(chainId);
    const baseLimit = BASE_GAS_LIMITS[transactionType] || 300000;
    const multiplier = CHAIN_GAS_MULTIPLIERS[chainId] || 1.0;
    
    let recommended = Math.floor(baseLimit * multiplier);
    
    // Use chain config as base if available
    if (gasSettings.gasLimit) {
        const typeMultiplier = baseLimit / BASE_GAS_LIMITS[TRANSACTION_TYPES.SWAP];
        recommended = Math.floor(gasSettings.gasLimit * typeMultiplier);
    }
    
    return recommended;
}

export default {
    estimateGas,
    estimateGasCost,
    handleGasEstimationError,
    getRecommendedGasLimit,
    TRANSACTION_TYPES,
};

