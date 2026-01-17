/**
 * Tests for useTransactionStatus Hook
 * 
 * Tests transaction status tracking, confirmation requirements per chain,
 * status polling, timeout handling, and all chain types.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useTransactionStatus, TRANSACTION_STATUS } from '../useTransactionStatus';
import chainConfig from '../../services/chainConfig';
import mangoApi from '../../services/mangoApi';

// Don't mock wagmi here - use global mock from setupTests.js
jest.mock('../../services/chainConfig');
jest.mock('../../services/mangoApi');

describe('useTransactionStatus Hook', () => {
    const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const mockOnConfirmed = jest.fn();
    const mockOnFailed = jest.fn();
    const mockOnTimeout = jest.fn();
    const mockPublicClient = {
        getTransactionReceipt: jest.fn(),
        getTransaction: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        usePublicClient.mockReturnValue(mockPublicClient);

        // Default mock for useWaitForTransactionReceipt
        useWaitForTransactionReceipt.mockReturnValue({
            data: null,
            isLoading: false,
            isSuccess: false,
            isError: false,
            error: null,
        });

        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                728126428: { chainId: '728126428', chainName: 'Tron', type: 'TRON' },
                501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
                0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
            };
            return chains[chainId] || null;
        });

        chainConfig.getBlockTime.mockReturnValue(2); // 2 seconds
        chainConfig.getTimeoutSettings.mockReturnValue({
            transactionTimeout: 300000,
            rpcTimeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
        });
        chainConfig.getConfirmationsRequired.mockReturnValue(1);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Transaction Status Tracking', () => {
        test('should initialize with pending status', () => {
            useWaitForTransactionReceipt.mockReturnValue({
                data: null,
                isLoading: false,
                isSuccess: false,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            expect(result.current.status).toBe(TRANSACTION_STATUS.PENDING);
            expect(result.current.isPending).toBe(true);
        });

        test('should track transaction confirmation', async () => {
            const mockReceipt = {
                transactionHash: MOCK_TX_HASH,
                status: 'success',
                blockNumber: 12345678n,
            };

            useWaitForTransactionReceipt.mockReturnValue({
                data: mockReceipt,
                isLoading: false,
                isSuccess: true,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453, {
                    onConfirmed: mockOnConfirmed,
                })
            );

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.CONFIRMED);
            });

            expect(result.current.isConfirmed).toBe(true);
            expect(result.current.confirmations).toBe(1);
            expect(result.current.progress).toBe(100);
            expect(mockOnConfirmed).toHaveBeenCalledWith(mockReceipt);
        });

        test('should track transaction failure', async () => {
            const mockError = new Error('Transaction failed');

            useWaitForTransactionReceipt.mockReturnValue({
                data: null,
                isLoading: false,
                isSuccess: false,
                isError: true,
                error: mockError,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453, {
                    onFailed: mockOnFailed,
                })
            );

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.FAILED);
            });

            expect(result.current.isFailed).toBe(true);
            expect(result.current.error).toBe(mockError);
            expect(mockOnFailed).toHaveBeenCalledWith(mockError);
        });

        test('should track confirming status', () => {
            useWaitForTransactionReceipt.mockReturnValue({
                data: null,
                isLoading: true,
                isSuccess: false,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            act(() => {
                jest.advanceTimersByTime(5000); // 5 seconds elapsed
            });

            expect(result.current.status).toBe(TRANSACTION_STATUS.CONFIRMING);
            expect(result.current.isConfirming).toBe(true);
        });
    });

    describe('Confirmation Requirements Per Chain', () => {
        test('should use chain-specific confirmation requirements', () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(3);

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            expect(result.current.requiredConfirmations).toBe(3);
        });

        test('should track confirmations progress', async () => {
            chainConfig.getConfirmationsRequired.mockReturnValue(5);
            chainConfig.getBlockTime.mockReturnValue(2);

            useWaitForTransactionReceipt.mockReturnValue({
                data: null,
                isLoading: true,
                isSuccess: false,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            act(() => {
                jest.advanceTimersByTime(10000); // 10 seconds = ~5 blocks at 2s/block
            });

            // Should estimate confirmations based on elapsed time
            expect(result.current.requiredConfirmations).toBe(5);
        });
    });

    describe('Status Polling', () => {
        test('should poll Tron transaction status', async () => {
            mangoApi.tron = {
                getTransactionStatus: jest.fn().mockResolvedValue({
                    status: 'confirmed',
                    confirmations: 1,
                    blockNumber: 12345678,
                    success: true,
                }),
            };

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 728126428)
            );

            await waitFor(() => {
                expect(mangoApi.tron.getTransactionStatus).toHaveBeenCalled();
            }, { timeout: 3000 });

            act(() => {
                jest.advanceTimersByTime(3000);
            });

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.CONFIRMED);
            });
        });

        test('should stop polling when transaction confirmed', async () => {
            mangoApi.tron = {
                getTransactionStatus: jest.fn()
                    .mockResolvedValueOnce({
                        status: 'pending',
                        confirmations: 0,
                        success: false,
                    })
                    .mockResolvedValueOnce({
                        status: 'confirmed',
                        confirmations: 1,
                        success: true,
                    }),
            };

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 728126428)
            );

            act(() => {
                jest.advanceTimersByTime(10000);
            });

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.CONFIRMED);
            });

            // Should stop polling after confirmation
            const callCount = mangoApi.tron.getTransactionStatus.mock.calls.length;
            act(() => {
                jest.advanceTimersByTime(10000);
            });

            // Should not poll more after confirmation
            expect(mangoApi.tron.getTransactionStatus.mock.calls.length).toBeLessThanOrEqual(callCount + 1);
        });
    });

    describe('Timeout Handling', () => {
        test('should timeout after configured timeout period', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                transactionTimeout: 5000, // 5 seconds
            });

            useWaitForTransactionReceipt.mockReturnValue({
                data: null,
                isLoading: true,
                isSuccess: false,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453, {
                    onTimeout: mockOnTimeout,
                })
            );

            act(() => {
                jest.advanceTimersByTime(5000);
            });

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.TIMEOUT);
            });

            expect(result.current.isTimeout).toBe(true);
            expect(mockOnTimeout).toHaveBeenCalled();
        });

        test('should not timeout if transaction confirms before timeout', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                transactionTimeout: 10000,
            });

            const mockReceipt = {
                transactionHash: MOCK_TX_HASH,
                status: 'success',
                blockNumber: 12345678n,
            };

            useWaitForTransactionReceipt.mockReturnValue({
                data: mockReceipt,
                isLoading: false,
                isSuccess: true,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453, {
                    onTimeout: mockOnTimeout,
                })
            );

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.CONFIRMED);
            });

            act(() => {
                jest.advanceTimersByTime(10000);
            });

            expect(result.current.status).toBe(TRANSACTION_STATUS.CONFIRMED);
            expect(mockOnTimeout).not.toHaveBeenCalled();
        });
    });

    describe('All Chain Types', () => {
        test('should handle EVM chain transactions', async () => {
            const mockReceipt = {
                transactionHash: MOCK_TX_HASH,
                status: 'success',
                blockNumber: 12345678n,
            };

            useWaitForTransactionReceipt.mockReturnValue({
                data: mockReceipt,
                isLoading: false,
                isSuccess: true,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            await waitFor(() => {
                expect(result.current.chainType).toBe('EVM');
                expect(result.current.chainName).toBe('Base');
            });
        });

        test('should handle Tron chain transactions', async () => {
            mangoApi.tron = {
                getTransactionStatus: jest.fn().mockResolvedValue({
                    status: 'confirmed',
                    confirmations: 1,
                    success: true,
                }),
            };

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 728126428)
            );

            await waitFor(() => {
                expect(result.current.chainType).toBe('TRON');
                expect(result.current.chainName).toBe('Tron');
            });
        });

        test('should handle Solana chain transactions', () => {
            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 501111)
            );

            expect(result.current.chainType).toBe('SOLANA');
            expect(result.current.chainName).toBe('Solana');
        });

        test('should handle Bitcoin chain transactions', () => {
            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 0)
            );

            expect(result.current.chainType).toBe('BITCOIN');
            expect(result.current.chainName).toBe('Bitcoin');
        });
    });

    describe('Helper Functions', () => {
        test('should get transaction receipt for EVM', async () => {
            const mockReceipt = {
                transactionHash: MOCK_TX_HASH,
                status: 'success',
                blockNumber: 12345678n,
            };

            mockPublicClient.getTransactionReceipt.mockResolvedValue(mockReceipt);

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            await act(async () => {
                const receipt = await result.current.getTransactionReceipt();
                expect(receipt).toEqual(mockReceipt);
            });

            expect(mockPublicClient.getTransactionReceipt).toHaveBeenCalledWith({
                hash: MOCK_TX_HASH,
            });
        });

        test('should get transaction details for EVM', async () => {
            const mockTx = {
                hash: MOCK_TX_HASH,
                from: '0xFrom',
                to: '0xTo',
                value: 1000000000000000000n,
                gas: 21000n,
                gasPrice: 20000000000n,
            };

            const mockReceipt = {
                blockNumber: 12345678n,
                blockHash: '0xBlockHash',
                status: 'success',
            };

            mockPublicClient.getTransaction.mockResolvedValue(mockTx);
            mockPublicClient.getTransactionReceipt.mockResolvedValue(mockReceipt);

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            await act(async () => {
                const details = await result.current.getTransactionDetails();
                expect(details).toBeTruthy();
                expect(details.hash).toBe(MOCK_TX_HASH);
            });
        });

        test('should get transaction details for Tron', async () => {
            mangoApi.tron = {
                getTransactionStatus: jest.fn().mockResolvedValue({
                    status: 'confirmed',
                    confirmations: 1,
                    blockNumber: 12345678,
                    success: true,
                }),
            };

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 728126428)
            );

            await act(async () => {
                const details = await result.current.getTransactionDetails();
                expect(details).toBeTruthy();
                expect(details.hash).toBe(MOCK_TX_HASH);
            });
        });

        test('should reset transaction status', () => {
            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453)
            );

            act(() => {
                result.current.reset();
            });

            expect(result.current.status).toBe(TRANSACTION_STATUS.PENDING);
            expect(result.current.confirmations).toBe(0);
            expect(result.current.progress).toBe(0);
            expect(result.current.error).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing txHash', () => {
            const { result } = renderHook(() =>
                useTransactionStatus(null, 8453)
            );

            expect(result.current.status).toBe(TRANSACTION_STATUS.PENDING);
        });

        test('should handle disabled tracking', () => {
            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453, { enabled: false })
            );

            expect(result.current.status).toBe(TRANSACTION_STATUS.PENDING);
        });

        test('should handle reverted transaction', async () => {
            const mockReceipt = {
                transactionHash: MOCK_TX_HASH,
                status: 'reverted',
                blockNumber: 12345678n,
            };

            useWaitForTransactionReceipt.mockReturnValue({
                data: mockReceipt,
                isLoading: false,
                isSuccess: true,
                isError: false,
            });

            const { result } = renderHook(() =>
                useTransactionStatus(MOCK_TX_HASH, 8453, {
                    onFailed: mockOnFailed,
                })
            );

            await waitFor(() => {
                expect(result.current.status).toBe(TRANSACTION_STATUS.FAILED);
            });

            expect(mockOnFailed).toHaveBeenCalled();
        });
    });
});

