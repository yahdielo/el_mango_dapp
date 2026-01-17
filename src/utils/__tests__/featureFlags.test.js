/**
 * Tests for featureFlags Utility
 * 
 * Tests feature flag checking, convenience functions, feature messages,
 * and integration with ChainConfigService.
 */

import {
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
} from '../featureFlags';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('../../services/chainConfig');

describe('featureFlags Utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock chain configurations
        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                1: { chainId: '1', chainName: 'Ethereum', type: 'EVM' },
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
                56: { chainId: '56', chainName: 'BSC', type: 'EVM' },
                137: { chainId: '137', chainName: 'Polygon', type: 'EVM' },
                10: { chainId: '10', chainName: 'Optimism', type: 'EVM' },
                43114: { chainId: '43114', chainName: 'Avalanche', type: 'EVM' },
                728126428: { chainId: '728126428', chainName: 'Tron', type: 'TRON' },
                501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
                0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
            };
            return chains[chainId] || null;
        });
    });

    describe('FEATURE_FLAGS constant', () => {
        test('should have all 7 feature flag names defined', () => {
            expect(FEATURE_FLAGS.DIRECT_SWAP).toBe('directSwap');
            expect(FEATURE_FLAGS.LAYER_SWAP).toBe('layerSwap');
            expect(FEATURE_FLAGS.REFERRAL_SYSTEM).toBe('referralSystem');
            expect(FEATURE_FLAGS.WHITELIST).toBe('whitelist');
            expect(FEATURE_FLAGS.TOKEN_TAX).toBe('tokenTax');
            expect(FEATURE_FLAGS.CROSS_CHAIN_SYNC).toBe('crossChainSync');
            expect(FEATURE_FLAGS.BATCH_OPERATIONS).toBe('batchOperations');
        });

        test('should have correct number of feature flags', () => {
            expect(Object.keys(FEATURE_FLAGS)).toHaveLength(7);
        });
    });

    describe('isFeatureEnabled()', () => {
        test('should return true when feature is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                referralSystem: true,
            });

            expect(isFeatureEnabled(8453, FEATURE_FLAGS.DIRECT_SWAP)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.REFERRAL_SYSTEM)).toBe(true);
        });

        test('should return false when feature is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
                whitelist: false,
            });

            expect(isFeatureEnabled(8453, FEATURE_FLAGS.DIRECT_SWAP)).toBe(false);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.WHITELIST)).toBe(false);
        });

        test('should return default when feature flag is missing', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                // referralSystem is missing
            });

            // crossChainSync defaults to true
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.CROSS_CHAIN_SYNC)).toBe(true);
            // directSwap defaults to false, but is explicitly set to true
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.DIRECT_SWAP)).toBe(true);
            // referralSystem defaults to false
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.REFERRAL_SYSTEM)).toBe(false);
        });

        test('should return false when chainId is null or undefined', () => {
            expect(isFeatureEnabled(null, FEATURE_FLAGS.DIRECT_SWAP)).toBe(false);
            expect(isFeatureEnabled(undefined, FEATURE_FLAGS.DIRECT_SWAP)).toBe(false);
            expect(isFeatureEnabled(0, FEATURE_FLAGS.DIRECT_SWAP)).toBe(false); // 0 is falsy
        });

        test('should return false when featureName is null or undefined', () => {
            expect(isFeatureEnabled(8453, null)).toBe(false);
            expect(isFeatureEnabled(8453, undefined)).toBe(false);
        });

        test('should return false when featureName is invalid', () => {
            chainConfig.getFeatureFlags.mockReturnValue({});
            expect(isFeatureEnabled(8453, 'invalidFeature')).toBe(false);
            expect(isFeatureEnabled(8453, 'unknown')).toBe(false);
        });

        test('should work with all 7 feature flags', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                layerSwap: true,
                referralSystem: true,
                whitelist: true,
                tokenTax: true,
                crossChainSync: true,
                batchOperations: true,
            });

            expect(isFeatureEnabled(8453, FEATURE_FLAGS.DIRECT_SWAP)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.LAYER_SWAP)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.REFERRAL_SYSTEM)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.WHITELIST)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.TOKEN_TAX)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.CROSS_CHAIN_SYNC)).toBe(true);
            expect(isFeatureEnabled(8453, FEATURE_FLAGS.BATCH_OPERATIONS)).toBe(true);
        });
    });

    describe('getFeatureFlags()', () => {
        test('should return all feature flags for chain', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                referralSystem: true,
            });

            const flags = getFeatureFlags(8453);
            
            expect(flags).toHaveProperty('directSwap');
            expect(flags).toHaveProperty('layerSwap');
            expect(flags).toHaveProperty('referralSystem');
            expect(flags).toHaveProperty('whitelist');
            expect(flags).toHaveProperty('tokenTax');
            expect(flags).toHaveProperty('crossChainSync');
            expect(flags).toHaveProperty('batchOperations');
        });

        test('should merge with defaults', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                referralSystem: true,
            });

            const flags = getFeatureFlags(8453);
            
            // Explicitly set
            expect(flags.directSwap).toBe(true);
            expect(flags.referralSystem).toBe(true);
            
            // From defaults
            expect(flags.layerSwap).toBe(false); // default
            expect(flags.crossChainSync).toBe(true); // default
        });

        test('should return defaults when chainId is null or undefined', () => {
            const flags = getFeatureFlags(null);
            
            expect(flags).toEqual({
                directSwap: false,
                layerSwap: false,
                referralSystem: false,
                whitelist: false,
                tokenTax: false,
                crossChainSync: true,
                batchOperations: false,
            });
        });

        test('should work with all 10 chains', () => {
            const chains = [1, 10, 56, 137, 8453, 42161, 43114, 728126428, 501111, 0];
            
            chains.forEach(chainId => {
                chainConfig.getFeatureFlags.mockReturnValue({
                    directSwap: true,
                    referralSystem: true,
                });
                
                const flags = getFeatureFlags(chainId);
                expect(flags).toHaveProperty('directSwap');
                expect(flags).toHaveProperty('referralSystem');
                expect(flags).toHaveProperty('crossChainSync');
            });
        });
    });

    describe('supportsDirectSwap()', () => {
        test('should return true for EVM chains with directSwap enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
            });

            expect(supportsDirectSwap(8453)).toBe(true);
            expect(supportsDirectSwap(1)).toBe(true);
            expect(supportsDirectSwap(42161)).toBe(true);
        });

        test('should return false for Solana/Bitcoin', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
            });

            expect(supportsDirectSwap(501111)).toBe(false); // Solana
            expect(supportsDirectSwap(0)).toBe(false); // Bitcoin
        });

        test('should return false when feature is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
            });

            expect(supportsDirectSwap(8453)).toBe(false);
        });
    });

    describe('requiresLayerSwap()', () => {
        test('should return true for Solana/Bitcoin', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                layerSwap: true,
            });

            expect(requiresLayerSwap(501111)).toBe(true); // Solana
            expect(requiresLayerSwap(0)).toBe(true); // Bitcoin
        });

        test('should return false for EVM chains when not required', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                layerSwap: false,
            });

            expect(requiresLayerSwap(8453)).toBe(false);
            expect(requiresLayerSwap(1)).toBe(false);
        });

        test('should return true when layerSwap is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                layerSwap: true,
            });

            expect(requiresLayerSwap(8453)).toBe(true);
        });
    });

    describe('supportsReferralSystem()', () => {
        test('should return true when referralSystem is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                referralSystem: true,
            });

            expect(supportsReferralSystem(8453)).toBe(true);
        });

        test('should return false when referralSystem is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                referralSystem: false,
            });

            expect(supportsReferralSystem(8453)).toBe(false);
        });
    });

    describe('supportsWhitelist()', () => {
        test('should return true when whitelist is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                whitelist: true,
            });

            expect(supportsWhitelist(8453)).toBe(true);
        });

        test('should return false when whitelist is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                whitelist: false,
            });

            expect(supportsWhitelist(8453)).toBe(false);
        });
    });

    describe('hasTokenTax()', () => {
        test('should return true when tokenTax is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                tokenTax: true,
            });

            expect(hasTokenTax(8453)).toBe(true);
        });

        test('should return false when tokenTax is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                tokenTax: false,
            });

            expect(hasTokenTax(8453)).toBe(false);
        });
    });

    describe('supportsCrossChainSync()', () => {
        test('should return true when crossChainSync is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                crossChainSync: true,
            });

            expect(supportsCrossChainSync(8453)).toBe(true);
        });

        test('should return false when crossChainSync is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                crossChainSync: false,
            });

            expect(supportsCrossChainSync(8453)).toBe(false);
        });

        test('should default to true', () => {
            chainConfig.getFeatureFlags.mockReturnValue({});
            expect(supportsCrossChainSync(8453)).toBe(true); // default
        });
    });

    describe('supportsBatchOperations()', () => {
        test('should return true when batchOperations is enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                batchOperations: true,
            });

            expect(supportsBatchOperations(8453)).toBe(true);
        });

        test('should return false when batchOperations is disabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                batchOperations: false,
            });

            expect(supportsBatchOperations(8453)).toBe(false);
        });
    });

    describe('getFeatureMessage()', () => {
        test('should return enabled message for directSwap', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.DIRECT_SWAP);
            expect(message).toBe('Direct swaps are supported on Base');
        });

        test('should return disabled message for directSwap', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.DIRECT_SWAP);
            expect(message).toBe('Direct swaps are not available on Base. Use LayerSwap instead.');
        });

        test('should return enabled message for layerSwap', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Solana', type: 'SOLANA' });
            chainConfig.getFeatureFlags.mockReturnValue({
                layerSwap: true,
            });

            const message = getFeatureMessage(501111, FEATURE_FLAGS.LAYER_SWAP);
            expect(message).toBe('LayerSwap integration is required for Solana');
        });

        test('should return disabled message for layerSwap', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                layerSwap: false,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.LAYER_SWAP);
            expect(message).toBe('LayerSwap is not required for Base');
        });

        test('should return enabled message for referralSystem', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                referralSystem: true,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.REFERRAL_SYSTEM);
            expect(message).toBe('Referral system is available on Base');
        });

        test('should return disabled message for referralSystem', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Solana', type: 'SOLANA' });
            chainConfig.getFeatureFlags.mockReturnValue({
                referralSystem: false,
            });

            const message = getFeatureMessage(501111, FEATURE_FLAGS.REFERRAL_SYSTEM);
            expect(message).toBe('Referral system is not supported on Solana');
        });

        test('should return enabled message for whitelist', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                whitelist: true,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.WHITELIST);
            expect(message).toBe('Whitelist features are available on Base');
        });

        test('should return disabled message for whitelist', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                whitelist: false,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.WHITELIST);
            expect(message).toBe('Whitelist features are not supported on Base');
        });

        test('should return enabled message for tokenTax', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                tokenTax: true,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.TOKEN_TAX);
            expect(message).toBe('Token tax applies on Base');
        });

        test('should return disabled message for tokenTax', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                tokenTax: false,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.TOKEN_TAX);
            expect(message).toBe('Token tax does not apply on Base');
        });

        test('should return enabled message for crossChainSync', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                crossChainSync: true,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.CROSS_CHAIN_SYNC);
            expect(message).toBe('Cross-chain sync is enabled on Base');
        });

        test('should return disabled message for crossChainSync', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                crossChainSync: false,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.CROSS_CHAIN_SYNC);
            expect(message).toBe('Cross-chain sync is not available on Base');
        });

        test('should return enabled message for batchOperations', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                batchOperations: true,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.BATCH_OPERATIONS);
            expect(message).toBe('Batch operations are supported on Base');
        });

        test('should return disabled message for batchOperations', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                batchOperations: false,
            });

            const message = getFeatureMessage(8453, FEATURE_FLAGS.BATCH_OPERATIONS);
            expect(message).toBe('Batch operations are not supported on Base');
        });

        test('should include chain name in all messages', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Ethereum', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
            });

            const message = getFeatureMessage(1, FEATURE_FLAGS.DIRECT_SWAP);
            expect(message).toContain('Ethereum');
        });

        test('should use "this chain" when chain name is missing', () => {
            chainConfig.getChain.mockReturnValue(null);
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
            });

            const message = getFeatureMessage(999, FEATURE_FLAGS.DIRECT_SWAP);
            expect(message).toContain('this chain');
        });

        test('should work with all 10 chains', () => {
            const chains = [
                { id: 1, name: 'Ethereum' },
                { id: 10, name: 'Optimism' },
                { id: 56, name: 'BSC' },
                { id: 137, name: 'Polygon' },
                { id: 8453, name: 'Base' },
                { id: 42161, name: 'Arbitrum' },
                { id: 43114, name: 'Avalanche' },
                { id: 728126428, name: 'Tron' },
                { id: 501111, name: 'Solana' },
                { id: 0, name: 'Bitcoin' },
            ];

            chains.forEach(chain => {
                chainConfig.getChain.mockReturnValue({ chainName: chain.name, type: 'EVM' });
                chainConfig.getFeatureFlags.mockReturnValue({
                    directSwap: true,
                });

                const message = getFeatureMessage(chain.id, FEATURE_FLAGS.DIRECT_SWAP);
                expect(message).toContain(chain.name);
            });
        });

        test('should return generic message for invalid feature name', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({});

            const message = getFeatureMessage(8453, 'invalidFeature');
            expect(message).toBe('Feature invalidFeature is disabled on Base');
        });
    });

    describe('getEnabledFeatures()', () => {
        test('should return array of enabled feature names', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                referralSystem: true,
                crossChainSync: true,
                whitelist: false,
                tokenTax: false,
            });

            const enabled = getEnabledFeatures(8453);
            
            expect(enabled).toContain('directSwap');
            expect(enabled).toContain('referralSystem');
            expect(enabled).toContain('crossChainSync');
            expect(enabled).not.toContain('whitelist');
            expect(enabled).not.toContain('tokenTax');
        });

        test('should filter out disabled features', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
                referralSystem: false,
                whitelist: false,
            });

            const enabled = getEnabledFeatures(8453);
            
            expect(enabled).not.toContain('directSwap');
            expect(enabled).not.toContain('referralSystem');
            expect(enabled).not.toContain('whitelist');
        });

        test('should work with different chain configurations', () => {
            // Chain with all features enabled
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                layerSwap: true,
                referralSystem: true,
                whitelist: true,
                tokenTax: true,
                crossChainSync: true,
                batchOperations: true,
            });

            const enabled = getEnabledFeatures(8453);
            expect(enabled.length).toBe(7);
        });

        test('should return empty array when no features enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
                layerSwap: false,
                referralSystem: false,
                whitelist: false,
                tokenTax: false,
                crossChainSync: false,
                batchOperations: false,
            });

            const enabled = getEnabledFeatures(8453);
            expect(enabled.length).toBe(0);
        });
    });

    describe('getDisabledFeatures()', () => {
        test('should return array of disabled feature names', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
                referralSystem: false,
                crossChainSync: true,
                whitelist: false,
            });

            const disabled = getDisabledFeatures(8453);
            
            expect(disabled).toContain('directSwap');
            expect(disabled).toContain('referralSystem');
            expect(disabled).toContain('whitelist');
            expect(disabled).not.toContain('crossChainSync');
        });

        test('should filter out enabled features', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                referralSystem: true,
                whitelist: true,
            });

            const disabled = getDisabledFeatures(8453);
            
            expect(disabled).not.toContain('directSwap');
            expect(disabled).not.toContain('referralSystem');
            expect(disabled).not.toContain('whitelist');
        });

        test('should work with different chain configurations', () => {
            // Chain with all features disabled
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: false,
                layerSwap: false,
                referralSystem: false,
                whitelist: false,
                tokenTax: false,
                crossChainSync: false,
                batchOperations: false,
            });

            const disabled = getDisabledFeatures(8453);
            expect(disabled.length).toBe(7);
        });

        test('should return empty array when all features enabled', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                layerSwap: true,
                referralSystem: true,
                whitelist: true,
                tokenTax: true,
                crossChainSync: true,
                batchOperations: true,
            });

            const disabled = getDisabledFeatures(8453);
            expect(disabled.length).toBe(0);
        });
    });

    describe('Integration with ChainConfigService', () => {
        test('should use ChainConfigService.getFeatureFlags()', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
            });

            getFeatureFlags(8453);
            
            expect(chainConfig.getFeatureFlags).toHaveBeenCalledWith(8453);
        });

        test('should use ChainConfigService.getChain() for messages', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
            });

            getFeatureMessage(8453, FEATURE_FLAGS.DIRECT_SWAP);
            
            expect(chainConfig.getChain).toHaveBeenCalledWith(8453);
        });

        test('should handle ChainConfigService errors gracefully', () => {
            chainConfig.getFeatureFlags.mockReturnValue({});
            chainConfig.getChain.mockReturnValue(null);

            const message = getFeatureMessage(8453, FEATURE_FLAGS.DIRECT_SWAP);
            expect(message).toContain('this chain');
        });
    });

    describe('Edge cases and error scenarios', () => {
        test('should handle empty feature flags object', () => {
            chainConfig.getFeatureFlags.mockReturnValue({});

            const flags = getFeatureFlags(8453);
            expect(flags).toEqual({
                directSwap: false,
                layerSwap: false,
                referralSystem: false,
                whitelist: false,
                tokenTax: false,
                crossChainSync: true,
                batchOperations: false,
            });
        });

        test('should handle null feature flags', () => {
            chainConfig.getFeatureFlags.mockReturnValue(null);

            const flags = getFeatureFlags(8453);
            // Should merge with defaults
            expect(flags).toHaveProperty('directSwap');
            expect(flags).toHaveProperty('crossChainSync');
        });

        test('should handle undefined feature flags', () => {
            chainConfig.getFeatureFlags.mockReturnValue(undefined);

            const flags = getFeatureFlags(8453);
            // Should merge with defaults
            expect(flags).toHaveProperty('directSwap');
            expect(flags).toHaveProperty('crossChainSync');
        });

        test('should handle invalid chainId types', () => {
            expect(getFeatureFlags('invalid')).not.toEqual({});
            expect(getFeatureFlags({})).not.toEqual({});
        });
    });
});

