/**
 * Chain-Specific Error Handling Utility
 * 
 * Maps chain-specific error codes, provides user-friendly error messages,
 * handles network-specific errors, implements error recovery strategies,
 * and logs errors for monitoring.
 * Uses ChainConfigService for chain information and error messages.
 */

import chainConfig from '../services/chainConfig';

/**
 * Error Types
 */
export const ERROR_TYPES = {
    NETWORK_ERROR: 'networkError',
    TRANSACTION_FAILED: 'transactionFailed',
    INSUFFICIENT_BALANCE: 'insufficientBalance',
    USER_REJECTED: 'userRejected',
    TIMEOUT: 'timeout',
    INVALID_ADDRESS: 'invalidAddress',
    RPC_ERROR: 'rpcError',
    UNSUPPORTED_CHAIN: 'unsupportedChain',
    CONTRACT_NOT_FOUND: 'contractNotFound',
    GAS_ESTIMATION_FAILED: 'gasEstimationFailed',
    RATE_LIMITED: 'rateLimited',
    NONCE_TOO_LOW: 'nonceTooLow',
    NONCE_TOO_HIGH: 'nonceTooHigh',
    GAS_PRICE_TOO_LOW: 'gasPriceTooLow',
    EXECUTION_REVERTED: 'executionReverted',
    INSUFFICIENT_FUNDS: 'insufficientFunds',
};

/**
 * Error Severity Levels
 */
export const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};

/**
 * EVM Error Code Mappings
 */
const EVM_ERROR_CODES = {
    // Execution errors
    '-32000': ERROR_TYPES.EXECUTION_REVERTED,
    '-32003': ERROR_TYPES.TRANSACTION_FAILED,
    '-32005': ERROR_TYPES.RATE_LIMITED,
    '-32600': ERROR_TYPES.RPC_ERROR, // Invalid Request
    '-32601': ERROR_TYPES.RPC_ERROR, // Method not found
    '-32602': ERROR_TYPES.RPC_ERROR, // Invalid params
    '-32603': ERROR_TYPES.RPC_ERROR, // Internal error
    '-32700': ERROR_TYPES.RPC_ERROR, // Parse error
};

/**
 * EVM Revert Reason Patterns
 */
const EVM_REVERT_PATTERNS = {
    'insufficient funds': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'insufficient balance': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'insufficient funds for transfer': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'execution reverted': ERROR_TYPES.EXECUTION_REVERTED,
    'nonce too low': ERROR_TYPES.NONCE_TOO_LOW,
    'nonce too high': ERROR_TYPES.NONCE_TOO_HIGH,
    'gas price too low': ERROR_TYPES.GAS_PRICE_TOO_LOW,
    'gas required exceeds allowance': ERROR_TYPES.GAS_ESTIMATION_FAILED,
    'transaction underpriced': ERROR_TYPES.GAS_PRICE_TOO_LOW,
    'replacement transaction underpriced': ERROR_TYPES.GAS_PRICE_TOO_LOW,
    'user rejected': ERROR_TYPES.USER_REJECTED,
    'user denied': ERROR_TYPES.USER_REJECTED,
    'user cancelled': ERROR_TYPES.USER_REJECTED,
};

/**
 * Tron Error Patterns
 */
const TRON_ERROR_PATTERNS = {
    'insufficient balance': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'account not found': ERROR_TYPES.INVALID_ADDRESS,
    'contract validate error': ERROR_TYPES.TRANSACTION_FAILED,
    'bandwidth limit': ERROR_TYPES.RATE_LIMITED,
    'energy limit': ERROR_TYPES.RATE_LIMITED,
    'transaction expired': ERROR_TYPES.TIMEOUT,
    'duplicate transaction': ERROR_TYPES.TRANSACTION_FAILED,
    'user cancelled': ERROR_TYPES.USER_REJECTED,
    'user rejected': ERROR_TYPES.USER_REJECTED,
};

/**
 * Solana Error Patterns
 */
const SOLANA_ERROR_PATTERNS = {
    'insufficient funds': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'insufficient lamports': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'account not found': ERROR_TYPES.INVALID_ADDRESS,
    'blockhash not found': ERROR_TYPES.TIMEOUT,
    'transaction expired': ERROR_TYPES.TIMEOUT,
    'user rejected': ERROR_TYPES.USER_REJECTED,
    'user cancelled': ERROR_TYPES.USER_REJECTED,
    'rate limit': ERROR_TYPES.RATE_LIMITED,
};

/**
 * Bitcoin Error Patterns
 */
const BITCOIN_ERROR_PATTERNS = {
    'insufficient funds': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'insufficient balance': ERROR_TYPES.INSUFFICIENT_BALANCE,
    'invalid address': ERROR_TYPES.INVALID_ADDRESS,
    'transaction too large': ERROR_TYPES.TRANSACTION_FAILED,
    'fee too low': ERROR_TYPES.GAS_PRICE_TOO_LOW,
    'user rejected': ERROR_TYPES.USER_REJECTED,
};

/**
 * Error Recovery Strategies
 */
const RECOVERY_STRATEGIES = {
    [ERROR_TYPES.NETWORK_ERROR]: {
        retry: true,
        retryDelay: 2000,
        maxRetries: 3,
        action: 'Check your internet connection and try again.',
    },
    [ERROR_TYPES.RPC_ERROR]: {
        retry: true,
        retryDelay: 1000,
        maxRetries: 3,
        action: 'The network may be busy. Please try again in a moment.',
    },
    [ERROR_TYPES.RATE_LIMITED]: {
        retry: true,
        retryDelay: 5000,
        maxRetries: 1,
        action: 'Rate limit reached. Please wait a few minutes before trying again.',
    },
    [ERROR_TYPES.TIMEOUT]: {
        retry: true,
        retryDelay: 3000,
        maxRetries: 2,
        action: 'Request timed out. Please try again.',
    },
    [ERROR_TYPES.INSUFFICIENT_BALANCE]: {
        retry: false,
        action: 'Please ensure you have sufficient balance for this transaction.',
    },
    [ERROR_TYPES.USER_REJECTED]: {
        retry: false,
        action: 'Transaction was cancelled. You can try again when ready.',
    },
    [ERROR_TYPES.GAS_ESTIMATION_FAILED]: {
        retry: true,
        retryDelay: 2000,
        maxRetries: 2,
        action: 'Gas estimation failed. Please try again or increase gas limit.',
    },
    [ERROR_TYPES.GAS_PRICE_TOO_LOW]: {
        retry: true,
        retryDelay: 1000,
        maxRetries: 1,
        action: 'Gas price is too low. The transaction will be retried with a higher gas price.',
    },
    [ERROR_TYPES.NONCE_TOO_LOW]: {
        retry: true,
        retryDelay: 1000,
        maxRetries: 1,
        action: 'Nonce error detected. The transaction will be retried.',
    },
};

/**
 * Parse error and extract error type
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @returns {Object} Parsed error information
 */
export const parseError = (error, chainId = null) => {
    // Handle chainId 0 (Bitcoin) explicitly - 0 is falsy but valid
    const chain = (chainId !== null && chainId !== undefined) ? chainConfig.getChain(chainId) : null;
    const chainType = chain?.type || 'EVM';
    
    let errorType = ERROR_TYPES.TRANSACTION_FAILED;
    let errorMessage = error?.message || 'An unknown error occurred';
    let errorCode = null;
    let revertReason = null;
    let severity = ERROR_SEVERITY.MEDIUM;
    
    // Extract error code if present
    if (error?.code) {
        errorCode = error.code;
    } else if (error?.error?.code) {
        errorCode = error.error.code;
    } else if (error?.data?.code) {
        errorCode = error.data.code;
    }
    
    // Extract revert reason if present
    if (error?.reason) {
        revertReason = error.reason;
    } else if (error?.data?.message) {
        revertReason = error.data.message;
    } else if (error?.error?.message) {
        revertReason = error.error.message;
    }
    
    // Parse based on chain type
    if (chainType === 'EVM' || !chainType) {
        // EVM error parsing
        if (errorCode && EVM_ERROR_CODES[String(errorCode)]) {
            errorType = EVM_ERROR_CODES[String(errorCode)];
        } else if (revertReason) {
            const lowerReason = revertReason.toLowerCase();
            for (const [pattern, type] of Object.entries(EVM_REVERT_PATTERNS)) {
                if (lowerReason.includes(pattern)) {
                    errorType = type;
                    break;
                }
            }
        }
        
        // Check for common EVM error patterns in message
        const lowerMessage = errorMessage.toLowerCase();
        for (const [pattern, type] of Object.entries(EVM_REVERT_PATTERNS)) {
            if (lowerMessage.includes(pattern)) {
                errorType = type;
                break;
            }
        }
        
        // Check for user rejection
        if (lowerMessage.includes('user rejected') || 
            lowerMessage.includes('user denied') ||
            lowerMessage.includes('user cancelled') ||
            errorCode === 4001) {
            errorType = ERROR_TYPES.USER_REJECTED;
        }
        
        // Check for network errors
        if (lowerMessage.includes('network') || 
            lowerMessage.includes('connection') ||
            lowerMessage.includes('fetch')) {
            errorType = ERROR_TYPES.NETWORK_ERROR;
        }
        
        // Check for timeout
        if (lowerMessage.includes('timeout') || 
            lowerMessage.includes('timed out')) {
            errorType = ERROR_TYPES.TIMEOUT;
        }
        
    } else if (chainType === 'TRON') {
        // Tron error parsing
        const lowerMessage = errorMessage.toLowerCase();
        for (const [pattern, type] of Object.entries(TRON_ERROR_PATTERNS)) {
            if (lowerMessage.includes(pattern)) {
                errorType = type;
                break;
            }
        }
        
    } else if (chainType === 'SOLANA') {
        // Solana error parsing
        const lowerMessage = errorMessage.toLowerCase();
        for (const [pattern, type] of Object.entries(SOLANA_ERROR_PATTERNS)) {
            if (lowerMessage.includes(pattern)) {
                errorType = type;
                break;
            }
        }
        
    } else if (chainType === 'BITCOIN') {
        // Bitcoin error parsing
        const lowerMessage = errorMessage.toLowerCase();
        for (const [pattern, type] of Object.entries(BITCOIN_ERROR_PATTERNS)) {
            if (lowerMessage.includes(pattern)) {
                errorType = type;
                break;
            }
        }
    }
    
    // Determine severity
    if ([ERROR_TYPES.USER_REJECTED, ERROR_TYPES.INVALID_ADDRESS].includes(errorType)) {
        severity = ERROR_SEVERITY.LOW;
    } else if ([ERROR_TYPES.INSUFFICIENT_BALANCE, ERROR_TYPES.TIMEOUT].includes(errorType)) {
        severity = ERROR_SEVERITY.MEDIUM;
    } else if ([ERROR_TYPES.NETWORK_ERROR, ERROR_TYPES.RPC_ERROR, ERROR_TYPES.TRANSACTION_FAILED].includes(errorType)) {
        severity = ERROR_SEVERITY.HIGH;
    } else if ([ERROR_TYPES.EXECUTION_REVERTED, ERROR_TYPES.CONTRACT_NOT_FOUND].includes(errorType)) {
        severity = ERROR_SEVERITY.CRITICAL;
    }
    
    return {
        errorType,
        errorMessage,
        errorCode,
        revertReason,
        severity,
        chainId,
        chainType,
        originalError: error,
    };
};

/**
 * Get user-friendly error message
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @returns {Object} Error object with user-friendly message and recovery info
 */
export const getChainError = (error, chainId = null) => {
    const parsed = parseError(error, chainId);
    const recovery = RECOVERY_STRATEGIES[parsed.errorType] || {};
    
    // Get chain-specific error message from ChainConfigService
    let userMessage = chainConfig.getErrorMessage(chainId, parsed.errorType);
    
    // Enhance message with revert reason if available
    if (parsed.revertReason && parsed.revertReason !== parsed.errorMessage) {
        userMessage = `${userMessage} Reason: ${parsed.revertReason}`;
    }
    
    // Log error for monitoring
    logError(parsed, error);
    
    return {
        type: parsed.errorType,
        message: userMessage,
        originalMessage: parsed.errorMessage,
        severity: parsed.severity,
        chainId: parsed.chainId,
        chainType: parsed.chainType,
        errorCode: parsed.errorCode,
        revertReason: parsed.revertReason,
        recovery: {
            canRetry: recovery.retry || false,
            retryDelay: recovery.retryDelay || 0,
            maxRetries: recovery.maxRetries || 0,
            action: recovery.action || 'Please try again.',
        },
        timestamp: new Date().toISOString(),
    };
};

/**
 * Log error for monitoring
 * @param {Object} parsedError - Parsed error information
 * @param {Error|Object} originalError - Original error object
 */
export const logError = (parsedError, originalError) => {
    const logData = {
        timestamp: new Date().toISOString(),
        errorType: parsedError.errorType,
        errorMessage: parsedError.errorMessage,
        errorCode: parsedError.errorCode,
        revertReason: parsedError.revertReason,
        chainId: parsedError.chainId,
        chainType: parsedError.chainType,
        severity: parsedError.severity,
        stack: originalError?.stack,
        userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : null,
    };
    
    // Log to console in development or test environment
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.error('Chain Error:', logData);
    }
    
    // In production, you could send to error tracking service
    // Example: sendToErrorTracking(logData);
    
    // Store in localStorage for debugging (optional)
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const errorLog = JSON.parse(localStorage.getItem('chainErrors') || '[]');
            errorLog.push(logData);
            
            // Keep only last 50 errors
            if (errorLog.length > 50) {
                errorLog.shift();
            }
            
            localStorage.setItem('chainErrors', JSON.stringify(errorLog));
        } catch (e) {
            // Ignore localStorage errors
        }
    }
};

/**
 * Get error recovery strategy
 * @param {string} errorType - Error type
 * @returns {Object} Recovery strategy
 */
export const getRecoveryStrategy = (errorType) => {
    return RECOVERY_STRATEGIES[errorType] || {
        retry: false,
        action: 'Please try again.',
    };
};

/**
 * Check if error is retryable
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if error is retryable
 */
export const isRetryable = (error, chainId = null) => {
    const parsed = parseError(error, chainId);
    const recovery = RECOVERY_STRATEGIES[parsed.errorType];
    return recovery?.retry || false;
};

/**
 * Get retry delay for error
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @param {number} attempt - Retry attempt number (0-indexed)
 * @returns {number} Retry delay in milliseconds
 */
export const getRetryDelay = (error, chainId = null, attempt = 0) => {
    const parsed = parseError(error, chainId);
    const recovery = RECOVERY_STRATEGIES[parsed.errorType];
    
    if (!recovery?.retry) return 0;
    
    const baseDelay = recovery.retryDelay || 1000;
    // Exponential backoff
    return baseDelay * Math.pow(2, attempt);
};

/**
 * Get max retries for error
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @returns {number} Maximum retry attempts
 */
export const getMaxRetries = (error, chainId = null) => {
    const parsed = parseError(error, chainId);
    const recovery = RECOVERY_STRATEGIES[parsed.errorType];
    return recovery?.maxRetries || 0;
};

/**
 * Format error for display
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @returns {Object} Formatted error for UI display
 */
/**
 * Format error for display to user
 * Uses ChainConfigService.getErrorMessage() as base and enhances with context
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID (optional)
 * @returns {Object} Formatted error with message, title, suggestion, and recovery info
 */
export const formatErrorForDisplay = (error, chainId = null) => {
    const chainError = getChainError(error, chainId);
    const chain = chainId ? chainConfig.getChain(chainId) : null;
    
    // Get base message from ChainConfigService (already done in getChainError)
    // Enhance with additional context
    let enhancedMessage = chainError.message;
    
    // Add revert reason if available and not already in message
    if (chainError.revertReason && !enhancedMessage.includes(chainError.revertReason)) {
        enhancedMessage = `${enhancedMessage} Reason: ${chainError.revertReason}`;
    }
    
    return {
        title: getErrorTitle(chainError.type, chain),
        message: enhancedMessage,
        suggestion: chainError.recovery.action,
        recoverySuggestion: chainError.recovery.action,
        severity: chainError.severity,
        canRetry: chainError.recovery.canRetry,
        retryDelay: chainError.recovery.retryDelay,
        maxRetries: chainError.recovery.maxRetries,
        chainName: chain?.chainName || 'Unknown Chain',
        chainId: chainId,
        errorType: chainError.type,
    };
};

/**
 * Get error title based on error type
 * @param {string} errorType - Error type
 * @param {Object} chain - Chain object
 * @returns {string} Error title
 */
const getErrorTitle = (errorType, chain = null) => {
    const chainName = chain?.chainName || 'Network';
    
    const titles = {
        [ERROR_TYPES.NETWORK_ERROR]: `Network Error on ${chainName}`,
        [ERROR_TYPES.TRANSACTION_FAILED]: `Transaction Failed on ${chainName}`,
        [ERROR_TYPES.INSUFFICIENT_BALANCE]: `Insufficient Balance on ${chainName}`,
        [ERROR_TYPES.USER_REJECTED]: 'Transaction Cancelled',
        [ERROR_TYPES.TIMEOUT]: `Request Timeout on ${chainName}`,
        [ERROR_TYPES.INVALID_ADDRESS]: 'Invalid Address',
        [ERROR_TYPES.RPC_ERROR]: `RPC Error on ${chainName}`,
        [ERROR_TYPES.RATE_LIMITED]: `Rate Limited on ${chainName}`,
        [ERROR_TYPES.GAS_ESTIMATION_FAILED]: `Gas Estimation Failed on ${chainName}`,
        [ERROR_TYPES.EXECUTION_REVERTED]: `Transaction Reverted on ${chainName}`,
    };
    
    return titles[errorType] || `Error on ${chainName}`;
};

/**
 * Get error logs from localStorage
 * @param {number} limit - Maximum number of logs to return
 * @returns {Array} Array of error logs
 */
export const getErrorLogs = (limit = 50) => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return [];
    }
    
    try {
        const errorLog = JSON.parse(localStorage.getItem('chainErrors') || '[]');
        return errorLog.slice(-limit);
    } catch (e) {
        return [];
    }
};

/**
 * Clear error logs
 */
export const clearErrorLogs = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            localStorage.removeItem('chainErrors');
        } catch (e) {
            // Ignore
        }
    }
};

/**
 * Handle error with recovery strategy
 * @param {Error|Object} error - Error object
 * @param {number} chainId - Chain ID
 * @param {Function} retryFn - Function to retry
 * @param {number} attempt - Current attempt number
 * @returns {Promise} Result of retry or throws error
 */
export const handleErrorWithRecovery = async (error, chainId, retryFn, attempt = 0) => {
    const chainError = getChainError(error, chainId);
    
    if (!chainError.recovery.canRetry) {
        throw chainError;
    }
    
    if (attempt >= chainError.recovery.maxRetries) {
        throw chainError;
    }
    
    const delay = getRetryDelay(error, chainId, attempt);
    if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
        return await retryFn();
    } catch (retryError) {
        return handleErrorWithRecovery(retryError, chainId, retryFn, attempt + 1);
    }
};

export default {
    parseError,
    getChainError,
    logError,
    getRecoveryStrategy,
    isRetryable,
    getRetryDelay,
    getMaxRetries,
    formatErrorForDisplay,
    getErrorLogs,
    clearErrorLogs,
    handleErrorWithRecovery,
    ERROR_TYPES,
    ERROR_SEVERITY,
};

