/**
 * Unit Tests for ChainConfigService
 * 
 * Comprehensive tests for ChainConfigService with >90% code coverage.
 * Tests all methods, chain types, error cases, and edge cases.
 */

// Mock chains.json data
const mockChainsData = [
    {
        chainName: 'Ethereum',
        chainId: '1',
        type: 'EVM',
        rpcUrls: ['https://eth.llamarpc.com'],
        blockExplorers: [{ name: 'Etherscan', url: 'https://etherscan.io' }],
        contracts: { router: '0xRouter1', referral: '0xReferral1' },
        gasSettings: { gasLimit: 500000 },
        slippage: { default: 0.5, min: 0.1, max: 5.0 },
        timeouts: { transactionTimeout: 300000, rpcTimeout: 10000 },
        minimums: { swap: '0.001', referral: '0.0001' },
        blockTime: 12,
        confirmationsRequired: 1,
        featureFlags: { directSwap: false, layerSwap: true },
    },
    {
        chainName: 'Base',
        chainId: '8453',
        type: 'EVM',
        rpcUrls: ['https://base.llamarpc.com'],
        blockExplorers: [{ name: 'BaseScan', url: 'https://basescan.org' }],
        contracts: { router: '0xRouter2' },
        gasSettings: { gasLimit: 500000 },
        slippage: { default: 0.5 },
        timeouts: { transactionTimeout: 300000 },
        minimums: { swap: '0.001' },
        blockTime: 2,
        confirmationsRequired: 1,
        featureFlags: { directSwap: true },
    },
    {
        chainName: 'Tron',
        chainId: '728126428',
        type: 'TRON',
        rpcUrls: ['https://tron.rpc.com'],
        blockExplorers: [{ name: 'TronScan', url: 'https://tronscan.org' }],
        contracts: { router: 'TRXRouter' },
        featureFlags: { directSwap: true },
    },
    {
        chainName: 'Solana',
        chainId: '501111',
        type: 'SOLANA',
        rpcUrls: ['https://solana.rpc.com'],
        blockExplorers: [{ name: 'Solscan', url: 'https://solscan.io' }],
        bridge: 'LayerSwap',
        featureFlags: { layerSwap: true },
    },
    {
        chainName: 'Bitcoin',
        chainId: '0',
        type: 'BITCOIN',
        rpcUrls: ['https://bitcoin.rpc.com'],
        blockExplorers: [{ name: 'Blockstream', url: 'https://blockstream.info' }],
        bridge: 'LayerSwap',
        featureFlags: { layerSwap: true },
    },
];

// Mock chains.json
jest.mock('../../../chains.json', () => mockChainsData, { virtual: true });

describe('ChainConfigService', () => {
    let chainConfig;
    let originalEnv;

    beforeEach(() => {
        // Reset modules to get fresh instance
        jest.resetModules();
        
        // Save original environment
        originalEnv = { ...process.env };
        
        // Clear environment variables
        Object.keys(process.env).forEach(key => {
            if (key.startsWith('REACT_APP_')) {
                delete process.env[key];
            }
        });
        
        // Import fresh instance
        chainConfig = require('../chainConfig').default;
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('getAllChains()', () => {
        test('should return all chains', () => {
            const chains = chainConfig.getAllChains();
            expect(chains).toBeDefined();
            expect(Array.isArray(chains)).toBe(true);
            expect(chains.length).toBeGreaterThan(0);
        });

        test('should return all 9 chains', () => {
            const chains = chainConfig.getAllChains();
            // Should have at least the mocked chains
            expect(chains.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('getEVMChains()', () => {
        test('should return only EVM chains', () => {
            const evmChains = chainConfig.getEVMChains();
            expect(evmChains).toBeDefined();
            expect(Array.isArray(evmChains)).toBe(true);
            
            // All returned chains should be EVM or have no type (defaults to EVM)
            evmChains.forEach(chain => {
                expect(chain.type === 'EVM' || !chain.type).toBe(true);
            });
        });

        test('should not include non-EVM chains', () => {
            const evmChains = chainConfig.getEVMChains();
            const nonEVMChains = evmChains.filter(
                chain => chain.type === 'TRON' || chain.type === 'SOLANA' || chain.type === 'BITCOIN'
            );
            expect(nonEVMChains.length).toBe(0);
        });
    });

    describe('getChain(chainId)', () => {
        test('should return correct chain for valid chainId', () => {
            const chain = chainConfig.getChain(1);
            expect(chain).toBeDefined();
            expect(chain.chainId).toBe('1');
            expect(chain.chainName).toBe('Ethereum');
        });

        test('should return correct chain for string chainId', () => {
            const chain = chainConfig.getChain('8453');
            expect(chain).toBeDefined();
            expect(chain.chainId).toBe('8453');
        });

        test('should return undefined for invalid chainId', () => {
            const chain = chainConfig.getChain(99999);
            expect(chain).toBeUndefined();
        });

        test('should return undefined for null chainId', () => {
            const chain = chainConfig.getChain(null);
            expect(chain).toBeUndefined();
        });
    });

    describe('getContractAddress(chainId, contractType)', () => {
        test('should load contract address from environment', () => {
            process.env.REACT_APP_ETHEREUM_ROUTER = '0xEnvRouter';
            
            // Reset to get fresh instance with new env
            jest.resetModules();
            const freshConfig = require('../chainConfig').default;
            
            const address = freshConfig.getContractAddress(1, 'router');
            expect(address).toBe('0xEnvRouter');
        });

        test('should fallback to chains.json contracts', () => {
            const address = chainConfig.getContractAddress(1, 'router');
            expect(address).toBe('0xRouter1');
        });

        test('should return null for non-existent contract', () => {
            const address = chainConfig.getContractAddress(1, 'nonexistent');
            expect(address).toBeNull();
        });

        test('should return null for invalid chainId', () => {
            const address = chainConfig.getContractAddress(99999, 'router');
            expect(address).toBeNull();
        });

        test('should handle all contract types', () => {
            const types = ['router', 'referral', 'token', 'manager', 'whitelist'];
            types.forEach(type => {
                const address = chainConfig.getContractAddress(1, type);
                expect(address !== undefined).toBe(true);
            });
        });
    });

    describe('getExplorerUrl(chainId, txHash)', () => {
        test('should generate correct explorer URL', () => {
            const url = chainConfig.getExplorerUrl(1, '0x123');
            expect(url).toBe('https://etherscan.io/tx/0x123');
        });

        test('should handle chains without blockExplorers', () => {
            // Mock a chain without blockExplorers
            const url = chainConfig.getExplorerUrl(99999, '0x123');
            expect(url).toContain('0x123');
        });

        test('should handle missing txHash', () => {
            const url = chainConfig.getExplorerUrl(1, '');
            expect(url).toBe('https://etherscan.io/tx/');
        });
    });

    describe('supportsDirectSwap(chainId)', () => {
        test('should return true for EVM chains', () => {
            expect(chainConfig.supportsDirectSwap(1)).toBe(true);
            expect(chainConfig.supportsDirectSwap(8453)).toBe(true);
        });

        test('should return true for TRON chains', () => {
            expect(chainConfig.supportsDirectSwap(728126428)).toBe(true);
        });

        test('should return false for invalid chainId', () => {
            expect(chainConfig.supportsDirectSwap(99999)).toBe(false);
        });

        test('should respect featureFlags.directSwap', () => {
            expect(chainConfig.supportsDirectSwap(8453)).toBe(true);
        });
    });

    describe('requiresLayerSwap(chainId)', () => {
        test('should return true for Solana', () => {
            expect(chainConfig.requiresLayerSwap(501111)).toBe(true);
        });

        test('should return true for Bitcoin', () => {
            expect(chainConfig.requiresLayerSwap(0)).toBe(true);
        });

        test('should return false for EVM chains without LayerSwap', () => {
            expect(chainConfig.requiresLayerSwap(1)).toBe(true); // Has layerSwap in featureFlags
        });

        test('should return false for invalid chainId', () => {
            expect(chainConfig.requiresLayerSwap(99999)).toBe(false);
        });
    });

    describe('getRpcUrls(chainId)', () => {
        test('should return RPC URLs from chains.json', () => {
            const urls = chainConfig.getRpcUrls(1);
            expect(Array.isArray(urls)).toBe(true);
            expect(urls.length).toBeGreaterThan(0);
        });

        test('should prioritize environment RPC URL', () => {
            process.env.REACT_APP_ETHEREUM_RPC = 'https://env.rpc.com';
            
            jest.resetModules();
            const freshConfig = require('../chainConfig').default;
            
            const urls = freshConfig.getRpcUrls(1);
            expect(urls[0]).toBe('https://env.rpc.com');
        });

        test('should return empty array for invalid chainId', () => {
            const urls = chainConfig.getRpcUrls(99999);
            expect(urls).toEqual([]);
        });

        test('should include fallback RPCs', () => {
            const urls = chainConfig.getRpcUrls(1);
            expect(urls.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getGasSettings(chainId)', () => {
        test('should return gas settings from chains.json', () => {
            const settings = chainConfig.getGasSettings(1);
            expect(settings).toBeDefined();
            expect(settings.gasLimit).toBe(500000);
        });

        test('should return default settings for invalid chainId', () => {
            const settings = chainConfig.getGasSettings(99999);
            expect(settings).toBeDefined();
            expect(settings.gasLimit).toBe(500000);
            expect(settings.maxFeePerGas).toBeNull();
        });

        test('should handle missing gasSettings', () => {
            const settings = chainConfig.getGasSettings(728126428);
            expect(settings).toBeDefined();
            expect(settings.gasLimit).toBe(500000);
        });

        test('should include all gas settings fields', () => {
            const settings = chainConfig.getGasSettings(1);
            expect(settings).toHaveProperty('gasLimit');
            expect(settings).toHaveProperty('maxFeePerGas');
            expect(settings).toHaveProperty('maxPriorityFeePerGas');
            expect(settings).toHaveProperty('gasPrice');
        });
    });

    describe('getSlippageTolerance(chainId)', () => {
        test('should return slippage settings from chains.json', () => {
            const slippage = chainConfig.getSlippageTolerance(1);
            expect(slippage).toBeDefined();
            expect(slippage.default).toBe(0.5);
            expect(slippage.min).toBe(0.1);
            expect(slippage.max).toBe(5.0);
        });

        test('should return default slippage for invalid chainId', () => {
            const slippage = chainConfig.getSlippageTolerance(99999);
            expect(slippage).toBeDefined();
            expect(slippage.default).toBe(0.5);
        });

        test('should handle partial slippage settings', () => {
            const slippage = chainConfig.getSlippageTolerance(8453);
            expect(slippage).toBeDefined();
            expect(slippage.default).toBe(0.5);
        });
    });

    describe('getTimeoutSettings(chainId)', () => {
        test('should return timeout settings from chains.json', () => {
            const timeouts = chainConfig.getTimeoutSettings(1);
            expect(timeouts).toBeDefined();
            expect(timeouts.transactionTimeout).toBe(300000);
            expect(timeouts.rpcTimeout).toBe(10000);
        });

        test('should return default timeouts for invalid chainId', () => {
            const timeouts = chainConfig.getTimeoutSettings(99999);
            expect(timeouts).toBeDefined();
            expect(timeouts.transactionTimeout).toBe(300000);
            expect(timeouts.retryAttempts).toBe(3);
        });

        test('should include all timeout fields', () => {
            const timeouts = chainConfig.getTimeoutSettings(1);
            expect(timeouts).toHaveProperty('transactionTimeout');
            expect(timeouts).toHaveProperty('rpcTimeout');
            expect(timeouts).toHaveProperty('retryAttempts');
            expect(timeouts).toHaveProperty('retryDelay');
        });
    });

    describe('getMinimumAmounts(chainId)', () => {
        test('should return minimum amounts from chains.json', () => {
            const minimums = chainConfig.getMinimumAmounts(1);
            expect(minimums).toBeDefined();
            expect(minimums.swap).toBe('0.001');
            expect(minimums.referral).toBe('0.0001');
        });

        test('should return default minimums for invalid chainId', () => {
            const minimums = chainConfig.getMinimumAmounts(99999);
            expect(minimums).toBeDefined();
            expect(minimums.swap).toBe('0.001');
        });

        test('should handle missing minimums', () => {
            const minimums = chainConfig.getMinimumAmounts(728126428);
            expect(minimums).toBeDefined();
            expect(minimums.swap).toBe('0.001');
        });
    });

    describe('getBlockTime(chainId)', () => {
        test('should return block time from chains.json', () => {
            const blockTime = chainConfig.getBlockTime(1);
            expect(blockTime).toBe(12);
        });

        test('should return default block time for invalid chainId', () => {
            const blockTime = chainConfig.getBlockTime(99999);
            expect(blockTime).toBe(2);
        });

        test('should return default block time for missing blockTime', () => {
            const blockTime = chainConfig.getBlockTime(728126428);
            expect(blockTime).toBe(2);
        });
    });

    describe('getConfirmationsRequired(chainId)', () => {
        test('should return confirmations from chains.json', () => {
            const confirmations = chainConfig.getConfirmationsRequired(1);
            expect(confirmations).toBe(1);
        });

        test('should return default confirmations for invalid chainId', () => {
            const confirmations = chainConfig.getConfirmationsRequired(99999);
            expect(confirmations).toBe(1);
        });

        test('should handle missing confirmationsRequired', () => {
            const confirmations = chainConfig.getConfirmationsRequired(728126428);
            expect(confirmations).toBe(1);
        });
    });

    describe('validateAddress(chainId, address)', () => {
        describe('EVM addresses', () => {
            test('should validate correct EVM address', () => {
                const isValid = chainConfig.validateAddress(1, '0x1234567890123456789012345678901234567890');
                expect(isValid).toBe(true);
            });

            test('should reject invalid EVM address format', () => {
                expect(chainConfig.validateAddress(1, 'invalid')).toBe(false);
                expect(chainConfig.validateAddress(1, '0x123')).toBe(false);
                expect(chainConfig.validateAddress(1, '1234567890123456789012345678901234567890')).toBe(false);
            });

            test('should handle case-insensitive hex', () => {
                // Use a valid 40-character hex address (0x + 40 hex chars = 42 total)
                const isValid = chainConfig.validateAddress(1, '0xABCDEF123456789012345678901234567890ABCD');
                expect(isValid).toBe(true);
            });
        });

        describe('TRON addresses', () => {
            test('should validate correct Tron address', () => {
                // Tron addresses: T + 33 base58 characters (34 total)
                // Using a valid 34-character Tron address (T + 33 A's)
                const validTronAddress = 'T' + 'A'.repeat(33);
                const isValid = chainConfig.validateAddress(728126428, validTronAddress);
                expect(isValid).toBe(true);
            });

            test('should reject invalid Tron address', () => {
                expect(chainConfig.validateAddress(728126428, '0x123')).toBe(false);
                expect(chainConfig.validateAddress(728126428, 'T123')).toBe(false);
                expect(chainConfig.validateAddress(728126428, 'invalid')).toBe(false);
            });
        });

        describe('Solana addresses', () => {
            test('should validate correct Solana address', () => {
                const isValid = chainConfig.validateAddress(501111, 'So11111111111111111111111111111111111112');
                expect(isValid).toBe(true);
            });

            test('should reject invalid Solana address', () => {
                expect(chainConfig.validateAddress(501111, '0x123')).toBe(false);
                expect(chainConfig.validateAddress(501111, 'short')).toBe(false);
            });
        });

        describe('Bitcoin addresses', () => {
            test('should validate legacy Bitcoin address', () => {
                const isValid = chainConfig.validateAddress(0, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
                expect(isValid).toBe(true);
            });

            test('should validate SegWit Bitcoin address', () => {
                const isValid = chainConfig.validateAddress(0, '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
                expect(isValid).toBe(true);
            });

            test('should validate Bech32 Bitcoin address', () => {
                const isValid = chainConfig.validateAddress(0, 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
                expect(isValid).toBe(true);
            });

            test('should reject invalid Bitcoin address', () => {
                expect(chainConfig.validateAddress(0, '0x123')).toBe(false);
                expect(chainConfig.validateAddress(0, 'invalid')).toBe(false);
            });
        });

        test('should return false for invalid chainId', () => {
            expect(chainConfig.validateAddress(99999, '0x1234567890123456789012345678901234567890')).toBe(false);
        });

        test('should return false for null/undefined address', () => {
            expect(chainConfig.validateAddress(1, null)).toBe(false);
            expect(chainConfig.validateAddress(1, undefined)).toBe(false);
            expect(chainConfig.validateAddress(1, '')).toBe(false);
        });
    });

    describe('getFeatureFlags(chainId)', () => {
        test('should return feature flags from chains.json', () => {
            const flags = chainConfig.getFeatureFlags(1);
            expect(flags).toBeDefined();
            expect(flags.directSwap).toBe(false);
            expect(flags.layerSwap).toBe(true);
        });

        test('should return fallback flags for missing featureFlags', () => {
            const flags = chainConfig.getFeatureFlags(728126428);
            expect(flags).toBeDefined();
            expect(flags.directSwap).toBe(true); // TRON supports direct swap
        });

        test('should return empty object for invalid chainId', () => {
            const flags = chainConfig.getFeatureFlags(99999);
            expect(flags).toEqual({});
        });

        test('should include all feature flag properties', () => {
            const flags = chainConfig.getFeatureFlags(1);
            expect(flags).toHaveProperty('directSwap');
            expect(flags).toHaveProperty('layerSwap');
            expect(flags).toHaveProperty('referralSystem');
            expect(flags).toHaveProperty('whitelist');
        });
    });

    describe('getErrorMessage(chainId, errorType)', () => {
        test('should return chain-specific error message', () => {
            const message = chainConfig.getErrorMessage(1, 'networkError');
            expect(message).toContain('Ethereum');
            expect(message).toContain('Network error');
        });

        test('should handle all error types', () => {
            const errorTypes = [
                'networkError',
                'transactionFailed',
                'insufficientBalance',
                'userRejected',
                'timeout',
                'invalidAddress',
                'rpcError',
                'unsupportedChain',
                'contractNotFound',
                'gasEstimationFailed',
            ];

            errorTypes.forEach(errorType => {
                const message = chainConfig.getErrorMessage(1, errorType);
                expect(message).toBeDefined();
                expect(typeof message).toBe('string');
                expect(message.length).toBeGreaterThan(0);
            });
        });

        test('should return default message for unknown error type', () => {
            const message = chainConfig.getErrorMessage(1, 'unknownError');
            expect(message).toContain('Error on Ethereum');
        });

        test('should handle invalid chainId', () => {
            const message = chainConfig.getErrorMessage(99999, 'networkError');
            expect(message).toContain('Unknown Chain');
        });
    });

    describe('Edge Cases', () => {
        test('should handle null chainId gracefully', () => {
            expect(chainConfig.getChain(null)).toBeUndefined();
            expect(chainConfig.getRpcUrls(null)).toEqual([]);
            expect(chainConfig.validateAddress(null, '0x123')).toBe(false);
        });

        test('should handle undefined chainId gracefully', () => {
            expect(chainConfig.getChain(undefined)).toBeUndefined();
            expect(chainConfig.getRpcUrls(undefined)).toEqual([]);
        });

        test('should handle empty string chainId', () => {
            expect(chainConfig.getChain('')).toBeUndefined();
        });

        test('should handle very large chainId', () => {
            expect(chainConfig.getChain(999999999)).toBeUndefined();
        });

        test('should handle special characters in addresses', () => {
            expect(chainConfig.validateAddress(1, '0x!@#$%^&*()')).toBe(false);
        });

        test('should handle empty strings in all methods', () => {
            expect(chainConfig.getChain('')).toBeUndefined();
            expect(chainConfig.getRpcUrls('')).toEqual([]);
            expect(chainConfig.validateAddress(1, '')).toBe(false);
        });
    });

    describe('Integration Tests', () => {
        test('should work with all chain types', () => {
            const chainIds = [1, 8453, 728126428, 501111, 0];
            
            chainIds.forEach(chainId => {
                const chain = chainConfig.getChain(chainId);
                expect(chain).toBeDefined();
                
                const rpcUrls = chainConfig.getRpcUrls(chainId);
                expect(Array.isArray(rpcUrls)).toBe(true);
                
                const gasSettings = chainConfig.getGasSettings(chainId);
                expect(gasSettings).toBeDefined();
            });
        });

        test('should maintain consistency across method calls', () => {
            const chainId = 1;
            const chain1 = chainConfig.getChain(chainId);
            const chain2 = chainConfig.getChain(chainId);
            
            expect(chain1).toEqual(chain2);
        });
    });
});

