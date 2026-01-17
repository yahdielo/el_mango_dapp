/**
 * React Hook for Whitelist Status
 * 
 * Provides hooks for checking whitelist status and tier information
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { whitelistApi } from '../services/mangoApi';

/**
 * Hook to get whitelist status for the connected wallet
 * @returns {Object} { whitelistStatus, loading, error, refetch }
 */
export const useWhitelist = () => {
    const { address } = useAccount();
    const chainId = useChainId();
    const [whitelistStatus, setWhitelistStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWhitelistStatus = useCallback(async () => {
        if (!address) {
            setWhitelistStatus(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await whitelistApi.getWhitelistStatus(address, chainId);
            setWhitelistStatus(data);
        } catch (err) {
            setError(err.message);
            setWhitelistStatus(null);
        } finally {
            setLoading(false);
        }
    }, [address, chainId]);

    useEffect(() => {
        fetchWhitelistStatus();
    }, [fetchWhitelistStatus]);

    return {
        whitelistStatus,
        loading,
        error,
        refetch: fetchWhitelistStatus,
    };
};

