/**
 * Tests for useNetworkDetection Hook
 * 
 * Tests network mismatch detection, network switching, error handling, and state maintenance.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useNetworkDetection } from '../useNetworkDetection';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('wagmi');
jest.mock('../../services/chainConfig');

describe('useNetworkDetection Hook', () => {
    const mockSwitchChain = jest.fn();
    const mockOnError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        useAccount.mockReturnValue({
            address: '0x1234567890123456789012345678901234567890',
            isConnected: true,
        });

        useChainId.mockReturnValue(8453); // Base

        useSwitchChain.mockReturnValue({
            switchChain: mockSwitchChain,
            isPending: false,
            error: null,
        });

        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
                1: { chainId: '1', chainName: 'Ethereum', type: 'EVM' },
            };
            return chains[chainId] || null;
        });

        chainConfig.getErrorMessage.mockReturnValue('Network error occurred');
    });

    describe('Network Mismatch Detection', () => {
        test('should detect network mismatch', () => {
            useChainId.mockReturnValue(8453); // Current: Base
            const requiredChainId = 42161; // Required: Arbitrum

            const { result } = renderHook(() => useNetworkDetection(requiredChainId));

            expect(result.current.isMismatch).toBe(true);
            expect(result.current.currentChainId).toBe(8453);
            expect(result.current.requiredChainId).toBe(42161);
        });

        test('should not detect mismatch when networks match', () => {
            useChainId.mockReturnValue(8453);
            const requiredChainId = 8453;

            const { result } = renderHook(() => useNetworkDetection(requiredChainId));

            expect(result.current.isMismatch).toBe(false);
        });

        test('should not detect mismatch when wallet not connected', () => {
            useAccount.mockReturnValue({
                address: null,
                isConnected: false,
            });

            useChainId.mockReturnValue(8453);
            const requiredChainId = 42161;

            const { result } = renderHook(() => useNetworkDetection(requiredChainId));

            expect(result.current.isMismatch).toBe(false);
        });

        test('should not detect mismatch when no required chain', () => {
            useChainId.mockReturnValue(8453);

            const { result } = renderHook(() => useNetworkDetection(null));

            expect(result.current.isMismatch).toBe(false);
        });
    });

    describe('Network Switching', () => {
        test('should switch to required network successfully', async () => {
            useChainId.mockReturnValue(8453);
            mockSwitchChain.mockResolvedValue({ id: 42161 });

            const { result } = renderHook(() => useNetworkDetection(42161));

            await act(async () => {
                const success = await result.current.switchToRequiredNetwork();
                expect(success).toBe(true);
            });

            expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 42161 });
            expect(result.current.error).toBeNull();
        });

        test('should handle switch failure', async () => {
            useChainId.mockReturnValue(8453);
            mockSwitchChain.mockRejectedValue(new Error('User rejected'));

            const { result } = renderHook(() => useNetworkDetection(42161));

            await act(async () => {
                const success = await result.current.switchToRequiredNetwork();
                expect(success).toBe(false);
            });

            expect(result.current.error).toBeTruthy();
        });

        test('should return true if already on correct network', async () => {
            useChainId.mockReturnValue(8453);

            const { result } = renderHook(() => useNetworkDetection(8453));

            await act(async () => {
                const success = await result.current.switchToRequiredNetwork();
                expect(success).toBe(true);
            });

            expect(mockSwitchChain).not.toHaveBeenCalled();
        });

        test('should switch to specific chain', async () => {
            useChainId.mockReturnValue(8453);
            mockSwitchChain.mockResolvedValue({ id: 1 });

            const { result } = renderHook(() => useNetworkDetection(null));

            await act(async () => {
                const success = await result.current.switchToChain(1);
                expect(success).toBe(true);
            });

            expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 1 });
        });

        test('should handle invalid chain ID', async () => {
            chainConfig.getChain.mockReturnValue(null);

            const { result } = renderHook(() => useNetworkDetection(null));

            await act(async () => {
                const success = await result.current.switchToChain(99999);
                expect(success).toBe(false);
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Chain not supported');
            });
        });

        test('should handle wallet not connected during switch', async () => {
            useAccount.mockReturnValue({
                address: null,
                isConnected: false,
            });

            const { result } = renderHook(() => useNetworkDetection(42161));

            await act(async () => {
                const success = await result.current.switchToRequiredNetwork();
                expect(success).toBe(false);
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Wallet not connected');
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle switch error from wagmi', () => {
            useSwitchChain.mockReturnValue({
                switchChain: mockSwitchChain,
                isPending: false,
                error: { message: 'User rejected network switch' },
            });

            const { result } = renderHook(() => useNetworkDetection(42161));

            expect(result.current.error).toBe('User rejected network switch');
        });

        test('should use chain-specific error message', async () => {
            useChainId.mockReturnValue(8453);
            mockSwitchChain.mockRejectedValue(new Error('Switch failed'));
            chainConfig.getErrorMessage.mockReturnValue('Arbitrum network error');

            const { result } = renderHook(() => useNetworkDetection(42161));

            await act(async () => {
                await result.current.switchToRequiredNetwork();
            });

            expect(chainConfig.getErrorMessage).toHaveBeenCalledWith(42161, 'networkError');
        });

        test('should clear error when network matches', () => {
            useChainId.mockReturnValue(8453);
            useSwitchChain.mockReturnValue({
                switchChain: mockSwitchChain,
                isPending: false,
                error: { message: 'Previous error' },
            });

            const { result, rerender } = renderHook(() => useNetworkDetection(8453));

            // Initially might have error
            // When network matches, error should clear
            act(() => {
                useSwitchChain.mockReturnValue({
                    switchChain: mockSwitchChain,
                    isPending: false,
                    error: null,
                });
                rerender();
            });

            expect(result.current.isMismatch).toBe(false);
        });
    });

    describe('State Maintenance', () => {
        test('should maintain current chain info', () => {
            useChainId.mockReturnValue(8453);

            const { result } = renderHook(() => useNetworkDetection(42161));

            expect(result.current.currentChain).toEqual({
                chainId: '8453',
                chainName: 'Base',
                type: 'EVM',
            });
        });

        test('should maintain required chain info', () => {
            useChainId.mockReturnValue(8453);

            const { result } = renderHook(() => useNetworkDetection(42161));

            expect(result.current.requiredChain).toEqual({
                chainId: '42161',
                chainName: 'Arbitrum',
                type: 'EVM',
            });
        });

        test('should track checking state', async () => {
            useChainId.mockReturnValue(8453);
            mockSwitchChain.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const { result } = renderHook(() => useNetworkDetection(42161));

            act(() => {
                result.current.switchToRequiredNetwork();
            });

            expect(result.current.isChecking).toBe(true);

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 150));
            });

            expect(result.current.isChecking).toBe(false);
        });

        test('should track isSupported state', () => {
            useChainId.mockReturnValue(8453);

            const { result } = renderHook(() => useNetworkDetection(42161));

            expect(result.current.isSupported).toBe(true);
        });

        test('should return false for unsupported chain', () => {
            chainConfig.getChain.mockReturnValue(null);

            const { result } = renderHook(() => useNetworkDetection(99999));

            expect(result.current.isSupported).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle null requiredChainId', () => {
            const { result } = renderHook(() => useNetworkDetection(null));

            expect(result.current.isMismatch).toBe(false);
            expect(result.current.requiredChain).toBeNull();
        });

        test('should handle missing chain info gracefully', () => {
            chainConfig.getChain.mockReturnValue(null);

            const { result } = renderHook(() => useNetworkDetection(99999));

            expect(result.current.requiredChain).toBeNull();
            expect(result.current.isSupported).toBe(false);
        });

        test('should handle switch chain when already switching', async () => {
            useChainId.mockReturnValue(8453);
            useSwitchChain.mockReturnValue({
                switchChain: mockSwitchChain,
                isPending: true,
                error: null,
            });

            const { result } = renderHook(() => useNetworkDetection(42161));

            expect(result.current.isChecking).toBe(true);
        });
    });
});

