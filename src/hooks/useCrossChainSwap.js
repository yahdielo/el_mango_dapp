/**
 * React Hook for Cross-Chain Swap Management
 * 
 * Provides hooks for initiating and tracking cross-chain swaps via LayerSwap
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { swapApi } from '../services/mangoApi';

/**
 * Hook to get available cross-chain routes
 * @param {number} sourceChainId - Source chain ID
 * @param {number} destChainId - Destination chain ID
 * @param {string} [tokenIn] - Optional source token
 * @param {string} [tokenOut] - Optional destination token
 * @returns {Object} { routes, loading, error, refetch }
 */
export const useSwapRoutes = (sourceChainId, destChainId, tokenIn = null, tokenOut = null) => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRoutes = useCallback(async () => {
        if (!sourceChainId || !destChainId) {
            setRoutes([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await swapApi.getRoutes(sourceChainId, destChainId, tokenIn, tokenOut);
            setRoutes(data.routes || []);
        } catch (err) {
            setError(err.message);
            setRoutes([]);
        } finally {
            setLoading(false);
        }
    }, [sourceChainId, destChainId, tokenIn, tokenOut]);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    return {
        routes,
        loading,
        error,
        refetch: fetchRoutes,
    };
};

/**
 * Hook to get fee estimate for a cross-chain swap
 * @param {Object} estimateParams - Estimate parameters
 * @returns {Object} { estimate, loading, error, refetch }
 */
export const useSwapEstimate = (estimateParams) => {
    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEstimate = useCallback(async () => {
        if (!estimateParams?.sourceChainId || !estimateParams?.destChainId || 
            !estimateParams?.tokenIn || !estimateParams?.tokenOut || !estimateParams?.amountIn) {
            setEstimate(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await swapApi.getEstimate(estimateParams);
            setEstimate(data);
        } catch (err) {
            setError(err.message);
            setEstimate(null);
        } finally {
            setLoading(false);
        }
    }, [estimateParams]);

    useEffect(() => {
        fetchEstimate();
    }, [fetchEstimate]);

    return {
        estimate,
        loading,
        error,
        refetch: fetchEstimate,
    };
};

/**
 * Hook to initiate and track a cross-chain swap
 * @returns {Object} { initiateSwap, swapStatus, loading, error, cancelSwap }
 */
export const useCrossChainSwap = () => {
    const { address } = useAccount();
    const [swapStatus, setSwapStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusPolling, setStatusPolling] = useState(false);
    const statusIntervalRef = useRef(null);

    const stopStatusPolling = useCallback(() => {
        if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
            statusIntervalRef.current = null;
        }
        setStatusPolling(false);
    }, []);

    const startStatusPolling = useCallback((swapId) => {
        if (statusPolling || statusIntervalRef.current) return;

        setStatusPolling(true);
        statusIntervalRef.current = setInterval(async () => {
            try {
                const status = await swapApi.getSwapStatus(swapId);
                setSwapStatus(status);

                // Stop polling if swap is completed or failed
                if (['completed', 'failed', 'cancelled'].includes(status.status)) {
                    stopStatusPolling();
                }
            } catch (err) {
                console.error('Error polling swap status:', err);
            }
        }, 5000); // Poll every 5 seconds
    }, [statusPolling, stopStatusPolling]);

    const initiateSwap = useCallback(async (swapParams) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        setLoading(true);
        setError(null);

        try {
            const result = await swapApi.initiateCrossChainSwap({
                ...swapParams,
                recipient: address,
            });

            setSwapStatus(result);

            // Start polling for status updates
            if (result.swapId) {
                startStatusPolling(result.swapId);
            }

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address, startStatusPolling]);

    const cancelSwap = useCallback(async (swapId) => {
        setLoading(true);
        setError(null);

        try {
            const result = await swapApi.cancelSwap(swapId);
            setSwapStatus((prev) => ({ ...prev, status: 'cancelled' }));
            stopStatusPolling();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [stopStatusPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopStatusPolling();
        };
    }, [stopStatusPolling]);

    return {
        initiateSwap,
        swapStatus,
        loading,
        error,
        cancelSwap,
        isPolling: statusPolling,
    };
};
