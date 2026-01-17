/**
 * Tests for confirmationTracking Utility
 * 
 * Tests confirmation tracking, estimated time calculation, progress calculation,
 * status generation, and integration with ChainConfigService.
 */

import {
    calculateEstimatedTime,
    formatEstimatedTime,
    getConfirmationProgress,
    getConfirmationStatus,
    trackConfirmations,
    getConfirmationRequirements,
    getTotalConfirmationTime,
} from '../confirmationTracking';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('../../services/chainConfig');

describe('confirmationTracking Utility', () => {
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

        // Default mocks
        chainConfig.getBlockTime.mockReturnValue(12); // Default 12 seconds
        chainConfig.getConfirmationsRequired.mockReturnValue(1); // Default 1 confirmation
    });

    describe('calculateEstimatedTime()', () => {
        test('should return 0 when currentConfirmations >= requiredConfirmations', () => {
            expect(calculateEstimatedTime(8453, 2, 1)).toBe(0);
            expect(calculateEstimatedTime(8453, 5, 5)).toBe(0);
            expect(calculateEstimatedTime(8453, 10, 1)).toBe(0);
        });

        test('should return 0 when chainId is null or undefined', () => {
            expect(calculateEstimatedTime(null, 0, 1)).toBe(0);
            expect(calculateEstimatedTime(undefined, 0, 1)).toBe(0);
            // Note: chainId 0 is valid (Bitcoin), so it should calculate normally
        });

        test('should calculate estimated time correctly with Ethereum (12s block time)', () => {
            chainConfig.getBlockTime.mockReturnValue(12);
            expect(calculateEstimatedTime(1, 0, 1)).toBe(12); // 1 confirmation * 12s
            expect(calculateEstimatedTime(1, 0, 3)).toBe(36); // 3 confirmations * 12s
            expect(calculateEstimatedTime(1, 1, 3)).toBe(24); // 2 remaining * 12s
        });

        test('should calculate estimated time correctly with Bitcoin (600s block time)', () => {
            chainConfig.getBlockTime.mockReturnValue(600);
            expect(calculateEstimatedTime(0, 0, 1)).toBe(600); // 1 confirmation * 600s
            expect(calculateEstimatedTime(0, 0, 3)).toBe(1800); // 3 confirmations * 600s
            expect(calculateEstimatedTime(0, 1, 3)).toBe(1200); // 2 remaining * 600s
        });

        test('should calculate estimated time correctly with Solana (0.4s block time)', () => {
            chainConfig.getBlockTime.mockReturnValue(0.4);
            expect(calculateEstimatedTime(501111, 0, 1)).toBe(0.4); // 1 confirmation * 0.4s
            expect(calculateEstimatedTime(501111, 0, 10)).toBe(4); // 10 confirmations * 0.4s
            expect(calculateEstimatedTime(501111, 5, 10)).toBe(2); // 5 remaining * 0.4s
        });

        test('should handle edge cases with 0 confirmations', () => {
            chainConfig.getBlockTime.mockReturnValue(12);
            expect(calculateEstimatedTime(8453, 0, 1)).toBe(12);
            expect(calculateEstimatedTime(8453, 0, 0)).toBe(0); // requiredConfirmations is 0
        });

        test('should handle negative values gracefully', () => {
            chainConfig.getBlockTime.mockReturnValue(12);
            // Negative currentConfirmations should still calculate
            expect(calculateEstimatedTime(8453, -1, 1)).toBe(24); // 2 remaining * 12s
        });
    });

    describe('formatEstimatedTime()', () => {
        test('should return "Complete" for 0 or negative seconds', () => {
            expect(formatEstimatedTime(0)).toBe('Complete');
            expect(formatEstimatedTime(-1)).toBe('Complete');
            expect(formatEstimatedTime(-100)).toBe('Complete');
        });

        test('should return "Complete" for null or undefined', () => {
            expect(formatEstimatedTime(null)).toBe('Complete');
            expect(formatEstimatedTime(undefined)).toBe('Complete');
        });

        test('should format seconds < 60 as "Xs"', () => {
            expect(formatEstimatedTime(1)).toBe('1s');
            expect(formatEstimatedTime(30)).toBe('30s');
            expect(formatEstimatedTime(59)).toBe('59s');
            expect(formatEstimatedTime(59.5)).toBe('60s'); // Math.ceil rounds up
        });

        test('should format seconds < 3600 as "Xm Ys" or "Xm"', () => {
            expect(formatEstimatedTime(60)).toBe('1m');
            expect(formatEstimatedTime(90)).toBe('1m 30s');
            expect(formatEstimatedTime(120)).toBe('2m');
            expect(formatEstimatedTime(150)).toBe('2m 30s');
            expect(formatEstimatedTime(3599)).toBe('59m 59s');
        });

        test('should format seconds >= 3600 as "Xh Ym" or "Xh"', () => {
            expect(formatEstimatedTime(3600)).toBe('1h');
            expect(formatEstimatedTime(3660)).toBe('1h 1m');
            expect(formatEstimatedTime(3720)).toBe('1h 2m');
            expect(formatEstimatedTime(7200)).toBe('2h');
            expect(formatEstimatedTime(7260)).toBe('2h 1m');
        });

        test('should handle edge cases with fractional seconds', () => {
            expect(formatEstimatedTime(0.5)).toBe('1s'); // Math.ceil rounds up
            expect(formatEstimatedTime(60.5)).toBe('1m 1s'); // Math.ceil rounds up
        });
    });

    describe('getConfirmationProgress()', () => {
        test('should return 100 when requiredConfirmations is 0', () => {
            expect(getConfirmationProgress(0, 0)).toBe(100);
            expect(getConfirmationProgress(5, 0)).toBe(100);
            expect(getConfirmationProgress(10, 0)).toBe(100);
        });

        test('should return 100 when current >= required', () => {
            expect(getConfirmationProgress(1, 1)).toBe(100);
            expect(getConfirmationProgress(5, 1)).toBe(100);
            expect(getConfirmationProgress(10, 5)).toBe(100);
        });

        test('should calculate progress correctly: (current / required) * 100', () => {
            expect(getConfirmationProgress(0, 1)).toBe(0);
            expect(getConfirmationProgress(1, 2)).toBe(50);
            expect(getConfirmationProgress(1, 4)).toBe(25);
            expect(getConfirmationProgress(3, 4)).toBe(75);
            expect(getConfirmationProgress(2, 10)).toBe(20);
        });

        test('should clamp progress to 0-100 range', () => {
            expect(getConfirmationProgress(-1, 1)).toBe(0); // Clamped to 0
            expect(getConfirmationProgress(10, 1)).toBe(100); // Clamped to 100
            expect(getConfirmationProgress(-5, 1)).toBe(0);
            expect(getConfirmationProgress(100, 1)).toBe(100);
        });

        test('should handle edge cases with null values', () => {
            expect(getConfirmationProgress(null, 1)).toBe(0);
            expect(getConfirmationProgress(0, null)).toBe(100); // requiredConfirmations is null/0
        });

        test('should handle fractional progress', () => {
            expect(getConfirmationProgress(1, 3)).toBeCloseTo(33.33, 1);
            expect(getConfirmationProgress(1, 7)).toBeCloseTo(14.29, 1);
        });
    });

    describe('getConfirmationStatus()', () => {
        test('should return success status when current >= required', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const status = getConfirmationStatus(8453, 1, 1);
            expect(status.message).toBe('Confirmed (1/1)');
            expect(status.variant).toBe('success');
            expect(status.isComplete).toBe(true);
        });

        test('should return warning status when currentConfirmations is 0', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const status = getConfirmationStatus(8453, 0, 3);
            expect(status.message).toBe('Waiting for confirmations on Base (0/3)');
            expect(status.variant).toBe('warning');
            expect(status.isComplete).toBe(false);
        });

        test('should return info status when confirming', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            chainConfig.getBlockTime.mockReturnValue(12);
            
            const status = getConfirmationStatus(8453, 1, 3);
            expect(status.message).toContain('Confirming on Base (1/3)');
            expect(status.message).toContain('remaining');
            expect(status.variant).toBe('info');
            expect(status.isComplete).toBe(false);
            expect(status.remainingConfirmations).toBe(2);
            expect(status.estimatedTime).toBe(24); // 2 * 12s
        });

        test('should handle missing chain name gracefully', () => {
            chainConfig.getChain.mockReturnValue(null);
            
            const status = getConfirmationStatus(999, 0, 1);
            expect(status.message).toContain('this chain');
            expect(status.variant).toBe('warning');
        });

        test('should work with different chain types', () => {
            chainConfig.getChain.mockReturnValue({ chainName: 'Bitcoin', type: 'BITCOIN' });
            chainConfig.getBlockTime.mockReturnValue(600);
            
            const status = getConfirmationStatus(0, 0, 1);
            expect(status.message).toContain('Bitcoin');
            expect(status.variant).toBe('warning');
        });
    });

    describe('getConfirmationRequirements()', () => {
        test('should return default values when chainId is null or undefined', () => {
            expect(getConfirmationRequirements(null)).toEqual({
                required: 1,
                blockTime: 2,
            });
            expect(getConfirmationRequirements(undefined)).toEqual({
                required: 1,
                blockTime: 2,
            });
            // Note: chainId 0 is valid (Bitcoin), so it should not return defaults
        });

        test('should retrieve requirements from ChainConfigService', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const requirements = getConfirmationRequirements(8453);
            expect(requirements.required).toBe(3);
            expect(requirements.blockTime).toBe(12);
            expect(requirements.chain).toEqual({ chainName: 'Base', type: 'EVM' });
            expect(chainConfig.getConfirmationsRequired).toHaveBeenCalledWith(8453);
            expect(chainConfig.getBlockTime).toHaveBeenCalledWith(8453);
            expect(chainConfig.getChain).toHaveBeenCalledWith(8453);
        });

        test('should work with all 10 chains', () => {
            const chains = [1, 10, 56, 137, 8453, 42161, 43114, 728126428, 501111, 0];
            
            chains.forEach(chainId => {
                chainConfig.getConfirmationsRequired.mockReturnValue(1);
                chainConfig.getBlockTime.mockReturnValue(12);
                chainConfig.getChain.mockReturnValue({ chainId: String(chainId), chainName: 'Test' });
                
                const requirements = getConfirmationRequirements(chainId);
                expect(requirements).toHaveProperty('required');
                expect(requirements).toHaveProperty('blockTime');
                expect(requirements).toHaveProperty('chain');
            });
        });
    });

    describe('trackConfirmations()', () => {
        test('should return error status when chainId is null or undefined', () => {
            const tracking = trackConfirmations(null, 0);
            expect(tracking.current).toBe(0);
            expect(tracking.required).toBe(1);
            expect(tracking.progress).toBe(0);
            expect(tracking.estimatedTime).toBe(0);
            expect(tracking.status.message).toBe('Chain ID required');
            expect(tracking.status.variant).toBe('secondary');
            expect(tracking.isComplete).toBe(false);
        });

        test('should return complete tracking data structure', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const tracking = trackConfirmations(8453, 1);
            
            expect(tracking).toHaveProperty('current');
            expect(tracking).toHaveProperty('required');
            expect(tracking).toHaveProperty('progress');
            expect(tracking).toHaveProperty('estimatedTime');
            expect(tracking).toHaveProperty('formattedEstimatedTime');
            expect(tracking).toHaveProperty('blockTime');
            expect(tracking).toHaveProperty('status');
            expect(tracking).toHaveProperty('isComplete');
        });

        test('should track confirmations correctly', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const tracking = trackConfirmations(8453, 1);
            
            expect(tracking.current).toBe(1);
            expect(tracking.required).toBe(3);
            expect(tracking.progress).toBeCloseTo(33.33, 1);
            expect(tracking.estimatedTime).toBe(24); // 2 * 12s
            expect(tracking.formattedEstimatedTime).toBe('24s');
            expect(tracking.blockTime).toBe(12);
            expect(tracking.isComplete).toBe(false);
        });

        test('should mark as complete when current >= required', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const tracking = trackConfirmations(8453, 3);
            
            expect(tracking.current).toBe(3);
            expect(tracking.required).toBe(3);
            expect(tracking.progress).toBe(100);
            expect(tracking.estimatedTime).toBe(0);
            expect(tracking.formattedEstimatedTime).toBe('Complete');
            expect(tracking.isComplete).toBe(true);
            expect(tracking.status.variant).toBe('success');
        });

        test('should work with all 10 chains', () => {
            const chains = [
                { id: 1, name: 'Ethereum', blockTime: 12 },
                { id: 10, name: 'Optimism', blockTime: 2 },
                { id: 56, name: 'BSC', blockTime: 3 },
                { id: 137, name: 'Polygon', blockTime: 2 },
                { id: 8453, name: 'Base', blockTime: 2 },
                { id: 42161, name: 'Arbitrum', blockTime: 0.25 },
                { id: 43114, name: 'Avalanche', blockTime: 1 },
                { id: 728126428, name: 'Tron', blockTime: 3 },
                { id: 501111, name: 'Solana', blockTime: 0.4 },
                { id: 0, name: 'Bitcoin', blockTime: 600 },
            ];
            
            chains.forEach(chain => {
                chainConfig.getConfirmationsRequired.mockReturnValue(1);
                chainConfig.getBlockTime.mockReturnValue(chain.blockTime);
                chainConfig.getChain.mockReturnValue({ chainName: chain.name, type: 'EVM' });
                
                const tracking = trackConfirmations(chain.id, 0);
                expect(tracking.current).toBe(0);
                expect(tracking.required).toBe(1);
                expect(tracking.blockTime).toBe(chain.blockTime);
                expect(tracking.isComplete).toBe(false);
            });
        });

        test('should calculate estimated time correctly', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(5);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const tracking = trackConfirmations(8453, 2);
            
            expect(tracking.estimatedTime).toBe(36); // 3 remaining * 12s
            expect(tracking.formattedEstimatedTime).toBe('36s');
        });

        test('should calculate progress correctly', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(10);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            const tracking = trackConfirmations(8453, 3);
            
            expect(tracking.progress).toBe(30); // 3/10 * 100
        });
    });

    describe('getTotalConfirmationTime()', () => {
        test('should return default 2 seconds when chainId is null or undefined', () => {
            expect(getTotalConfirmationTime(null)).toBe(2);
            expect(getTotalConfirmationTime(undefined)).toBe(2);
            // Note: chainId 0 is valid (Bitcoin), so it should calculate normally
        });

        test('should calculate total time: requiredConfirmations * blockTime', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);
            chainConfig.getBlockTime.mockReturnValue(12);
            
            expect(getTotalConfirmationTime(8453)).toBe(36); // 3 * 12s
        });

        test('should work with different chains', () => {
            // Ethereum: 1 confirmation * 12s = 12s
            chainConfig.getConfirmationsRequired.mockReturnValue(1);
            chainConfig.getBlockTime.mockReturnValue(12);
            expect(getTotalConfirmationTime(1)).toBe(12);
            
            // Bitcoin: 1 confirmation * 600s = 600s
            chainConfig.getConfirmationsRequired.mockReturnValue(1);
            chainConfig.getBlockTime.mockReturnValue(600);
            expect(getTotalConfirmationTime(0)).toBe(600);
            
            // Solana: 1 confirmation * 0.4s = 0.4s
            chainConfig.getConfirmationsRequired.mockReturnValue(1);
            chainConfig.getBlockTime.mockReturnValue(0.4);
            expect(getTotalConfirmationTime(501111)).toBe(0.4);
        });

        test('should handle edge cases', () => {
            // 0 confirmations required
            chainConfig.getConfirmationsRequired.mockReturnValue(0);
            chainConfig.getBlockTime.mockReturnValue(12);
            expect(getTotalConfirmationTime(8453)).toBe(0);
            
            // Multiple confirmations
            chainConfig.getConfirmationsRequired.mockReturnValue(10);
            chainConfig.getBlockTime.mockReturnValue(12);
            expect(getTotalConfirmationTime(8453)).toBe(120); // 10 * 12s
        });
    });

    describe('Integration with ChainConfigService', () => {
        test('should use ChainConfigService for all chain-specific data', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);
            chainConfig.getBlockTime.mockReturnValue(12);
            chainConfig.getChain.mockReturnValue({ chainName: 'Base', type: 'EVM' });
            
            trackConfirmations(8453, 1);
            
            expect(chainConfig.getConfirmationsRequired).toHaveBeenCalledWith(8453);
            expect(chainConfig.getBlockTime).toHaveBeenCalledWith(8453);
            expect(chainConfig.getChain).toHaveBeenCalledWith(8453);
        });

        test('should handle ChainConfigService errors gracefully', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(1);
            chainConfig.getBlockTime.mockReturnValue(2);
            chainConfig.getChain.mockReturnValue(null);
            
            const tracking = trackConfirmations(8453, 0);
            
            expect(tracking.status.message).toContain('this chain');
        });
    });
});

