/**
 * React Hook for Referral Chain Management
 * 
 * Provides hooks for checking and managing referral chains across different chains
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { referralApi } from '../services/mangoApi';

/**
 * Hook to get referral chain information for the connected wallet
 * @param {boolean} checkAllChains - If true, fetches referrals across all chains
 * @returns {Object} { referral, loading, error, refetch }
 */
export const useReferralChain = (checkAllChains = false) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const [referral, setReferral] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReferral = useCallback(async () => {
        if (!address) {
            setReferral(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await referralApi.getReferralChain(
                address,
                checkAllChains ? null : chainId,
                checkAllChains
            );
            setReferral(data);
        } catch (err) {
            // Treat "Referral not found" (404) as a valid state, not an error
            // This means the user doesn't have a referral, which is normal
            if (err.message && err.message.includes('Referral not found')) {
                setReferral(null);
                setError(null); // Clear error - this is a valid state
            } else {
                setError(err.message);
                setReferral(null);
            }
        } finally {
            setLoading(false);
        }
    }, [address, chainId, checkAllChains]);

    useEffect(() => {
        fetchReferral();
    }, [fetchReferral]);

    return {
        referral,
        loading,
        error,
        refetch: fetchReferral,
    };
};

/**
 * Hook to sync referral to a new chain
 * @returns {Object} { syncReferral, syncing, error }
 */
export const useReferralSync = () => {
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const syncReferral = async (userAddress, referrerAddress, sourceChainId, destChainId) => {
        setSyncing(true);
        setError(null);

        try {
            const result = await referralApi.syncReferral(
                userAddress,
                referrerAddress,
                sourceChainId,
                destChainId
            );
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setSyncing(false);
        }
    };

    return {
        syncReferral,
        syncing,
        error,
    };
};

