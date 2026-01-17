/**
 * Retry Utility
 * 
 * Implements retry logic with exponential backoff and chain-specific retry settings.
 * Uses ChainConfigService for timeout and retry configuration.
 */

import chainConfig from '../services/chainConfig';

/**
 * Error types that should trigger retry
 */
export const RETRYABLE_ERRORS = {
    NETWORK_ERROR: 'networkError',
    TIMEOUT: 'timeout',
    RPC_ERROR: 'rpcError',
    RATE_LIMITED: 'rateLimited',
    SERVER_ERROR: 'serverError',
};

/**
 * Error types that should NOT trigger retry
 */
export const NON_RETRYABLE_ERRORS = {
    USER_REJECTED: 'userRejected',
    INVALID_ADDRESS: 'invalidAddress',
    INSUFFICIENT_BALANCE: 'insufficientBalance',
    VALIDATION_ERROR: 'validationError',
};

/**
 * Check if an error is retryable
 * @param {Error} error - Error object
 * @param {number} chainId - Chain ID (optional)
 * @returns {boolean} True if error is retryable
 */
export function isRetryableError(error, chainId = null) {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.response?.status;

    // Check for non-retryable errors first
    if (errorMessage.includes('user rejected') ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user cancelled')) {
        return false;
    }

    if (errorMessage.includes('insufficient balance') ||
        errorMessage.includes('insufficient funds')) {
        return false;
    }

    if (errorMessage.includes('invalid address') ||
        errorMessage.includes('invalid format')) {
        return false;
    }

    // Check for retryable errors
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        errorCode === 'ECONNABORTED' ||
        errorCode === 'ETIMEDOUT') {
        return true;
    }

    if (errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch failed')) {
        return true;
    }

    if (errorCode === 429 || // Rate limited
        errorCode === 503 || // Service unavailable
        errorCode === 502 || // Bad gateway
        errorCode === 504) { // Gateway timeout
        return true;
    }

    // Default: retry on network/timeout errors, don't retry on others
    return errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT';
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoffDelay(attempt, baseDelay = 1000, maxDelay = 30000) {
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry (must return a Promise)
 * @param {Object} options - Retry options
 * @param {number} options.chainId - Chain ID for chain-specific settings
 * @param {number} options.maxRetries - Maximum number of retries (default: from ChainConfigService)
 * @param {number} options.baseDelay - Base delay for exponential backoff (default: from ChainConfigService)
 * @param {number} options.maxDelay - Maximum delay (default: 30000ms)
 * @param {Function} options.shouldRetry - Custom function to determine if error is retryable
 * @param {Function} options.onRetry - Callback called before each retry
 * @param {Function} options.onError - Callback called on each error
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
    const {
        chainId = null,
        maxRetries = null,
        baseDelay = null,
        maxDelay = 30000,
        shouldRetry = null,
        onRetry = null,
        onError = null,
    } = options;

    // Get chain-specific retry settings
    let retryAttempts = maxRetries;
    let retryDelay = baseDelay;

    if (chainId) {
        const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
        if (retryAttempts === null) {
            retryAttempts = timeoutSettings.retryAttempts || 3;
        }
        if (retryDelay === null) {
            retryDelay = timeoutSettings.retryDelay || 1000;
        }
    } else {
        retryAttempts = retryAttempts || 3;
        retryDelay = retryDelay || 1000;
    }

    let lastError = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Call error callback if provided
            if (onError) {
                onError(error, attempt, retryAttempts);
            }

            // Check if we should retry
            const shouldRetryError = shouldRetry
                ? shouldRetry(error, attempt)
                : isRetryableError(error, chainId);

            if (!shouldRetryError || attempt >= retryAttempts) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = calculateBackoffDelay(attempt, retryDelay, maxDelay);

            // Call retry callback if provided
            if (onRetry) {
                onRetry(attempt + 1, retryAttempts, delay, error);
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Retry with timeout
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry and timeout options
 * @param {number} options.chainId - Chain ID for chain-specific settings
 * @param {number} options.timeout - Timeout in milliseconds (default: from ChainConfigService)
 * @param {number} options.maxRetries - Maximum retries (default: from ChainConfigService)
 * @param {number} options.baseDelay - Base delay (default: from ChainConfigService)
 * @returns {Promise} Result of the function
 */
export async function retryWithTimeout(fn, options = {}) {
    const {
        chainId = null,
        timeout = null,
        maxRetries = null,
        baseDelay = null,
    } = options;

    // Get chain-specific timeout settings
    let timeoutMs = timeout;

    if (chainId && timeoutMs === null) {
        const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
        // Use RPC timeout for API calls, transaction timeout for transactions
        timeoutMs = timeoutSettings.rpcTimeout || timeoutSettings.transactionTimeout || 10000;
    } else {
        timeoutMs = timeoutMs || 10000;
    }

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    // Race between the function and timeout
    return Promise.race([
        retryWithBackoff(fn, { chainId, maxRetries, baseDelay }),
        timeoutPromise,
    ]);
}

/**
 * Retry with chain-specific settings
 * @param {Function} fn - Function to retry
 * @param {number} chainId - Chain ID
 * @param {Object} options - Additional options
 * @returns {Promise} Result of the function
 */
export async function retryForChain(fn, chainId, options = {}) {
    const timeoutSettings = chainConfig.getTimeoutSettings(chainId);

    return retryWithBackoff(fn, {
        chainId,
        maxRetries: options.maxRetries || timeoutSettings.retryAttempts,
        baseDelay: options.baseDelay || timeoutSettings.retryDelay,
        maxDelay: options.maxDelay || 30000,
        shouldRetry: options.shouldRetry,
        onRetry: options.onRetry,
        onError: options.onError,
    });
}

/**
 * Create a retryable API call wrapper
 * @param {Function} apiCall - API call function
 * @param {number} chainId - Chain ID (optional)
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped API call with retry logic
 */
export function createRetryableApiCall(apiCall, chainId = null, options = {}) {
    return async (...args) => {
        return retryWithTimeout(
            () => apiCall(...args),
            {
                chainId,
                ...options,
            }
        );
    };
}

export default {
    retryWithBackoff,
    retryWithTimeout,
    retryForChain,
    createRetryableApiCall,
    isRetryableError,
    calculateBackoffDelay,
    RETRYABLE_ERRORS,
    NON_RETRYABLE_ERRORS,
};

