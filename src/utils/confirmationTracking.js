/**
 * Confirmation Tracking Utility
 * 
 * Tracks transaction confirmations per chain and calculates estimated completion time.
 * Uses ChainConfigService for confirmation requirements and block times.
 */

import chainConfig from '../services/chainConfig';

/**
 * Calculate estimated time to completion based on remaining confirmations
 * @param {number} chainId - Chain ID
 * @param {number} currentConfirmations - Current number of confirmations
 * @param {number} requiredConfirmations - Required number of confirmations
 * @returns {number} Estimated seconds until completion
 */
export function calculateEstimatedTime(chainId, currentConfirmations, requiredConfirmations) {
    if (chainId === null || chainId === undefined || currentConfirmations >= requiredConfirmations) {
        return 0;
    }

    const blockTime = chainConfig.getBlockTime(chainId);
    const remainingConfirmations = requiredConfirmations - currentConfirmations;
    
    // Estimated time = remaining confirmations * block time
    return remainingConfirmations * blockTime;
}

/**
 * Format estimated time as human-readable string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatEstimatedTime(seconds) {
    if (!seconds || seconds <= 0) {
        return 'Complete';
    }

    if (seconds < 60) {
        return `${Math.ceil(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        return remainingSeconds > 0 
            ? `${minutes}m ${Math.ceil(remainingSeconds)}s`
            : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
}

/**
 * Get confirmation progress percentage
 * @param {number} currentConfirmations - Current number of confirmations
 * @param {number} requiredConfirmations - Required number of confirmations
 * @returns {number} Progress percentage (0-100)
 */
export function getConfirmationProgress(currentConfirmations, requiredConfirmations) {
    if (!requiredConfirmations || requiredConfirmations === 0) {
        return 100;
    }

    const progress = (currentConfirmations / requiredConfirmations) * 100;
    return Math.min(Math.max(progress, 0), 100);
}

/**
 * Get confirmation status message
 * @param {number} chainId - Chain ID
 * @param {number} currentConfirmations - Current number of confirmations
 * @param {number} requiredConfirmations - Required number of confirmations
 * @returns {Object} Status object with message and variant
 */
export function getConfirmationStatus(chainId, currentConfirmations, requiredConfirmations) {
    const chain = chainConfig.getChain(chainId);
    const chainName = chain?.chainName || 'this chain';

    if (currentConfirmations >= requiredConfirmations) {
        return {
            message: `Confirmed (${currentConfirmations}/${requiredConfirmations})`,
            variant: 'success',
            isComplete: true,
        };
    }

    if (currentConfirmations === 0) {
        return {
            message: `Waiting for confirmations on ${chainName} (0/${requiredConfirmations})`,
            variant: 'warning',
            isComplete: false,
        };
    }

    const remaining = requiredConfirmations - currentConfirmations;
    const estimatedTime = calculateEstimatedTime(chainId, currentConfirmations, requiredConfirmations);
    const formattedTime = formatEstimatedTime(estimatedTime);

    return {
        message: `Confirming on ${chainName} (${currentConfirmations}/${requiredConfirmations}) - ~${formattedTime} remaining`,
        variant: 'info',
        isComplete: false,
        remainingConfirmations: remaining,
        estimatedTime,
    };
}

/**
 * Track confirmation progress for a transaction
 * @param {number} chainId - Chain ID
 * @param {number} currentConfirmations - Current number of confirmations
 * @returns {Object} Confirmation tracking data
 */
export function trackConfirmations(chainId, currentConfirmations) {
    if (chainId === null || chainId === undefined) {
        return {
            current: 0,
            required: 1,
            progress: 0,
            estimatedTime: 0,
            isComplete: false,
            status: {
                message: 'Chain ID required',
                variant: 'secondary',
                isComplete: false,
            },
        };
    }

    const requiredConfirmations = chainConfig.getConfirmationsRequired(chainId);
    const blockTime = chainConfig.getBlockTime(chainId);
    const progress = getConfirmationProgress(currentConfirmations, requiredConfirmations);
    const estimatedTime = calculateEstimatedTime(chainId, currentConfirmations, requiredConfirmations);
    const status = getConfirmationStatus(chainId, currentConfirmations, requiredConfirmations);

    return {
        current: currentConfirmations,
        required: requiredConfirmations,
        progress,
        estimatedTime,
        formattedEstimatedTime: formatEstimatedTime(estimatedTime),
        blockTime,
        status,
        isComplete: currentConfirmations >= requiredConfirmations,
    };
}

/**
 * Get confirmation requirements for a chain
 * @param {number} chainId - Chain ID
 * @returns {Object} Confirmation requirements
 */
export function getConfirmationRequirements(chainId) {
    if (chainId === null || chainId === undefined) {
        return {
            required: 1,
            blockTime: 2,
        };
    }

    const chain = chainConfig.getChain(chainId);
    return {
        required: chainConfig.getConfirmationsRequired(chainId),
        blockTime: chainConfig.getBlockTime(chainId),
        chain: chain || null, // Ensure chain property exists even if getChain returns null
    };
}

/**
 * Calculate total time for required confirmations
 * @param {number} chainId - Chain ID
 * @returns {number} Total time in seconds
 */
export function getTotalConfirmationTime(chainId) {
    if (chainId === null || chainId === undefined) {
        return 2; // Default 2 seconds
    }

    const required = chainConfig.getConfirmationsRequired(chainId);
    const blockTime = chainConfig.getBlockTime(chainId);
    return required * blockTime;
}

export default {
    calculateEstimatedTime,
    formatEstimatedTime,
    getConfirmationProgress,
    getConfirmationStatus,
    trackConfirmations,
    getConfirmationRequirements,
    getTotalConfirmationTime,
};

