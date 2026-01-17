/**
 * Tests for gasEstimation Utility
 * 
 * Tests gas estimation for different transaction types, gas cost calculation,
 * error handling, and integration with ChainConfigService.
 */

import {
    TRANSACTION_TYPES,
    estimateGas,
    estimateGasCost,
    handleGasEstimationError,
    getRecommendedGasLimit,
} from '../gasEstimation';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('../../services/chainConfig');

describe('gasEstimation Utility', () => {
    let mockPublicClient;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock public client
        mockPublicClient = {
            estimateGas: jest.fn(),
            estimateFeesPerGas: jest.fn(),
        };

        // Mock chain configurations
        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                1: { chainId: '1', chainName: 'Ethereum', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
                10: { chainId: '10', chainName: 'Optimism', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
                56: { chainId: '56', chainName: 'BSC', type: 'EVM', nativeCurrency: { symbol: 'BNB', decimals: 18 } },
                137: { chainId: '137', chainName: 'Polygon', type: 'EVM', nativeCurrency: { symbol: 'MATIC', decimals: 18 } },
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
                42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
                43114: { chainId: '43114', chainName: 'Avalanche', type: 'EVM', nativeCurrency: { symbol: 'AVAX', decimals: 18 } },
            };
            return chains[chainId] || null;
        });

        // Default gas settings
        chainConfig.getGasSettings.mockImplementation((chainId) => ({
            gasLimit: 500000,
            gasPrice: null,
            maxFeePerGas: null,
            maxPriorityFeePerGas: null,
        }));
    });

    describe('TRANSACTION_TYPES constant', () => {
        test('should have all 5 transaction types defined', () => {
            expect(TRANSACTION_TYPES.SWAP).toBe('swap');
            expect(TRANSACTION_TYPES.APPROVE).toBe('approve');
            expect(TRANSACTION_TYPES.TRANSFER).toBe('transfer');
            expect(TRANSACTION_TYPES.CROSS_CHAIN_SWAP).toBe('crossChainSwap');
            expect(TRANSACTION_TYPES.REFERRAL).toBe('referral');
        });

        test('should have correct number of transaction types', () => {
            expect(Object.keys(TRANSACTION_TYPES)).toHaveLength(5);
        });
    });

    describe('estimateGas()', () => {
        test('should estimate gas for SWAP transaction', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            expect(result.gasLimit).toBeGreaterThan(0);
            expect(result.transactionType).toBe(TRANSACTION_TYPES.SWAP);
            expect(result.gasConfig).toHaveProperty('gas');
            expect(chainConfig.getGasSettings).toHaveBeenCalledWith(8453);
        });

        test('should estimate gas for APPROVE transaction', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.APPROVE);
            
            expect(result.gasLimit).toBeGreaterThan(0);
            expect(result.transactionType).toBe(TRANSACTION_TYPES.APPROVE);
        });

        test('should estimate gas for TRANSFER transaction', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.TRANSFER);
            
            expect(result.gasLimit).toBeGreaterThan(0);
            expect(result.transactionType).toBe(TRANSACTION_TYPES.TRANSFER);
        });

        test('should estimate gas for CROSS_CHAIN_SWAP transaction', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.CROSS_CHAIN_SWAP);
            
            expect(result.gasLimit).toBeGreaterThan(0);
            expect(result.transactionType).toBe(TRANSACTION_TYPES.CROSS_CHAIN_SWAP);
        });

        test('should estimate gas for REFERRAL transaction', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.REFERRAL);
            
            expect(result.gasLimit).toBeGreaterThan(0);
            expect(result.transactionType).toBe(TRANSACTION_TYPES.REFERRAL);
        });

        test('should work with all 7 EVM chains', async () => {
            const chains = [1, 10, 56, 137, 8453, 42161, 43114];
            
            for (const chainId of chains) {
                const result = await estimateGas(chainId, TRANSACTION_TYPES.SWAP);
                expect(result.gasLimit).toBeGreaterThan(0);
                expect(result.chainName).toBeDefined();
            }
        });

        test('should use ChainConfigService for base gas settings', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            });

            await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            expect(chainConfig.getGasSettings).toHaveBeenCalledWith(8453);
        });

        test('should apply chain-specific multipliers', async () => {
            // Ethereum has 1.2 multiplier
            const ethereumResult = await estimateGas(1, TRANSACTION_TYPES.SWAP);
            
            // Base has 1.0 multiplier
            const baseResult = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            // Ethereum should have higher gas limit due to multiplier
            expect(ethereumResult.gasLimit).toBeGreaterThan(baseResult.gasLimit);
        });

        test('should use chain config gas limit when available', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
                gasPrice: null,
            });

            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            // Should use chain config as base
            expect(result.gasLimit).toBeGreaterThan(0);
        });

        test('should use custom gas limit override', async () => {
            const customLimit = 1000000;
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                customGasLimit: customLimit,
            });
            
            expect(result.gasLimit).toBe(customLimit);
        });

        test('should use dynamic estimation when publicClient provided', async () => {
            mockPublicClient.estimateGas.mockResolvedValue(BigInt(400000));
            
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                publicClient: mockPublicClient,
                transactionParams: {
                    to: '0x123',
                    value: BigInt(1000),
                },
            });
            
            expect(mockPublicClient.estimateGas).toHaveBeenCalled();
            expect(result.gasLimit).toBeGreaterThan(0);
        });

        test('should add 20% buffer to dynamic estimate', async () => {
            const dynamicEstimate = 400000;
            mockPublicClient.estimateGas.mockResolvedValue(BigInt(dynamicEstimate));
            
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                publicClient: mockPublicClient,
                transactionParams: {
                    to: '0x123',
                    value: BigInt(1000),
                },
            });
            
            // Should add 20% buffer: 400000 * 1.2 = 480000
            expect(result.gasLimit).toBeGreaterThanOrEqual(480000);
        });

        test('should fallback to static estimate when dynamic estimation fails', async () => {
            mockPublicClient.estimateGas.mockRejectedValue(new Error('Estimation failed'));
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                publicClient: mockPublicClient,
                transactionParams: {
                    to: '0x123',
                    value: BigInt(1000),
                },
            });
            
            expect(result.gasLimit).toBeGreaterThan(0);
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        test('should include gasPrice in gasConfig when available', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
                gasPrice: 20000000000, // 20 gwei
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            });

            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            expect(result.gasConfig).toHaveProperty('gasPrice');
            expect(result.gasConfig.gasPrice.toString()).toBe('20000000000');
        });

        test('should include maxFeePerGas and maxPriorityFeePerGas when available', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
                gasPrice: null,
                maxFeePerGas: 30000000000,
                maxPriorityFeePerGas: 2000000000,
            });

            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            expect(result.gasConfig).toHaveProperty('maxFeePerGas');
            expect(result.gasConfig).toHaveProperty('maxPriorityFeePerGas');
            expect(result.gasConfig.maxFeePerGas.toString()).toBe('30000000000');
            expect(result.gasConfig.maxPriorityFeePerGas.toString()).toBe('2000000000');
        });

        test('should handle missing chain gracefully', async () => {
            chainConfig.getChain.mockReturnValue(null);
            
            const result = await estimateGas(999, TRANSACTION_TYPES.SWAP);
            
            expect(result.chainName).toBe('Unknown');
            expect(result.gasLimit).toBeGreaterThan(0);
        });

        test('should handle invalid transaction type', async () => {
            // Mock gasSettings to not have gasLimit to avoid chain config override
            chainConfig.getGasSettings.mockReturnValueOnce({
                gasLimit: null,
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            });
            
            const result = await estimateGas(8453, 'invalidType');
            
            // Should fallback to default 300000
            expect(result.gasLimit).toBe(300000);
        });
    });

    describe('estimateGasCost()', () => {
        test('should calculate gas cost: gasLimit * gasPrice', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
                gasPrice: 20000000000, // 20 gwei
            });

            const result = await estimateGasCost(8453, 500000);
            
            expect(result.gasCost.toString()).toBe((500000 * 20000000000).toString());
            expect(result.gasPrice).toBe(20000000000);
            expect(result.gasLimit).toBe(500000);
        });

        test('should use current gas price from publicClient when available', async () => {
            mockPublicClient.estimateFeesPerGas.mockResolvedValue({
                maxFeePerGas: BigInt(30000000000),
                gasPrice: BigInt(25000000000),
            });

            const result = await estimateGasCost(8453, 500000, {
                publicClient: mockPublicClient,
            });
            
            expect(mockPublicClient.estimateFeesPerGas).toHaveBeenCalled();
            expect(result.gasPrice).toBeGreaterThan(0);
        });

        test('should fallback to chain config gas price', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: 20000000000,
            });

            const result = await estimateGasCost(8453, 500000);
            
            expect(result.gasPrice).toBe(20000000000);
        });

        test('should use maxFeePerGas if gasPrice not available', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: null,
                maxFeePerGas: 30000000000,
            });

            const result = await estimateGasCost(8453, 500000);
            
            expect(result.gasPrice).toBe(30000000000);
        });

        test('should return error when gas price cannot be determined', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: null,
                maxFeePerGas: null,
            });

            const result = await estimateGasCost(8453, 500000);
            
            expect(result.gasCost).toBeNull();
            expect(result.gasCostFormatted).toBe('Unknown');
            expect(result.error).toBe('Could not determine gas price');
        });

        test('should format gas cost correctly', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: 20000000000, // 20 gwei
            });

            const result = await estimateGasCost(8453, 500000);
            
            expect(result.gasCostFormatted).toBeDefined();
            expect(result.gasCostFormatted).not.toBe('Unknown');
        });

        test('should handle different native currencies', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: 20000000000,
            });

            const bscResult = await estimateGasCost(56, 500000);
            expect(bscResult.nativeCurrency).toBe('BNB');

            const polygonResult = await estimateGasCost(137, 500000);
            expect(polygonResult.nativeCurrency).toBe('MATIC');
        });

        test('should handle publicClient errors gracefully', async () => {
            mockPublicClient.estimateFeesPerGas.mockRejectedValue(new Error('Failed'));
            
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: 20000000000,
            });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = await estimateGasCost(8453, 500000, {
                publicClient: mockPublicClient,
            });
            
            expect(result.gasPrice).toBe(20000000000); // Should fallback
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        test('should handle edge cases with zero values', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasPrice: 0,
            });

            const result = await estimateGasCost(8453, 0);
            
            expect(result.gasCost.toString()).toBe('0');
        });
    });

    describe('handleGasEstimationError()', () => {
        test('should parse insufficient funds error', () => {
            const error = new Error('insufficient funds for gas');
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.errorType).toBe('insufficientFunds');
            expect(result.message).toBe('Insufficient funds for gas');
            expect(result.recoverySuggestion).toBe('Add more native token to your wallet');
        });

        test('should parse execution reverted error', () => {
            const error = new Error('execution reverted');
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.errorType).toBe('executionReverted');
            expect(result.message).toBe('Transaction would revert');
            expect(result.recoverySuggestion).toBe('Check transaction parameters');
        });

        test('should parse gas exceeds allowance error', () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
            });

            const error = new Error('gas required exceeds allowance');
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.errorType).toBe('gasExceedsAllowance');
            expect(result.message).toBe('Gas limit too low');
            expect(result.recoverySuggestion).toContain('750000'); // 500000 * 1.5
        });

        test('should handle unknown error types', () => {
            const error = new Error('Unknown error');
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.errorType).toBe('unknown');
            expect(result.message).toBe('Unknown error');
            expect(result.recoverySuggestion).toBe('Try again or increase gas limit');
        });

        test('should include chain name in result', () => {
            const error = new Error('Test error');
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.chainName).toBe('Base');
        });

        test('should handle missing chain gracefully', () => {
            chainConfig.getChain.mockReturnValue(null);
            
            const error = new Error('Test error');
            const result = handleGasEstimationError(error, 999);
            
            expect(result.chainName).toBe('Unknown');
        });

        test('should include default gas limit in result', () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
            });

            const error = new Error('Test error');
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.defaultGasLimit).toBe(500000);
        });

        test('should handle error without message', () => {
            const error = {};
            const result = handleGasEstimationError(error, 8453);
            
            expect(result.message).toBe('Gas estimation failed');
        });
    });

    describe('getRecommendedGasLimit()', () => {
        test('should return recommended gas limit for SWAP', () => {
            const limit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP);
            
            expect(limit).toBeGreaterThan(0);
            expect(chainConfig.getGasSettings).toHaveBeenCalledWith(8453);
        });

        test('should return recommended gas limit for APPROVE', () => {
            const limit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.APPROVE);
            
            expect(limit).toBeGreaterThan(0);
            expect(limit).toBeLessThan(getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP));
        });

        test('should use ChainConfigService settings', () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
            });

            const limit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP);
            
            expect(limit).toBeGreaterThan(0);
            expect(chainConfig.getGasSettings).toHaveBeenCalledWith(8453);
        });

        test('should apply chain multipliers', () => {
            // Mock gasSettings to not have gasLimit so multipliers are applied
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: null, // No chain config limit, use base * multiplier
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            });
            
            // Ethereum has 1.2 multiplier: 300000 * 1.2 = 360000
            const ethereumLimit = getRecommendedGasLimit(1, TRANSACTION_TYPES.SWAP);
            
            // Base has 1.0 multiplier: 300000 * 1.0 = 300000
            const baseLimit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP);
            
            // Ethereum should be higher due to multiplier
            expect(ethereumLimit).toBeGreaterThan(baseLimit);
        });

        test('should fallback to base limits when chain config not available', () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: null,
            });

            const limit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP);
            
            // Should use BASE_GAS_LIMITS[SWAP] = 300000
            expect(limit).toBe(300000);
        });

        test('should work with all transaction types', () => {
            const swapLimit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP);
            const approveLimit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.APPROVE);
            const transferLimit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.TRANSFER);
            const crossChainLimit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.CROSS_CHAIN_SWAP);
            const referralLimit = getRecommendedGasLimit(8453, TRANSACTION_TYPES.REFERRAL);
            
            expect(swapLimit).toBeGreaterThan(0);
            expect(approveLimit).toBeGreaterThan(0);
            expect(transferLimit).toBeGreaterThan(0);
            expect(crossChainLimit).toBeGreaterThan(0);
            expect(referralLimit).toBeGreaterThan(0);
            
            // CROSS_CHAIN_SWAP should be highest
            expect(crossChainLimit).toBeGreaterThan(swapLimit);
        });

        test('should work with all 7 EVM chains', () => {
            const chains = [1, 10, 56, 137, 8453, 42161, 43114];
            
            chains.forEach(chainId => {
                const limit = getRecommendedGasLimit(chainId, TRANSACTION_TYPES.SWAP);
                expect(limit).toBeGreaterThan(0);
            });
        });

        test('should handle invalid transaction type', () => {
            // Mock gasSettings to not have gasLimit to avoid chain config override
            const originalMock = chainConfig.getGasSettings.getMockImplementation();
            chainConfig.getGasSettings.mockReturnValueOnce({
                gasLimit: null,
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            });
            
            const limit = getRecommendedGasLimit(8453, 'invalidType');
            
            // Should fallback to default 300000
            expect(limit).toBe(300000);
            
            // Restore original mock
            if (originalMock) {
                chainConfig.getGasSettings.mockImplementation(originalMock);
            }
        });
    });

    describe('Integration with ChainConfigService', () => {
        test('should call getGasSettings() for all functions', async () => {
            await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            await estimateGasCost(8453, 500000);
            getRecommendedGasLimit(8453, TRANSACTION_TYPES.SWAP);
            handleGasEstimationError(new Error('test'), 8453);
            
            expect(chainConfig.getGasSettings).toHaveBeenCalledTimes(4);
        });

        test('should use chain-specific settings', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: 500000,
                gasPrice: 20000000000,
            });

            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            expect(result.gasSettings.gasLimit).toBe(500000);
        });

        test('should fallback to defaults when settings not available', async () => {
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: null,
                gasPrice: null,
            });

            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP);
            
            expect(result.gasLimit).toBeGreaterThan(0);
        });
    });

    describe('Edge cases and error scenarios', () => {
        test('should handle null chainId', async () => {
            chainConfig.getChain.mockReturnValue(null);
            chainConfig.getGasSettings.mockReturnValue({
                gasLimit: null,
            });

            const result = await estimateGas(null, TRANSACTION_TYPES.SWAP);
            
            expect(result.chainName).toBe('Unknown');
        });

        test('should handle missing publicClient gracefully', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                transactionParams: { to: '0x123' },
            });
            
            // Should use static estimation
            expect(result.gasLimit).toBeGreaterThan(0);
        });

        test('should handle non-EVM chains', async () => {
            chainConfig.getChain.mockReturnValue({
                chainName: 'Tron',
                type: 'TRON',
            });

            mockPublicClient.estimateGas.mockResolvedValue(BigInt(400000));
            
            const result = await estimateGas(728126428, TRANSACTION_TYPES.SWAP, {
                publicClient: mockPublicClient,
                transactionParams: { to: '0x123' },
            });
            
            // Should not use dynamic estimation for non-EVM
            expect(mockPublicClient.estimateGas).not.toHaveBeenCalled();
            expect(result.gasLimit).toBeGreaterThan(0);
        });

        test('should handle very large gas limits', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                customGasLimit: 10000000,
            });
            
            expect(result.gasLimit).toBe(10000000);
        });

        test('should handle zero gas limit', async () => {
            const result = await estimateGas(8453, TRANSACTION_TYPES.SWAP, {
                customGasLimit: 0,
            });
            
            expect(result.gasLimit).toBe(0);
        });
    });
});

