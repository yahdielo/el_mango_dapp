/**
 * Mango DeFi Services API Client
 * 
 * This service handles all communication with the Mango DeFi off-chain services API
 * located at mangoServices. Provides endpoints for referral chains, whitelist status,
 * chain information, and cross-chain swaps.
 * 
 * Uses ChainConfigService for contract addresses, RPC URLs, and error messages.
 */

import axios from 'axios';
import chainConfig from './chainConfig';
import { retryWithTimeout, isRetryableError } from '../utils/retry';

// API base URL - should be configured via environment variables
// Auto-detect localhost API if running in development
const getApiBaseUrl = () => {
    if (process.env.REACT_APP_MANGO_API_URL) {
        return process.env.REACT_APP_MANGO_API_URL;
    }
    // In development, try to detect if we're on localhost
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return 'http://localhost:3000';
    }
    return 'http://localhost:3000'; // Default fallback
};
const API_BASE_URL = getApiBaseUrl();
const API_KEY = process.env.REACT_APP_MANGO_API_KEY || '';

// LayerSwap API configuration
const LAYERSWAP_API_KEY = process.env.REACT_APP_LAYERSWAP_API_KEY || '';
const LAYERSWAP_API_URL = process.env.REACT_APP_LAYERSWAP_API_URL || 'https://api.layerswap.io';

// Create axios instance with default config
// Timeout will be set per-request using ChainConfigService
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
    },
    // Default timeout, will be overridden by chain-specific settings
    timeout: 10000,
});

/**
 * Get timeout for API request based on chain
 * @param {number|null} chainId - Chain ID (optional)
 * @returns {number} Timeout in milliseconds
 */
const getApiTimeout = (chainId = null) => {
    if (chainId) {
        const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
        // Use RPC timeout for API calls (typically shorter than transaction timeout)
        return timeoutSettings.rpcTimeout || 10000;
    }
    // Default timeout if no chain specified
    return 10000;
};

/**
 * Handle API errors consistently
 * Uses ChainConfigService for chain-specific error messages
 * Handles timeout errors gracefully
 */
const handleError = (error, chainId = null) => {
    // Check for timeout errors
    if (error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('timeout') ||
        error.message?.includes('timed out')) {
        const timeoutError = chainId
            ? chainConfig.getErrorMessage(chainId, 'timeout')
            : 'Request timed out. Please try again.';
        console.error('Timeout Error:', error);
        throw new Error(timeoutError);
    }

    if (error.response) {
        // Server responded with error status
        const errorData = error.response.data;
        const errorMessage = errorData.message || errorData.error || 'API request failed';
        const statusCode = error.response.status;
        
        // Use actual error message from API instead of generic "RPC error"
        // Only use chain-specific error formatting for specific error types
        console.error('API Error:', errorData, 'Status:', statusCode);
        
        // For 404 errors, use the actual error message (e.g., "Referral not found")
        // For 500 errors, use the actual error message or a generic one
        if (statusCode === 404) {
            // 404 is not an RPC error, use the actual error message
            throw new Error(errorMessage);
        } else if (statusCode === 500) {
            // 500 errors might be RPC-related, but prefer the actual error message
            throw new Error(errorMessage);
        } else {
            // For other HTTP errors, use the actual error message
            throw new Error(errorMessage);
        }
    } else if (error.request) {
        // Request made but no response
        const networkError = chainId 
            ? chainConfig.getErrorMessage(chainId, 'networkError')
            : 'Network error: Could not connect to API';
        console.error('Network Error:', error.request);
        throw new Error(networkError);
    } else {
        // Something else happened
        console.error('Error:', error.message);
        throw error;
    }
};

/**
 * Make API request with retry and timeout
 * @param {Function} requestFn - Function that makes the API request
 * @param {number|null} chainId - Chain ID for chain-specific settings
 * @returns {Promise} API response
 */
const makeRequestWithRetry = async (requestFn, chainId = null) => {
    return retryWithTimeout(
        async () => {
            const timeout = getApiTimeout(chainId);
            return requestFn(timeout);
        },
        {
            chainId,
            timeout: getApiTimeout(chainId) * 3, // Total timeout = single request timeout * 3
        }
    );
};

/**
 * Referral Chain API
 */
export const referralApi = {
    /**
     * Get referral information for an address
     * @param {string} address - User wallet address
     * @param {number|null} chainId - Optional chain ID (if null, returns default chain)
     * @param {boolean} allChains - If true, returns referrals across all chains
     * @returns {Promise<Object>} Referral information
     */
    getReferralChain: async (address, chainId = null, allChains = false) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const params = {};
                if (chainId) params.chainId = chainId;
                if (allChains) params.allChains = 'true';
                
                const response = await apiClient.get(`/api/v1/referral-chain/${address}`, {
                    params,
                    timeout,
                });
                return response.data;
            }, chainId);
        } catch (error) {
            handleError(error, chainId);
        }
    },

    /**
     * Sync referral across chains
     * @param {string} userAddress - User wallet address
     * @param {string} referrerAddress - Referrer wallet address
     * @param {number} sourceChainId - Source chain ID
     * @param {number} destChainId - Destination chain ID
     * @returns {Promise<Object>} Sync result with transaction hash
     */
    syncReferral: async (userAddress, referrerAddress, sourceChainId, destChainId) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.post('/api/v1/referral-chain/sync', {
                    userAddress,
                    referrerAddress,
                    sourceChainId,
                    destChainId,
                }, { timeout });
                return response.data;
            }, sourceChainId);
        } catch (error) {
            handleError(error, sourceChainId);
        }
    },
};

/**
 * Whitelist API
 */
export const whitelistApi = {
    /**
     * Get whitelist status for an address
     * @param {string} address - Wallet address to check
     * @param {number|null} chainId - Optional chain ID (defaults to Base)
     * @returns {Promise<Object>} Whitelist status { address, isWhitelisted, tier, tierLevel }
     */
    getWhitelistStatus: async (address, chainId = null) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const params = chainId ? { chainId } : {};
                const response = await apiClient.get(`/api/v1/whitelist/${address}`, {
                    params,
                    timeout,
                });
                return response.data;
            }, chainId);
        } catch (error) {
            handleError(error, chainId);
        }
    },
};

/**
 * Chain API
 * Uses ChainConfigService for chain data and contract addresses
 */
export const chainApi = {
    /**
     * Get list of all supported chains
     * Merges backend chain status with ChainConfigService data
     * @returns {Promise<Object>} List of supported chains with status and contracts
     */
    getSupportedChains: async () => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get('/api/v1/chains/supported', { timeout });
                const backendChains = response.data;
                
                // Merge with ChainConfigService data
                const allChains = chainConfig.getAllChains();
                const mergedChains = allChains.map(chain => {
                    const chainId = parseInt(chain.chainId);
                    const backendData = backendChains.find(bc => parseInt(bc.chainId) === chainId);
                    
                    return {
                        ...chain,
                        status: backendData?.status || chain.status || 'active',
                        contracts: {
                            router: chainConfig.getContractAddress(chainId, 'router'),
                            referral: chainConfig.getContractAddress(chainId, 'referral'),
                            token: chainConfig.getContractAddress(chainId, 'token'),
                            manager: chainConfig.getContractAddress(chainId, 'manager'),
                            whitelist: chainConfig.getContractAddress(chainId, 'whitelist'),
                        },
                        rpcUrls: chainConfig.getRpcUrls(chainId),
                        ...(backendData || {}),
                    };
                });
                
                return { chains: mergedChains };
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Get status for a specific chain
     * Uses ChainConfigService for chain data
     * @param {number} chainId - Chain ID to query
     * @returns {Promise<Object>} Chain status information
     */
    getChainStatus: async (chainId) => {
        try {
            const response = await apiClient.get(`/api/v1/chains/${chainId}/status`);
            const backendStatus = response.data;
            
            // Merge with ChainConfigService data
            const chain = chainConfig.getChain(chainId);
            if (!chain) {
                throw new Error(chainConfig.getErrorMessage(chainId, 'unsupportedChain'));
            }
            
            return {
                ...backendStatus,
                chainId: chainId,
                chainName: chain.chainName,
                contracts: {
                    router: chainConfig.getContractAddress(chainId, 'router'),
                    referral: chainConfig.getContractAddress(chainId, 'referral'),
                    token: chainConfig.getContractAddress(chainId, 'token'),
                    manager: chainConfig.getContractAddress(chainId, 'manager'),
                    whitelist: chainConfig.getContractAddress(chainId, 'whitelist'),
                },
                rpcUrls: chainConfig.getRpcUrls(chainId),
                gasSettings: chainConfig.getGasSettings(chainId),
                timeoutSettings: chainConfig.getTimeoutSettings(chainId),
                featureFlags: chainConfig.getFeatureFlags(chainId),
            };
        } catch (error) {
            handleError(error, chainId);
        }
    },

    /**
     * Get contract address for a chain and contract type
     * Helper method using ChainConfigService
     * @param {number} chainId - Chain ID
     * @param {string} contractType - Contract type (router, referral, token, manager, whitelist)
     * @returns {string|null} Contract address
     */
    getContractAddress: (chainId, contractType) => {
        return chainConfig.getContractAddress(chainId, contractType);
    },

    /**
     * Get RPC URLs for a chain
     * Helper method using ChainConfigService
     * @param {number} chainId - Chain ID
     * @returns {string[]} Array of RPC URLs
     */
    getRpcUrls: (chainId) => {
        return chainConfig.getRpcUrls(chainId);
    },
};

/**
 * Cross-Chain Swap API
 * Uses ChainConfigService for contract addresses and error messages
 */
export const swapApi = {
    /**
     * Initiate a cross-chain swap
     * Validates addresses using ChainConfigService
     * @param {Object} swapParams - Swap parameters
     * @param {number} swapParams.sourceChainId - Source chain ID
     * @param {number} swapParams.destChainId - Destination chain ID
     * @param {string} swapParams.tokenIn - Token in address
     * @param {string} swapParams.tokenOut - Token out address
     * @param {string} swapParams.amountIn - Amount to swap (in wei/smallest unit)
     * @param {string} swapParams.recipient - Recipient address
     * @param {string|null} swapParams.referrer - Optional referrer address
     * @returns {Promise<Object>} Swap order information
     */
    initiateCrossChainSwap: async (swapParams) => {
        try {
            // Validate addresses using ChainConfigService
            const { sourceChainId, destChainId, recipient, referrer } = swapParams;
            
            if (recipient && !chainConfig.validateAddress(sourceChainId, recipient)) {
                throw new Error(chainConfig.getErrorMessage(sourceChainId, 'invalidAddress'));
            }
            
            if (referrer && !chainConfig.validateAddress(sourceChainId, referrer)) {
                throw new Error(chainConfig.getErrorMessage(sourceChainId, 'invalidAddress'));
            }
            
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.post('/api/v1/swap/cross-chain', swapParams, { timeout });
                return response.data;
            }, sourceChainId);
        } catch (error) {
            handleError(error, swapParams?.sourceChainId);
        }
    },

    /**
     * Get swap status
     * @param {string} swapId - Swap ID (UUID)
     * @param {number} [chainId] - Optional chain ID for error messages
     * @returns {Promise<Object>} Swap status information
     */
    getSwapStatus: async (swapId, chainId = null) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get(`/api/v1/swap/${swapId}/status`, { timeout });
                return response.data;
            }, chainId);
        } catch (error) {
            handleError(error, chainId);
        }
    },

    /**
     * Get available cross-chain routes
     * Uses ChainConfigService to check if LayerSwap is required
     * @param {number} sourceChainId - Source chain ID
     * @param {number} destChainId - Destination chain ID
     * @param {string} [tokenIn] - Optional source token address
     * @param {string} [tokenOut] - Optional destination token address
     * @returns {Promise<Object>} Available routes
     */
    getRoutes: async (sourceChainId, destChainId, tokenIn = null, tokenOut = null) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                // Check if LayerSwap is required
                const requiresLS = chainConfig.requiresLayerSwap(sourceChainId) || 
                                  chainConfig.requiresLayerSwap(destChainId);
                
                const params = { sourceChainId, destChainId };
                if (tokenIn) params.tokenIn = tokenIn;
                if (tokenOut) params.tokenOut = tokenOut;
                
                const response = await apiClient.get('/api/v1/swap/routes', { params, timeout });
                
                // Add LayerSwap requirement info
                return {
                    ...response.data,
                    requiresLayerSwap: requiresLS,
                };
            }, sourceChainId);
        } catch (error) {
            handleError(error, sourceChainId);
        }
    },

    /**
     * Get fee estimate for a cross-chain swap
     * @param {Object} estimateParams - Estimate parameters
     * @param {number} estimateParams.sourceChainId - Source chain ID
     * @param {number} estimateParams.destChainId - Destination chain ID
     * @param {string} estimateParams.tokenIn - Source token address
     * @param {string} estimateParams.tokenOut - Destination token address
     * @param {string} estimateParams.amountIn - Amount to swap
     * @returns {Promise<Object>} Fee estimate information
     */
    getEstimate: async (estimateParams) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get('/api/v1/swap/estimate', {
                    params: estimateParams,
                    timeout,
                });
                return response.data;
            }, estimateParams?.sourceChainId);
        } catch (error) {
            handleError(error, estimateParams?.sourceChainId);
        }
    },

    /**
     * Cancel a pending swap order
     * @param {string} swapId - Swap ID to cancel
     * @param {number} [chainId] - Optional chain ID for error messages
     * @returns {Promise<Object>} Cancellation result
     */
    cancelSwap: async (swapId, chainId = null) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.post('/api/v1/swap/cancel', { swapId }, { timeout });
                return response.data;
            }, chainId);
        } catch (error) {
            handleError(error, chainId);
        }
    },
};

/**
 * Tron API
 */
export const tronApi = {
    /**
     * Link Tron address to EVM address
     * @param {string} evmAddress - EVM wallet address
     * @param {string} tronAddress - Tron wallet address (Base58 format)
     * @param {string} [userId] - Optional user ID
     * @returns {Promise<Object>} Mapping result
     */
    linkTronAddress: async (evmAddress, tronAddress, userId = null) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.post('/api/v1/tron/address-mapping', {
                    evmAddress,
                    tronAddress,
                    userId,
                }, { timeout });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Get Tron address from EVM address
     * @param {string} evmAddress - EVM wallet address
     * @returns {Promise<Object>} Tron address mapping { evmAddress, tronAddress }
     */
    getTronAddress: async (evmAddress) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get(`/api/v1/tron/address-mapping/${evmAddress}`, { timeout });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Get EVM address from Tron address
     * @param {string} tronAddress - Tron wallet address (Base58 format)
     * @returns {Promise<Object>} EVM address mapping { evmAddress, tronAddress }
     */
    getEVMAddressFromTron: async (tronAddress) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get(`/api/v1/tron/address-mapping/tron/${tronAddress}`, { timeout });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Validate Tron address format
     * @param {string} address - Address to validate
     * @returns {Promise<Object>} Validation result { address, isValid, type }
     */
    validateTronAddress: async (address) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.post('/api/v1/tron/validate-address', {
                    address,
                }, { timeout });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Get all address mappings for a user
     * @param {string} evmAddress - EVM wallet address
     * @returns {Promise<Object>} User address mappings
     */
    getUserAddressMappings: async (evmAddress) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get(`/api/v1/tron/user/${evmAddress}`, { timeout });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Build swap transaction for client-side signing
     * @param {Object} swapParams - Swap parameters
     * @param {string} swapParams.tokenIn - Input token address
     * @param {string} swapParams.tokenOut - Output token address
     * @param {string} swapParams.amountIn - Amount to swap (in smallest unit)
     * @param {string} swapParams.amountOutMin - Minimum amount out (slippage protection)
     * @param {string} swapParams.recipient - Recipient address
     * @param {boolean} [swapParams.isTestnet] - Whether to use testnet
     * @param {number} [swapParams.deadline] - Optional deadline in seconds
     * @returns {Promise<Object>} Transaction details for signing
     */
    buildSwapTransaction: async (swapParams) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.post('/api/v1/tron/dex/build-transaction', swapParams, { timeout });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Sign and execute a Tron swap using TronLink
     * This method builds the transaction, signs it with TronLink, and relays it to the backend
     * @param {Object} swapParams - Swap parameters
     * @param {string} swapParams.tokenIn - Input token address
     * @param {string} swapParams.tokenOut - Output token address
     * @param {string} swapParams.amountIn - Amount to swap (in smallest unit)
     * @param {string} swapParams.amountOutMin - Minimum amount out (slippage protection)
     * @param {string} swapParams.recipient - Recipient address
     * @param {string} [swapParams.swapId] - Optional swap ID for tracking
     * @param {boolean} [swapParams.isTestnet] - Whether to use testnet
     * @returns {Promise<Object>} Transaction result { success, txHash, swapId }
     */
    signAndExecuteTronSwap: async (swapParams) => {
        try {
            // Check if TronLink is available
            if (!window.tronWeb || !window.tronWeb.ready) {
                throw new Error('TronLink not available. Please install and connect TronLink.');
            }

            const tronWeb = window.tronWeb;

            // Build transaction on backend with retry
            const buildResponse = await makeRequestWithRetry(async (timeout) => {
                return await apiClient.post('/api/v1/tron/dex/build-transaction', {
                    tokenIn: swapParams.tokenIn,
                    tokenOut: swapParams.tokenOut,
                    amountIn: swapParams.amountIn,
                    amountOutMin: swapParams.amountOutMin,
                    recipient: swapParams.recipient,
                    isTestnet: swapParams.isTestnet || false,
                }, { timeout });
            }, null);

            const { transaction, swapType, routerAddress } = buildResponse.data;

            // Sign transaction with TronLink
            // Note: TronLink signing depends on the transaction format
            // For contract calls, we need to use TronLink's contract interaction
            let signedTransaction;

            if (swapType === 'TRX_TO_TOKEN') {
                // TRX -> Token: Use swapExactETHForTokens
                // TronLink handles TRX transfers differently
                // We'll need to use the contract method directly
                const contract = await tronWeb.contract().at(routerAddress);
                signedTransaction = await contract.swapExactETHForTokens(
                    swapParams.amountOutMin,
                    buildResponse.data.path,
                    swapParams.recipient,
                    Math.floor(Date.now() / 1000) + 600
                ).send({
                    callValue: swapParams.amountIn,
                });
            } else if (swapType === 'TOKEN_TO_TRX') {
                // Token -> TRX: Use swapExactTokensForETH
                const contract = await tronWeb.contract().at(routerAddress);
                signedTransaction = await contract.swapExactTokensForETH(
                    swapParams.amountIn,
                    swapParams.amountOutMin,
                    buildResponse.data.path,
                    swapParams.recipient,
                    Math.floor(Date.now() / 1000) + 600
                ).send();
            } else {
                // Token -> Token: Use swapExactTokensForTokens
                const contract = await tronWeb.contract().at(routerAddress);
                signedTransaction = await contract.swapExactTokensForTokens(
                    swapParams.amountIn,
                    swapParams.amountOutMin,
                    buildResponse.data.path,
                    swapParams.recipient,
                    Math.floor(Date.now() / 1000) + 600
                ).send();
            }

            // Relay signed transaction to backend
            const relayResponse = await apiClient.post('/api/v1/tron/dex/swap', {
                signedTransaction,
                swapId: swapParams.swapId,
                isTestnet: swapParams.isTestnet || false,
            });

            return relayResponse.data;
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Get transaction status
     * @param {string} txHash - Transaction hash
     * @param {boolean} [isTestnet] - Whether to use testnet
     * @returns {Promise<Object>} Transaction status
     */
    getTransactionStatus: async (txHash, isTestnet = false) => {
        try {
            return await makeRequestWithRetry(async (timeout) => {
                const response = await apiClient.get(`/api/v1/tron/dex/transaction/${txHash}`, {
                    params: { isTestnet },
                    timeout,
                });
                return response.data;
            }, null);
        } catch (error) {
            handleError(error);
        }
    },
};

/**
 * LayerSwap API Client
 * Direct integration with LayerSwap API for Solana and Bitcoin swaps
 */
export const layerSwapApi = {
    /**
     * Create LayerSwap client instance
     */
    getClient: () => {
        return axios.create({
            baseURL: LAYERSWAP_API_URL,
            headers: {
                'Content-Type': 'application/json',
                ...(LAYERSWAP_API_KEY && { 'Authorization': `Bearer ${LAYERSWAP_API_KEY}` }),
            },
            timeout: 30000, // 30 second timeout
        });
    },

    /**
     * Get available routes from LayerSwap
     * @param {string} sourceNetwork - Source network identifier (e.g., 'base', 'solana')
     * @param {string} destNetwork - Destination network identifier
     * @returns {Promise<Object>} Available routes
     */
    getRoutes: async (sourceNetwork, destNetwork) => {
        try {
            const client = layerSwapApi.getClient();
            const response = await client.get('/api/routes', {
                params: {
                    source: sourceNetwork,
                    destination: destNetwork,
                },
            });
            return response.data;
        } catch (error) {
            console.error('LayerSwap API Error:', error);
            throw new Error('Failed to fetch LayerSwap routes');
        }
    },

    /**
     * Get fee estimate from LayerSwap
     * @param {Object} params - Estimate parameters
     * @param {string} params.source - Source network
     * @param {string} params.destination - Destination network
     * @param {string} params.amount - Amount to swap
     * @returns {Promise<Object>} Fee estimate
     */
    getEstimate: async (params) => {
        try {
            const client = layerSwapApi.getClient();
            const response = await client.post('/api/estimate', params);
            return response.data;
        } catch (error) {
            console.error('LayerSwap API Error:', error);
            throw new Error('Failed to get LayerSwap estimate');
        }
    },

    /**
     * Create LayerSwap order
     * @param {Object} orderParams - Order parameters
     * @returns {Promise<Object>} Order information
     */
    createOrder: async (orderParams) => {
        try {
            const client = layerSwapApi.getClient();
            const response = await client.post('/api/orders', orderParams);
            return response.data;
        } catch (error) {
            console.error('LayerSwap API Error:', error);
            throw new Error('Failed to create LayerSwap order');
        }
    },

    /**
     * Get LayerSwap order status
     * @param {string} orderId - LayerSwap order ID
     * @returns {Promise<Object>} Order status
     */
    getOrderStatus: async (orderId) => {
        try {
            const client = layerSwapApi.getClient();
            const response = await client.get(`/api/orders/${orderId}`);
            return response.data;
        } catch (error) {
            console.error('LayerSwap API Error:', error);
            throw new Error('Failed to get LayerSwap order status');
        }
    },
};

/**
 * Health check
 */
export const healthCheck = async () => {
    try {
        const response = await apiClient.get('/health');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Helper functions using ChainConfigService
 */
export const contractHelpers = {
    /**
     * Get router address for a chain
     * @param {number} chainId - Chain ID
     * @returns {string|null} Router contract address
     */
    getRouterAddress: (chainId) => {
        return chainConfig.getContractAddress(chainId, 'router');
    },

    /**
     * Get referral contract address for a chain
     * @param {number} chainId - Chain ID
     * @returns {string|null} Referral contract address
     */
    getReferralAddress: (chainId) => {
        return chainConfig.getContractAddress(chainId, 'referral');
    },

    /**
     * Get token contract address for a chain
     * @param {number} chainId - Chain ID
     * @returns {string|null} Token contract address
     */
    getTokenAddress: (chainId) => {
        return chainConfig.getContractAddress(chainId, 'token');
    },

    /**
     * Get manager contract address for a chain
     * @param {number} chainId - Chain ID
     * @returns {string|null} Manager contract address
     */
    getManagerAddress: (chainId) => {
        return chainConfig.getContractAddress(chainId, 'manager');
    },

    /**
     * Get whitelist contract address for a chain
     * @param {number} chainId - Chain ID
     * @returns {string|null} Whitelist contract address
     */
    getWhitelistAddress: (chainId) => {
        return chainConfig.getContractAddress(chainId, 'whitelist');
    },

    /**
     * Validate address format for a chain
     * @param {number} chainId - Chain ID
     * @param {string} address - Address to validate
     * @returns {boolean} True if valid
     */
    validateAddress: (chainId, address) => {
        return chainConfig.validateAddress(chainId, address);
    },

    /**
     * Get error message for a chain and error type
     * @param {number} chainId - Chain ID
     * @param {string} errorType - Error type
     * @returns {string} Error message
     */
    getErrorMessage: (chainId, errorType) => {
        return chainConfig.getErrorMessage(chainId, errorType);
    },
};

// Export default object with all APIs
export default {
    referral: referralApi,
    whitelist: whitelistApi,
    chain: chainApi,
    swap: swapApi,
    tron: tronApi,
    layerSwap: layerSwapApi,
    healthCheck,
    contracts: contractHelpers,
};

