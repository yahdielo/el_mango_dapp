/**
 * React Hook for LayerSwap Integration
 * 
 * Provides hooks for LayerSwap API integration, specifically for Solana and Bitcoin swaps.
 * Can also be used for other chains that require LayerSwap.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { swapApi } from '../services/mangoApi';
import chainConfig from '../services/chainConfig';

/**
 * Chain ID mapping to LayerSwap network identifiers
 */
const LAYERSWAP_NETWORK_MAP = {
    1: 'ethereum',
    8453: 'base',
    42161: 'arbitrum',
    137: 'polygon',
    10: 'optimism',
    56: 'bsc',
    43114: 'avalanche',
    501111: 'solana',
    0: 'bitcoin',
    728126428: 'tron',
};

/**
 * Convert chain ID to LayerSwap network identifier
 */
const chainIdToLayerSwapNetwork = (chainId) => {
    return LAYERSWAP_NETWORK_MAP[chainId] || null;
};

/**
 * Hook to discover LayerSwap routes
 * @param {number} sourceChainId - Source chain ID
 * @param {number} destChainId - Destination chain ID
 * @returns {Object} { routes, loading, error, refetch }
 */
export const useLayerSwapRoutes = (sourceChainId, destChainId) => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRoutes = useCallback(async () => {
        if (!sourceChainId || !destChainId) {
            setRoutes([]);
            return;
        }

        // Check if either chain requires LayerSwap
        const sourceRequiresLS = chainConfig.requiresLayerSwap(sourceChainId);
        const destRequiresLS = chainConfig.requiresLayerSwap(destChainId);

        if (!sourceRequiresLS && !destRequiresLS) {
            setRoutes([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await swapApi.getRoutes(sourceChainId, destChainId);
            setRoutes(data.routes || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch LayerSwap routes');
            setRoutes([]);
        } finally {
            setLoading(false);
        }
    }, [sourceChainId, destChainId]);

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
 * Hook to get LayerSwap fee estimate
 * @param {Object} estimateParams - Estimate parameters
 * @returns {Object} { estimate, loading, error, refetch }
 */
export const useLayerSwapEstimate = (estimateParams) => {
    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEstimate = useCallback(async () => {
        if (!estimateParams?.sourceChainId || !estimateParams?.destChainId || 
            !estimateParams?.amountIn) {
            setEstimate(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await swapApi.getEstimate(estimateParams);
            setEstimate(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch LayerSwap estimate');
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
 * Main hook for LayerSwap integration
 * Handles swap initiation, status polling, and error handling
 * @returns {Object} { initiateSwap, swapStatus, loading, error, cancelSwap, isPolling }
 */
export const useLayerSwap = () => {
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
        if (statusPolling || statusIntervalRef.current || !swapId) return;

        setStatusPolling(true);
        statusIntervalRef.current = setInterval(async () => {
            try {
                const status = await swapApi.getSwapStatus(swapId);
                setSwapStatus(status);

                // Stop polling if swap is completed or failed
                if (['completed', 'failed', 'cancelled'].includes(status?.status)) {
                    stopStatusPolling();
                }
            } catch (err) {
                console.error('Error polling LayerSwap status:', err);
                // Don't stop polling on error, just log it
            }
        }, 5000); // Poll every 5 seconds
    }, [statusPolling, stopStatusPolling]);

    const initiateSwap = useCallback(async (swapParams) => {
        if (!address) {
            const errorMsg = 'Wallet not connected';
            setError(errorMsg);
            throw new Error(errorMsg);
        }

        // Validate that at least one chain requires LayerSwap
        const sourceRequiresLS = chainConfig.requiresLayerSwap(swapParams.sourceChainId);
        const destRequiresLS = chainConfig.requiresLayerSwap(swapParams.destChainId);

        if (!sourceRequiresLS && !destRequiresLS) {
            const errorMsg = 'Neither source nor destination chain requires LayerSwap';
            setError(errorMsg);
            throw new Error(errorMsg);
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
            const errorMsg = err.message || 'Failed to initiate LayerSwap swap';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address, startStatusPolling]);

    const cancelSwap = useCallback(async (swapId) => {
        if (!swapId) {
            throw new Error('Swap ID is required');
        }

        setLoading(true);
        setError(null);

        try {
            const result = await swapApi.cancelSwap(swapId);
            setSwapStatus((prev) => ({ ...prev, status: 'cancelled' }));
            stopStatusPolling();
            return result;
        } catch (err) {
            const errorMsg = err.message || 'Failed to cancel LayerSwap swap';
            setError(errorMsg);
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

export default useLayerSwap;

