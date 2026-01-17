/**
 * Feature Flags Utility
 * 
 * Provides type-safe feature checking using ChainConfigService.
 * Handles missing flags gracefully with sensible defaults.
 */

import chainConfig from '../services/chainConfig';

/**
 * Feature flag names
 */
export const FEATURE_FLAGS = {
    DIRECT_SWAP: 'directSwap',
    LAYER_SWAP: 'layerSwap',
    REFERRAL_SYSTEM: 'referralSystem',
    WHITELIST: 'whitelist',
    TOKEN_TAX: 'tokenTax',
    CROSS_CHAIN_SYNC: 'crossChainSync',
    BATCH_OPERATIONS: 'batchOperations',
};

/**
 * Default feature flags (used when chain config is missing)
 */
const DEFAULT_FEATURES = {
    directSwap: false,
    layerSwap: false,
    referralSystem: false,
    whitelist: false,
    tokenTax: false,
    crossChainSync: true,
    batchOperations: false,
};

/**
 * Check if a feature is enabled for a chain
 * @param {number} chainId - Chain ID
 * @param {string} featureName - Feature name (from FEATURE_FLAGS)
 * @returns {boolean} True if feature is enabled
 */
export function isFeatureEnabled(chainId, featureName) {
    if (chainId === null || chainId === undefined || !featureName) {
        return false;
    }

    const flags = chainConfig.getFeatureFlags(chainId);
    
    // Check if flags is valid and feature exists in flags
    if (flags && typeof flags === 'object' && flags.hasOwnProperty(featureName)) {
        return flags[featureName] === true;
    }

    // Return default if not found
    return DEFAULT_FEATURES[featureName] || false;
}

/**
 * Get all feature flags for a chain
 * @param {number} chainId - Chain ID
 * @returns {Object} Feature flags object
 */
export function getFeatureFlags(chainId) {
    if (chainId === null || chainId === undefined) {
        return DEFAULT_FEATURES;
    }

    const flags = chainConfig.getFeatureFlags(chainId);
    
    // Merge with defaults to ensure all features are present
    return {
        ...DEFAULT_FEATURES,
        ...flags,
    };
}

/**
 * Check if direct swap is supported
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if direct swap is supported
 */
export function supportsDirectSwap(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.DIRECT_SWAP);
}

/**
 * Check if LayerSwap is required
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if LayerSwap is required
 */
export function requiresLayerSwap(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.LAYER_SWAP);
}

/**
 * Check if referral system is supported
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if referral system is supported
 */
export function supportsReferralSystem(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.REFERRAL_SYSTEM);
}

/**
 * Check if whitelist is supported
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if whitelist is supported
 */
export function supportsWhitelist(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.WHITELIST);
}

/**
 * Check if token tax is enabled
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if token tax is enabled
 */
export function hasTokenTax(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.TOKEN_TAX);
}

/**
 * Check if cross-chain sync is enabled
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if cross-chain sync is enabled
 */
export function supportsCrossChainSync(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.CROSS_CHAIN_SYNC);
}

/**
 * Check if batch operations are supported
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if batch operations are supported
 */
export function supportsBatchOperations(chainId) {
    return isFeatureEnabled(chainId, FEATURE_FLAGS.BATCH_OPERATIONS);
}

/**
 * Get feature availability message
 * @param {number} chainId - Chain ID
 * @param {string} featureName - Feature name
 * @returns {string} Message about feature availability
 */
export function getFeatureMessage(chainId, featureName) {
    const chain = chainConfig.getChain(chainId);
    const chainName = chain?.chainName || 'this chain';
    const isEnabled = isFeatureEnabled(chainId, featureName);

    const messages = {
        [FEATURE_FLAGS.DIRECT_SWAP]: isEnabled
            ? `Direct swaps are supported on ${chainName}`
            : `Direct swaps are not available on ${chainName}. Use LayerSwap instead.`,
        [FEATURE_FLAGS.LAYER_SWAP]: isEnabled
            ? `LayerSwap integration is required for ${chainName}`
            : `LayerSwap is not required for ${chainName}`,
        [FEATURE_FLAGS.REFERRAL_SYSTEM]: isEnabled
            ? `Referral system is available on ${chainName}`
            : `Referral system is not supported on ${chainName}`,
        [FEATURE_FLAGS.WHITELIST]: isEnabled
            ? `Whitelist features are available on ${chainName}`
            : `Whitelist features are not supported on ${chainName}`,
        [FEATURE_FLAGS.TOKEN_TAX]: isEnabled
            ? `Token tax applies on ${chainName}`
            : `Token tax does not apply on ${chainName}`,
        [FEATURE_FLAGS.CROSS_CHAIN_SYNC]: isEnabled
            ? `Cross-chain sync is enabled on ${chainName}`
            : `Cross-chain sync is not available on ${chainName}`,
        [FEATURE_FLAGS.BATCH_OPERATIONS]: isEnabled
            ? `Batch operations are supported on ${chainName}`
            : `Batch operations are not supported on ${chainName}`,
    };

    return messages[featureName] || `Feature ${featureName} is ${isEnabled ? 'enabled' : 'disabled'} on ${chainName}`;
}

/**
 * Get list of enabled features for a chain
 * @param {number} chainId - Chain ID
 * @returns {string[]} Array of enabled feature names
 */
export function getEnabledFeatures(chainId) {
    const flags = getFeatureFlags(chainId);
    return Object.keys(flags).filter(key => flags[key] === true);
}

/**
 * Get list of disabled features for a chain
 * @param {number} chainId - Chain ID
 * @returns {string[]} Array of disabled feature names
 */
export function getDisabledFeatures(chainId) {
    const flags = getFeatureFlags(chainId);
    return Object.keys(flags).filter(key => flags[key] === false);
}

export default {
    FEATURE_FLAGS,
    isFeatureEnabled,
    getFeatureFlags,
    supportsDirectSwap,
    requiresLayerSwap,
    supportsReferralSystem,
    supportsWhitelist,
    hasTokenTax,
    supportsCrossChainSync,
    supportsBatchOperations,
    getFeatureMessage,
    getEnabledFeatures,
    getDisabledFeatures,
};

