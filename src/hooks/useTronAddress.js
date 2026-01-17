/**
 * useTronAddress Hook
 * 
 * Custom hook for Tron address management.
 * Fetches Tron address for connected EVM address, handles address linking,
 * and provides validation utilities.
 * Uses ChainConfigService for validation and error messages.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { mangoApi } from '../services/mangoApi';
import chainConfig from '../services/chainConfig';

// Tron chain ID
const TRON_CHAIN_ID = 728126428;

/**
 * Custom hook for managing Tron address mappings
 * @param {string} evmAddress - Optional EVM address (defaults to connected wallet)
 * @returns {Object} Tron address state and functions
 */
const useTronAddress = (evmAddress = null) => {
    const { address: connectedAddress } = useAccount();
    const address = evmAddress || connectedAddress;

    const [tronAddress, setTronAddress] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isLinking, setIsLinking] = useState(false);

    /**
     * Fetch Tron address for the current EVM address
     */
    const fetchTronAddress = useCallback(async () => {
        if (!address) {
            setTronAddress(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await mangoApi.tron.getTronAddress(address);
            if (result && result.tronAddress) {
                setTronAddress(result.tronAddress);
            } else {
                setTronAddress(null);
            }
        } catch (err) {
            console.error('Error fetching Tron address:', err);
            const errorMsg = chainConfig.getErrorMessage(TRON_CHAIN_ID, 'networkError');
            setError(err.message || errorMsg || 'Failed to fetch Tron address');
            setTronAddress(null);
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    /**
     * Link Tron address to EVM address
     * @param {string} tronAddr - Tron address to link
     * @param {string} [userId] - Optional user ID
     * @returns {Promise<boolean>} Success status
     */
    const linkTronAddress = useCallback(async (tronAddr, userId = null) => {
        if (!address) {
            const errorMsg = 'No EVM address available';
            setError(errorMsg);
            setIsLinking(false);
            return false;
        }

        setIsLinking(true);
        setError(null);

        try {
            const result = await mangoApi.tron.linkTronAddress(address, tronAddr, userId);
            if (result && result.success) {
                // Update state immediately after successful link
                setTronAddress(tronAddr);
                setError(null);
                setIsLinking(false);
                return true;
            } else {
                const errorMsg = 'Failed to link Tron address';
                setError(errorMsg);
                setIsLinking(false);
                return false;
            }
        } catch (err) {
            console.error('Error linking Tron address:', err);
            const errorMsg = chainConfig.getErrorMessage(TRON_CHAIN_ID, 'transactionFailed');
            setError(err.message || errorMsg || 'Failed to link Tron address');
            setIsLinking(false);
            return false;
        }
    }, [address]);

    /**
     * Validate Tron address format
     * Uses ChainConfigService for client-side validation
     * @param {string} tronAddr - Tron address to validate
     * @param {boolean} [serverValidation=true] - Whether to also validate on server
     * @returns {Promise<boolean>} Validation result
     */
    const validateTronAddress = useCallback(async (tronAddr, serverValidation = true) => {
        if (!tronAddr) {
            return false;
        }

        // First, validate format using ChainConfigService
        const formatValid = chainConfig.validateAddress(TRON_CHAIN_ID, tronAddr);
        if (!formatValid) {
            return false;
        }

        // If server validation is requested, also validate on server
        if (serverValidation) {
            try {
                const result = await mangoApi.tron.validateTronAddress(tronAddr);
                // Return false if server validation fails, even if format is valid
                if (!result || !result.isValid) {
                    return false;
                }
                return true;
            } catch (err) {
                console.error('Error validating Tron address on server:', err);
                // Return false on server validation error
                return false;
            }
        }

        return formatValid;
    }, []);

    /**
     * Get EVM address from Tron address
     * @param {string} tronAddr - Tron address
     * @returns {Promise<string|null>} EVM address or null
     */
    const getEVMAddressFromTron = useCallback(async (tronAddr) => {
        if (!tronAddr) return null;

        try {
            const result = await mangoApi.tron.getEVMAddressFromTron(tronAddr);
            return result?.evmAddress || null;
        } catch (err) {
            console.error('Error getting EVM address from Tron:', err);
            return null;
        }
    }, []);

    /**
     * Get all address mappings for the current user
     * @returns {Promise<Object|null>} User mappings or null
     */
    const getUserMappings = useCallback(async () => {
        if (!address) return null;

        try {
            const result = await mangoApi.tron.getUserAddressMappings(address);
            return result || null;
        } catch (err) {
            console.error('Error getting user mappings:', err);
            return null;
        }
    }, [address]);

    // Fetch Tron address when EVM address changes
    useEffect(() => {
        if (address) {
            fetchTronAddress();
        } else {
            setTronAddress(null);
        }
    }, [address, fetchTronAddress]);

    /**
     * Get Tron explorer URL for an address or transaction
     * @param {string} hashOrAddress - Transaction hash or address
     * @param {boolean} [isTransaction=false] - Whether it's a transaction hash
     * @returns {string} Explorer URL
     */
    const getExplorerUrl = useCallback((hashOrAddress, isTransaction = false) => {
        if (!hashOrAddress) return '';
        
        const chain = chainConfig.getChain(TRON_CHAIN_ID);
        if (!chain?.blockExplorers?.[0]) {
            return `https://tronscan.org/#/${isTransaction ? 'transaction' : 'address'}/${hashOrAddress}`;
        }
        
        const baseUrl = chain.blockExplorers[0].url;
        if (isTransaction) {
            return `${baseUrl}/#/transaction/${hashOrAddress}`;
        }
        return `${baseUrl}/#/address/${hashOrAddress}`;
    }, []);

    return {
        // State
        tronAddress,
        isLoading,
        error,
        isLinking,
        hasTronAddress: !!tronAddress,

        // Functions
        fetchTronAddress,
        linkTronAddress,
        validateTronAddress,
        getEVMAddressFromTron,
        getUserMappings,
        getExplorerUrl,
    };
};

export default useTronAddress;

