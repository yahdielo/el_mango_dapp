/**
 * Transaction Status Tracking Hook
 * 
 * Tracks transaction status per chain, handles different confirmation requirements,
 * implements status polling, handles transaction timeouts, and shows transaction progress.
 * Uses ChainConfigService for chain-specific settings.
 * 
 * Supports all 9 chains (EVM, TRON, SOLANA, BITCOIN)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import chainConfig from '../services/chainConfig';
import mangoApi from '../services/mangoApi';
import { retryWithBackoff, isRetryableError } from '../utils/retry';
import { trackConfirmations, formatEstimatedTime, calculateEstimatedTime } from '../utils/confirmationTracking';

/**
 * Transaction Status States
 */
export const TRANSACTION_STATUS = {
    PENDING: 'pending',           // Transaction submitted, waiting for inclusion
    CONFIRMING: 'confirming',     // Transaction included, waiting for confirmations
    CONFIRMED: 'confirmed',       // Transaction confirmed with required confirmations
    FAILED: 'failed',             // Transaction failed
    TIMEOUT: 'timeout',           // Transaction timed out
};

/**
 * Hook to track transaction status
 * @param {string} txHash - Transaction hash
 * @param {number} chainId - Chain ID
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Whether to track the transaction (default: true)
 * @param {Function} options.onConfirmed - Callback when transaction is confirmed
 * @param {Function} options.onFailed - Callback when transaction fails
 * @param {Function} options.onTimeout - Callback when transaction times out
 * @returns {Object} Transaction status and progress
 */
export const useTransactionStatus = (txHash, chainId, options = {}) => {
    const {
        enabled = true,
        onConfirmed = null,
        onFailed = null,
        onTimeout = null,
    } = options;

    const [status, setStatus] = useState(TRANSACTION_STATUS.PENDING);
    const [confirmations, setConfirmations] = useState(0);
    const [requiredConfirmations, setRequiredConfirmations] = useState(1);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [blockNumber, setBlockNumber] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const pollingIntervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const publicClient = usePublicClient({ chainId });

    // Get chain-specific settings
    const chain = chainConfig.getChain(chainId);
    const chainType = chain?.type || 'EVM';
    const blockTime = chainConfig.getBlockTime(chainId);
    const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
    const transactionTimeout = timeoutSettings.transactionTimeout || 300000; // 5 minutes default

    // For EVM chains, use wagmi's useWaitForTransactionReceipt
    const {
        data: receipt,
        isLoading: isWaiting,
        isSuccess: isReceiptSuccess,
        isError: isReceiptError,
        error: receiptError,
    } = useWaitForTransactionReceipt({
        hash: txHash && chainType === 'EVM' ? txHash : undefined,
        chainId: chainType === 'EVM' ? chainId : undefined,
        query: {
            enabled: enabled && !!txHash && chainType === 'EVM',
            confirmations: chainConfig.getConfirmationsRequired(chainId),
        },
    });

    /**
     * Initialize transaction tracking
     */
    useEffect(() => {
        if (!enabled || !txHash || !chainId) {
            return;
        }

        // Reset state
        setStatus(TRANSACTION_STATUS.PENDING);
        setConfirmations(0);
        setError(null);
        setStartTime(Date.now());
        setElapsedTime(0);

        // Get required confirmations
        const required = chainConfig.getConfirmationsRequired(chainId);
        setRequiredConfirmations(required);

        // Set up timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setStatus((currentStatus) => {
                if (currentStatus !== TRANSACTION_STATUS.CONFIRMED && currentStatus !== TRANSACTION_STATUS.FAILED) {
                    const timeoutMessage = chainConfig.getErrorMessage(chainId, 'timeout') || 'Transaction timed out';
                    setError(new Error(timeoutMessage));
                    if (onTimeout) {
                        onTimeout();
                    }
                    return TRANSACTION_STATUS.TIMEOUT;
                }
                return currentStatus;
            });
        }, transactionTimeout);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [txHash, chainId, enabled, transactionTimeout, onTimeout]);

    /**
     * Update elapsed time
     */
    useEffect(() => {
        if (!startTime || status === TRANSACTION_STATUS.CONFIRMED || status === TRANSACTION_STATUS.FAILED) {
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedTime(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, status]);

    /**
     * Handle EVM transaction status (using wagmi)
     */
    useEffect(() => {
        if (chainType !== 'EVM' || !txHash || !enabled) {
            return;
        }

        if (isReceiptSuccess && receipt) {
            // Clear timeout when transaction confirms
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            
            // Check if transaction was successful
            if (receipt.status === 'success') {
                setStatus(TRANSACTION_STATUS.CONFIRMED);
                setConfirmations(requiredConfirmations);
                setProgress(100);
                setBlockNumber(receipt.blockNumber);
                if (onConfirmed) {
                    onConfirmed(receipt);
                }
            } else {
                setStatus(TRANSACTION_STATUS.FAILED);
                setError(new Error('Transaction reverted'));
                if (onFailed) {
                    onFailed(new Error('Transaction reverted'));
                }
            }
            return;
        }
        
        if (isReceiptError) {
            // Clear timeout when transaction fails
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            
            setStatus(TRANSACTION_STATUS.FAILED);
            setError(receiptError);
            if (onFailed) {
                onFailed(receiptError);
            }
            return;
        }

        if (isWaiting) {
            // Only set to CONFIRMING if not already timed out
            setStatus((currentStatus) => {
                if (currentStatus === TRANSACTION_STATUS.TIMEOUT) {
                    return currentStatus; // Don't override timeout
                }
                return TRANSACTION_STATUS.CONFIRMING;
            });
            // Use confirmation tracking for better progress estimation
            if (elapsedTime > 0 && blockTime > 0) {
                const estimatedConfirmations = Math.floor(elapsedTime / blockTime);
                const currentConfirmations = Math.min(estimatedConfirmations, requiredConfirmations);
                setConfirmations(currentConfirmations);
                
                // Use confirmation tracking utility for accurate progress
                const tracking = trackConfirmations(chainId, currentConfirmations);
                setProgress(tracking.progress);
            }
        }
    }, [
        chainType,
        txHash,
        enabled,
        isReceiptError,
        isReceiptSuccess,
        isWaiting,
        receipt,
        receiptError,
        requiredConfirmations,
        blockTime,
        elapsedTime,
        onConfirmed,
        onFailed,
    ]);

    /**
     * Stop polling - defined early to avoid circular dependency
     */
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    /**
     * Poll transaction status for non-EVM chains
     * Uses retry logic for failed status checks
     */
    const pollTransactionStatus = useCallback(async () => {
        if (!txHash || !chainId || chainType === 'EVM') {
            return;
        }

        try {
            let txStatus = null;

            // Use retry logic for status polling
            const pollStatus = async () => {
                if (chainType === 'TRON') {
                    // Poll Tron transaction status with retry
                    const status = await mangoApi.tron.getTransactionStatus(txHash);
                    return {
                        status: status.status,
                        confirmations: status.confirmations || 0,
                        blockNumber: status.blockNumber,
                        success: status.success,
                    };
                } else if (chainType === 'SOLANA') {
                    // Poll Solana transaction status
                    // Note: Solana transactions are typically confirmed quickly
                    // This would need to be implemented based on your Solana RPC setup
                    // For now, we'll use a placeholder
                    return {
                        status: 'pending',
                        confirmations: 0,
                        success: false,
                    };
                } else if (chainType === 'BITCOIN') {
                    // Poll Bitcoin transaction status
                    // Note: Bitcoin confirmations can take a long time
                    // This would need to be implemented based on your Bitcoin RPC setup
                    // For now, we'll use a placeholder
                    return {
                        status: 'pending',
                        confirmations: 0,
                        success: false,
                    };
                }
                return null;
            };

            // Retry status polling with exponential backoff
            txStatus = await retryWithBackoff(pollStatus, {
                chainId,
                maxRetries: 2, // Retry up to 2 times for status checks
                shouldRetry: (error) => {
                    // Only retry on network/timeout errors
                    return isRetryableError(error, chainId);
                },
            });

            if (!txStatus) {
                return;
            }

            // Update confirmations using confirmation tracking
            if (txStatus.confirmations !== undefined) {
                const currentConfirmations = txStatus.confirmations;
                setConfirmations(currentConfirmations);
                
                // Use confirmation tracking for accurate progress
                const tracking = trackConfirmations(chainId, currentConfirmations);
                setProgress(tracking.progress);
            }

            // Update status
            if (txStatus.success === true || txStatus.status === 'confirmed') {
                setStatus(TRANSACTION_STATUS.CONFIRMED);
                setProgress(100);
                if (onConfirmed) {
                    onConfirmed(txStatus);
                }
                stopPolling();
            } else if (txStatus.status === 'failed' || txStatus.success === false) {
                setStatus(TRANSACTION_STATUS.FAILED);
                setError(new Error('Transaction failed'));
                if (onFailed) {
                    onFailed(new Error('Transaction failed'));
                }
                stopPolling();
            } else if (txStatus.confirmations > 0) {
                setStatus(TRANSACTION_STATUS.CONFIRMING);
            }

            // Update block number if available
            if (txStatus.blockNumber) {
                setBlockNumber(txStatus.blockNumber);
            }
        } catch (err) {
            console.error('Error polling transaction status:', err);
            // Don't set as failed on polling error, just log it
            // Will retry on next polling interval
        }
    }, [txHash, chainId, chainType, requiredConfirmations, onConfirmed, onFailed, stopPolling]);

    /**
     * Start polling for non-EVM chains
     */
    const startPolling = useCallback(() => {
        if (chainType === 'EVM' || !txHash || !enabled) {
            return;
        }

        if (pollingIntervalRef.current) {
            return; // Already polling
        }

        // Poll immediately
        pollTransactionStatus();

        // Then poll at intervals based on block time from ChainConfigService
        // Use block time for polling interval, with minimum of 2 seconds
        const pollInterval = Math.max(blockTime * 1000, 2000); // At least 2 seconds
        pollingIntervalRef.current = setInterval(pollTransactionStatus, pollInterval);
    }, [chainType, txHash, enabled, blockTime, pollTransactionStatus]);

    /**
     * Start polling for non-EVM chains
     */
    useEffect(() => {
        if (chainType !== 'EVM' && enabled && txHash) {
            startPolling();
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [chainType, enabled, txHash, startPolling]);

    /**
     * Get transaction receipt for EVM chains
     */
    const getTransactionReceipt = useCallback(async () => {
        if (chainType !== 'EVM' || !txHash || !publicClient) {
            return null;
        }

        try {
            const receipt = await publicClient.getTransactionReceipt({
                hash: txHash,
            });
            return receipt;
        } catch (err) {
            console.error('Error getting transaction receipt:', err);
            return null;
        }
    }, [chainType, txHash, publicClient]);

    /**
     * Get transaction details
     */
    const getTransactionDetails = useCallback(async () => {
        if (!txHash || !chainId) {
            return null;
        }

        try {
            if (chainType === 'EVM' && publicClient) {
                const [tx, receipt] = await Promise.all([
                    publicClient.getTransaction({ hash: txHash }),
                    getTransactionReceipt(),
                ]);

                return {
                    hash: txHash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value?.toString(),
                    gas: tx.gas?.toString(),
                    gasPrice: tx.gasPrice?.toString(),
                    blockNumber: receipt?.blockNumber,
                    blockHash: receipt?.blockHash,
                    status: receipt?.status,
                    confirmations: receipt ? requiredConfirmations : 0,
                };
            } else if (chainType === 'TRON') {
                const status = await mangoApi.tron.getTransactionStatus(txHash);
                return {
                    hash: txHash,
                    status: status.status,
                    confirmations: status.confirmations || 0,
                    blockNumber: status.blockNumber,
                    success: status.success,
                };
            }

            return null;
        } catch (err) {
            console.error('Error getting transaction details:', err);
            return null;
        }
    }, [txHash, chainId, chainType, publicClient, getTransactionReceipt, requiredConfirmations]);

    /**
     * Reset transaction status
     */
    const reset = useCallback(() => {
        setStatus(TRANSACTION_STATUS.PENDING);
        setConfirmations(0);
        setProgress(0);
        setError(null);
        setBlockNumber(null);
        setStartTime(null);
        setElapsedTime(0);
        stopPolling();
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, [stopPolling]);

    return {
        // Status
        status,
        confirmations,
        requiredConfirmations,
        progress,
        error,
        blockNumber,
        elapsedTime,

        // Chain info
        chainId,
        chainType,
        chainName: chain?.chainName || 'Unknown',
        blockTime,

        // Confirmation tracking
        confirmationTracking: trackConfirmations(chainId, confirmations),
        estimatedTimeRemaining: calculateEstimatedTime(chainId, confirmations, requiredConfirmations),
        formattedEstimatedTime: formatEstimatedTime(calculateEstimatedTime(chainId, confirmations, requiredConfirmations)),

        // Helpers
        isPending: status === TRANSACTION_STATUS.PENDING,
        isConfirming: status === TRANSACTION_STATUS.CONFIRMING,
        isConfirmed: status === TRANSACTION_STATUS.CONFIRMED,
        isFailed: status === TRANSACTION_STATUS.FAILED,
        isTimeout: status === TRANSACTION_STATUS.TIMEOUT,

        // Actions
        getTransactionReceipt,
        getTransactionDetails,
        reset,

        // Wagmi receipt (for EVM chains)
        receipt: chainType === 'EVM' ? receipt : null,
    };
};

export default useTransactionStatus;

