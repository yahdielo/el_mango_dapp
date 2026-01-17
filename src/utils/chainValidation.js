/**
 * Chain-Specific Validation Utility
 * 
 * Validates addresses, amounts, token addresses, and contract addresses per chain type.
 * Uses ChainConfigService for all validation logic and error messages.
 * 
 * Supports EVM, TRON, SOLANA, BITCOIN chains.
 */

import { getAddress } from 'viem/utils';
import chainConfig from '../services/chainConfig';
import mangoApi from '../services/mangoApi';

/**
 * Validation Result
 */
export class ValidationResult {
    constructor(isValid, message = '', error = null) {
        this.isValid = isValid;
        this.message = message;
        this.error = error;
    }

    static success(message = '') {
        return new ValidationResult(true, message);
    }

    static failure(message, error = null) {
        return new ValidationResult(false, message, error);
    }
}

/**
 * Validate address format for a chain
 * Uses ChainConfigService.validateAddress()
 * @param {number} chainId - Chain ID
 * @param {string} address - Address to validate
 * @returns {ValidationResult} Validation result
 */
export const validateAddress = (chainId, address) => {
    if (chainId === null || chainId === undefined) {
        return ValidationResult.failure('Chain ID is required');
    }

    if (!address) {
        return ValidationResult.failure('Address is required');
    }

    // Trim whitespace
    const trimmedAddress = address.trim();

    // Get chain type first
    const chain = chainConfig.getChain(chainId);
    const chainType = chain?.type || 'EVM';

    // Use ChainConfigService for validation
    const isValid = chainConfig.validateAddress(chainId, trimmedAddress);

    if (!isValid) {
        const errorMessage = chainConfig.getErrorMessage(chainId, 'invalidAddress');
        return ValidationResult.failure(errorMessage);
    }

    // Additional checks for EVM addresses only
    if (chainType === 'EVM') {
        // Check for zero address
        if (trimmedAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
            return ValidationResult.failure('Zero address is not allowed');
        }

        // Try to get checksummed address (validates format)
        try {
            const checksummed = getAddress(trimmedAddress);
            return ValidationResult.success(`Valid address: ${checksummed}`);
        } catch (err) {
            // If getAddress fails but chainConfig says it's valid, 
            // it might be a non-standard format - still return success if chainConfig validated it
            return ValidationResult.success('Valid address');
        }
    }

    // For non-EVM chains, rely on ChainConfigService validation
    return ValidationResult.success('Valid address');
};

/**
 * Validate amount for a chain
 * Checks if amount is positive and meets minimum requirements
 * @param {number} chainId - Chain ID
 * @param {string|number} amount - Amount to validate (as string or number)
 * @param {string} amountType - Type of amount ('swap' or 'referral')
 * @returns {ValidationResult} Validation result
 */
export const validateAmount = (chainId, amount, amountType = 'swap') => {
    if (chainId === null || chainId === undefined) {
        return ValidationResult.failure('Chain ID is required');
    }

    if (amount === null || amount === undefined || amount === '') {
        return ValidationResult.failure('Amount is required');
    }

    // Convert to string and trim
    const amountStr = String(amount).trim();

    // Check if amount is a valid number
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || !isFinite(amountNum)) {
        return ValidationResult.failure('Amount must be a valid number');
    }

    // Check if amount is positive
    if (amountNum <= 0) {
        return ValidationResult.failure('Amount must be greater than zero');
    }

    // Check minimum amount
    const minimumResult = checkMinimumAmount(chainId, amountStr, amountType);
    if (!minimumResult.isValid) {
        return minimumResult;
    }

    return ValidationResult.success('Valid amount');
};

/**
 * Check if amount meets minimum requirements
 * Uses ChainConfigService.getMinimumAmounts()
 * @param {number} chainId - Chain ID
 * @param {string|number} amount - Amount to check
 * @param {string} amountType - Type of amount ('swap' or 'referral')
 * @returns {ValidationResult} Validation result
 */
export const checkMinimumAmount = (chainId, amount, amountType = 'swap') => {
    if (chainId === null || chainId === undefined) {
        return ValidationResult.failure('Chain ID is required');
    }

    if (!amount) {
        return ValidationResult.failure('Amount is required');
    }

    // Get minimum amounts from ChainConfigService
    const minimums = chainConfig.getMinimumAmounts(chainId);
    if (!minimums) {
        return ValidationResult.success('No minimum amount requirement');
    }

    // Get minimum for the specific type
    const minimumStr = minimums[amountType] || minimums.swap || '0';
    const minimum = parseFloat(minimumStr);
    const amountNum = parseFloat(String(amount));

    if (isNaN(minimum) || minimum <= 0) {
        return ValidationResult.success('No minimum amount requirement');
    }

    if (amountNum < minimum) {
        const chain = chainConfig.getChain(chainId);
        const chainName = chain?.chainName || 'this chain';
        return ValidationResult.failure(
            `Minimum amount is ${minimumStr} on ${chainName}`
        );
    }

    return ValidationResult.success('Amount meets minimum requirement');
};

/**
 * Validate token address
 * Checks format and optionally checks if token exists on-chain
 * @param {number} chainId - Chain ID
 * @param {string} tokenAddress - Token address to validate
 * @param {Object} options - Options
 * @param {boolean} options.checkOnChain - Whether to check if token exists on-chain (default: false)
 * @param {Object} options.publicClient - Public client for EVM chains (wagmi)
 * @returns {Promise<ValidationResult>} Validation result
 */
export const validateTokenAddress = async (chainId, tokenAddress, options = {}) => {
    const { checkOnChain = false, publicClient = null } = options;

    // First, validate address format
    const formatResult = validateAddress(chainId, tokenAddress);
    if (!formatResult.isValid) {
        return formatResult;
    }

    // If on-chain check is not requested, return format validation
    if (!checkOnChain) {
        return ValidationResult.success('Valid token address format');
    }

    // Check if token exists on-chain
    const chain = chainConfig.getChain(chainId);
    const chainType = chain?.type || 'EVM';

    try {
        if (chainType === 'EVM') {
            // For EVM chains, check if contract has code
            if (!publicClient) {
                return ValidationResult.failure(
                    'Public client is required for on-chain validation'
                );
            }

            const code = await publicClient.getBytecode({
                address: tokenAddress,
            });

            if (!code || code === '0x') {
                return ValidationResult.failure('Token contract does not exist at this address');
            }

            // Optionally check if it's an ERC20 token by calling balanceOf or decimals
            try {
                // Try to read decimals (common ERC20 function)
                // This is a basic check - in production, you might want to use a more robust method
                return ValidationResult.success('Token contract exists');
            } catch (err) {
                // Contract exists but might not be ERC20
                return ValidationResult.success('Contract exists (may not be ERC20)');
            }
        } else if (chainType === 'TRON') {
            // For Tron, validate via API
            try {
                const result = await mangoApi.tron.validateTronAddress(tokenAddress);
                if (result.isValid) {
                    return ValidationResult.success('Valid Tron token address');
                } else {
                    return ValidationResult.failure('Invalid Tron token address');
                }
            } catch (err) {
                console.error('Error validating Tron token address:', err);
                return ValidationResult.failure('Error validating token address');
            }
        } else {
            // For Solana and Bitcoin, on-chain validation would require RPC calls
            // For now, return format validation result
            return ValidationResult.success('Valid token address format');
        }
    } catch (error) {
        console.error('Error validating token address on-chain:', error);
        return ValidationResult.failure(
            'Error validating token address on-chain',
            error
        );
    }
};

/**
 * Validate contract address
 * Checks format and optionally checks if contract exists on-chain
 * @param {number} chainId - Chain ID
 * @param {string} contractAddress - Contract address to validate
 * @param {string} contractType - Type of contract ('router', 'referral', 'token', 'manager', 'whitelist')
 * @param {Object} options - Options
 * @param {boolean} options.checkOnChain - Whether to check if contract exists on-chain (default: false)
 * @param {Object} options.publicClient - Public client for EVM chains (wagmi)
 * @returns {Promise<ValidationResult>} Validation result
 */
export const validateContractAddress = async (
    chainId,
    contractAddress,
    contractType = null,
    options = {}
) => {
    const { checkOnChain = false, publicClient = null } = options;

    // First, validate address format
    const formatResult = validateAddress(chainId, contractAddress);
    if (!formatResult.isValid) {
        return formatResult;
    }

    // If contract type is provided, check against configured contract address
    if (contractType) {
        const configuredAddress = chainConfig.getContractAddress(chainId, contractType);
        if (configuredAddress) {
            // Normalize addresses for comparison
            const normalizedInput = contractAddress.toLowerCase().trim();
            const normalizedConfig = configuredAddress.toLowerCase().trim();

            if (normalizedInput !== normalizedConfig) {
                const chain = chainConfig.getChain(chainId);
                const chainName = chain?.chainName || 'this chain';
                return ValidationResult.failure(
                    `Contract address does not match configured ${contractType} address on ${chainName}`
                );
            }
        }
    }

    // If on-chain check is not requested, return format validation
    if (!checkOnChain) {
        return ValidationResult.success('Valid contract address format');
    }

    // Check if contract exists on-chain
    const chain = chainConfig.getChain(chainId);
    const chainType = chain?.type || 'EVM';

    try {
        if (chainType === 'EVM') {
            // For EVM chains, check if contract has code
            if (!publicClient) {
                return ValidationResult.failure(
                    'Public client is required for on-chain validation'
                );
            }

            const code = await publicClient.getBytecode({
                address: contractAddress,
            });

            if (!code || code === '0x') {
                return ValidationResult.failure('Contract does not exist at this address');
            }

            return ValidationResult.success('Contract exists');
        } else if (chainType === 'TRON') {
            // For Tron, validate via API
            try {
                const result = await mangoApi.tron.validateTronAddress(contractAddress);
                if (result.isValid) {
                    return ValidationResult.success('Valid Tron contract address');
                } else {
                    return ValidationResult.failure('Invalid Tron contract address');
                }
            } catch (err) {
                console.error('Error validating Tron contract address:', err);
                return ValidationResult.failure('Error validating contract address');
            }
        } else {
            // For Solana and Bitcoin, on-chain validation would require RPC calls
            // For now, return format validation result
            return ValidationResult.success('Valid contract address format');
        }
    } catch (error) {
        console.error('Error validating contract address on-chain:', error);
        return ValidationResult.failure(
            'Error validating contract address on-chain',
            error
        );
    }
};

/**
 * Validate multiple addresses at once
 * @param {number} chainId - Chain ID
 * @param {Array<string>} addresses - Addresses to validate
 * @returns {Array<ValidationResult>} Array of validation results
 */
export const validateAddresses = (chainId, addresses) => {
    if (!Array.isArray(addresses)) {
        return [ValidationResult.failure('Addresses must be an array')];
    }

    return addresses.map((address) => validateAddress(chainId, address));
};

/**
 * Validate multiple amounts at once
 * @param {number} chainId - Chain ID
 * @param {Array<string|number>} amounts - Amounts to validate
 * @param {string} amountType - Type of amount ('swap' or 'referral')
 * @returns {Array<ValidationResult>} Array of validation results
 */
export const validateAmounts = (chainId, amounts, amountType = 'swap') => {
    if (!Array.isArray(amounts)) {
        return [ValidationResult.failure('Amounts must be an array')];
    }

    return amounts.map((amount) => validateAmount(chainId, amount, amountType));
};

/**
 * Get validation error message
 * Uses ChainConfigService.getErrorMessage()
 * @param {number} chainId - Chain ID
 * @param {string} errorType - Error type
 * @returns {string} Error message
 */
export const getValidationErrorMessage = (chainId, errorType) => {
    return chainConfig.getErrorMessage(chainId, errorType);
};

/**
 * Check if address is zero address
 * @param {string} address - Address to check
 * @returns {boolean} True if zero address
 */
export const isZeroAddress = (address) => {
    if (!address) return false;
    const normalized = address.toLowerCase().trim();
    return normalized === '0x0000000000000000000000000000000000000000';
};

/**
 * Normalize address (checksum for EVM, trim for others)
 * @param {number} chainId - Chain ID
 * @param {string} address - Address to normalize
 * @returns {string} Normalized address
 */
export const normalizeAddress = (chainId, address) => {
    if (!address) return '';

    const trimmed = address.trim();
    const chain = chainConfig.getChain(chainId);
    const chainType = chain?.type || 'EVM';

    if (chainType === 'EVM' || !chainType) {
        try {
            return getAddress(trimmed);
        } catch (err) {
            return trimmed;
        }
    }

    return trimmed;
};

export default {
    validateAddress,
    validateAmount,
    validateTokenAddress,
    validateContractAddress,
    checkMinimumAmount,
    validateAddresses,
    validateAmounts,
    getValidationErrorMessage,
    isZeroAddress,
    normalizeAddress,
    ValidationResult,
};

