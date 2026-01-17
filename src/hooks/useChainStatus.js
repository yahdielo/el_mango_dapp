/**
 * React Hook for Chain Status
 * 
 * Provides hooks for checking chain status and supported chains
 */

import { useState, useEffect, useCallback } from 'react';
import { chainApi } from '../services/mangoApi';

/**
 * Hook to get list of all supported chains
 * @returns {Object} { chains, loading, error, refetch }
 */
export const useSupportedChains = () => {
    const [chains, setChains] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchChains = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await chainApi.getSupportedChains();
            setChains(data.chains || []);
        } catch (err) {
            setError(err.message);
            setChains([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChains();
    }, [fetchChains]);

    return {
        chains,
        loading,
        error,
        refetch: fetchChains,
    };
};

/**
 * Hook to get status for a specific chain
 * @param {number} chainId - Chain ID to query
 * @returns {Object} { status, loading, error, refetch }
 */
export const useChainStatus = (chainId) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStatus = useCallback(async () => {
        if (!chainId) {
            setStatus(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await chainApi.getChainStatus(chainId);
            setStatus(data);
        } catch (err) {
            setError(err.message);
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, [chainId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    return {
        status,
        loading,
        error,
        refetch: fetchStatus,
    };
};

