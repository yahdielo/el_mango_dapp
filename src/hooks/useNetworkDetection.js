/**
 * useNetworkDetection Hook
 * 
 * Detects network mismatches and provides network switching functionality.
 * Uses ChainConfigService for chain information and wagmi for network operations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import chainConfig from '../services/chainConfig';

/**
 * Hook to detect network mismatches and provide switching functionality
 * @param {number|null} requiredChainId - Required chain ID (null = no requirement)
 * @returns {Object} Network detection state and functions
 */
export const useNetworkDetection = (requiredChainId = null) => {
    const { address, isConnected } = useAccount();
    const currentChainId = useChainId();
    const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

    const [isChecking, setIsChecking] = useState(false);
    const [lastError, setLastError] = useState(null);

    // Check if there's a network mismatch
    const isMismatch = useMemo(() => {
        if (!requiredChainId || !isConnected) return false;
        return currentChainId !== requiredChainId;
    }, [currentChainId, requiredChainId, isConnected]);

    // Get current chain info
    const currentChain = useMemo(() => {
        if (!currentChainId) return null;
        return chainConfig.getChain(currentChainId);
    }, [currentChainId]);

    // Get required chain info
    const requiredChain = useMemo(() => {
        if (!requiredChainId) return null;
        return chainConfig.getChain(requiredChainId);
    }, [requiredChainId]);

    // Check if required chain is supported
    const isSupported = useMemo(() => {
        if (!requiredChainId) return true;
        return requiredChain !== null;
    }, [requiredChainId, requiredChain]);

    /**
     * Switch to the required network
     * @returns {Promise<boolean>} Success status
     */
    const switchToRequiredNetwork = useCallback(async () => {
        if (!requiredChainId || !isSupported) {
            const errorMsg = requiredChainId ? 'Chain not supported' : 'Required chain is not supported';
            setLastError(errorMsg);
            return false;
        }

        if (!isConnected) {
            const errorMsg = 'Wallet not connected';
            setLastError(errorMsg);
            return false;
        }

        if (currentChainId === requiredChainId) {
            setLastError(null);
            return true; // Already on correct network
        }

        setIsChecking(true);
        setLastError(null);

        try {
            await switchChain({ chainId: requiredChainId });
            setLastError(null);
            return true;
        } catch (err) {
            const errorMsg = err.message || 'Failed to switch network';
            setLastError(errorMsg);
            
            // Get chain-specific error message
            if (requiredChain) {
                const chainError = chainConfig.getErrorMessage(requiredChainId, 'networkError');
                setLastError(chainError || errorMsg);
            }
            
            console.error('Network switch error:', err);
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [requiredChainId, isSupported, isConnected, currentChainId, switchChain, requiredChain]);

    /**
     * Switch to a specific chain
     * @param {number} chainId - Chain ID to switch to
     * @returns {Promise<boolean>} Success status
     */
    const switchToChain = useCallback(async (chainId) => {
        if (!chainId) {
            const errorMsg = 'Invalid chain ID';
            setLastError(errorMsg);
            return false;
        }

        const chain = chainConfig.getChain(chainId);
        if (!chain) {
            const errorMsg = 'Chain not supported';
            setLastError(errorMsg);
            return false;
        }

        if (!isConnected) {
            const errorMsg = 'Wallet not connected';
            setLastError(errorMsg);
            return false;
        }

        if (currentChainId === chainId) {
            setLastError(null);
            return true; // Already on this network
        }

        setIsChecking(true);
        setLastError(null);

        try {
            await switchChain({ chainId });
            setLastError(null);
            return true;
        } catch (err) {
            const errorMsg = err.message || 'Failed to switch network';
            setLastError(errorMsg);
            
            // Get chain-specific error message
            const chainError = chainConfig.getErrorMessage(chainId, 'networkError');
            setLastError(chainError || errorMsg);
            
            console.error('Network switch error:', err);
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [isConnected, currentChainId, switchChain]);

    // Clear error when network matches (but not for validation errors)
    useEffect(() => {
        // Only clear error if network actually matches and it's not a validation error
        // Validation errors (like "Chain not supported" or "Wallet not connected") should persist
        if (!isMismatch && lastError && 
            lastError !== 'Chain not supported' && 
            lastError !== 'Wallet not connected' &&
            lastError !== 'Invalid chain ID') {
            setLastError(null);
        }
    }, [isMismatch, lastError]);

    // Clear error when switch error changes
    useEffect(() => {
        if (switchError) {
            setLastError(switchError.message || 'Network switch failed');
        }
    }, [switchError]);

    return {
        // State
        currentChainId,
        requiredChainId,
        currentChain,
        requiredChain,
        isMismatch,
        isSupported,
        isConnected,
        isChecking: isChecking || isSwitching,
        error: lastError || switchError?.message || null,

        // Functions
        switchToRequiredNetwork,
        switchToChain,
    };
};

export default useNetworkDetection;

