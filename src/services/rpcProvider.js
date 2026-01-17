/**
 * RPC Provider Service
 * 
 * Implements RPC fallback mechanism with health tracking, caching, and rate limiting.
 * Provides automatic failover when RPC endpoints fail.
 * Uses ChainConfigService for RPC endpoint configuration.
 */

import axios from 'axios';
import chainConfig from './chainConfig';

/**
 * RPC Health Status
 */
const RPC_STATUS = {
    HEALTHY: 'healthy',
    UNHEALTHY: 'unhealthy',
    RATE_LIMITED: 'rate_limited',
    UNKNOWN: 'unknown',
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second base delay
    healthCheckInterval: 60000, // 1 minute
    rateLimitCooldown: 300000, // 5 minutes
    maxConcurrentRequests: 5,
};

/**
 * RPC Provider Class
 */
class RPCProvider {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // RPC health tracking per chain
        // Structure: { chainId: { url: { status, lastChecked, failureCount, successCount, lastSuccess, rateLimitedUntil } } }
        this.rpcHealth = {};
        
        // RPC cache - successful RPCs per chain
        // Structure: { chainId: [url1, url2, ...] } - ordered by success rate
        this.rpcCache = {};
        
        // Active requests tracking
        this.activeRequests = new Map();
        
        // Rate limit tracking
        this.rateLimitMap = new Map(); // url -> timestamp when rate limit expires
        
        // Start health check interval
        this.startHealthCheckInterval();
    }

    /**
     * Get RPC URLs for a chain from ChainConfigService
     * @param {number} chainId - Chain ID
     * @returns {string[]} Array of RPC URLs
     */
    getRpcUrls(chainId) {
        return chainConfig.getRpcUrls(chainId);
    }

    /**
     * Get timeout settings for a chain
     * @param {number} chainId - Chain ID
     * @returns {number} Timeout in milliseconds
     */
    getTimeout(chainId) {
        const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
        return timeoutSettings.rpcTimeout || this.config.timeout;
    }

    /**
     * Initialize health tracking for a chain
     * @param {number} chainId - Chain ID
     */
    initializeChain(chainId) {
        if (!this.rpcHealth[chainId]) {
            const urls = this.getRpcUrls(chainId) || [];
            this.rpcHealth[chainId] = {};
            
            urls.forEach(url => {
                this.rpcHealth[chainId][url] = {
                    status: RPC_STATUS.UNKNOWN,
                    lastChecked: null,
                    failureCount: 0,
                    successCount: 0,
                    lastSuccess: null,
                    rateLimitedUntil: null,
                    responseTime: null,
                };
            });
            
            // Initialize cache with all URLs
            this.rpcCache[chainId] = [...urls];
        }
    }

    /**
     * Check if RPC is rate limited
     * @param {string} url - RPC URL
     * @returns {boolean} True if rate limited
     */
    isRateLimited(url) {
        const rateLimitUntil = this.rateLimitMap.get(url);
        if (!rateLimitUntil) return false;
        
        if (Date.now() < rateLimitUntil) {
            return true;
        }
        
        // Rate limit expired, remove it
        this.rateLimitMap.delete(url);
        return false;
    }

    /**
     * Mark RPC as rate limited
     * @param {string} url - RPC URL
     */
    markRateLimited(url) {
        const cooldown = this.config.rateLimitCooldown;
        this.rateLimitMap.set(url, Date.now() + cooldown);
        
        // Update health status
        Object.keys(this.rpcHealth).forEach(chainId => {
            if (this.rpcHealth[chainId][url]) {
                this.rpcHealth[chainId][url].status = RPC_STATUS.RATE_LIMITED;
                this.rpcHealth[chainId][url].rateLimitedUntil = Date.now() + cooldown;
            }
        });
    }

    /**
     * Get healthy RPCs for a chain, ordered by success rate
     * @param {number} chainId - Chain ID
     * @returns {string[]} Array of healthy RPC URLs
     */
    getHealthyRpcs(chainId) {
        this.initializeChain(chainId);
        
        const health = this.rpcHealth[chainId];
        if (!health) return [];
        
        return Object.keys(health)
            .filter(url => {
                const rpcHealth = health[url];
                const isHealthy = rpcHealth.status === RPC_STATUS.HEALTHY;
                const notRateLimited = !this.isRateLimited(url);
                return isHealthy && notRateLimited;
            })
            .sort((a, b) => {
                // Sort by success rate (successCount / (successCount + failureCount))
                const aHealth = health[a];
                const bHealth = health[b];
                const aTotal = aHealth.successCount + aHealth.failureCount;
                const bTotal = bHealth.successCount + bHealth.failureCount;
                
                if (aTotal === 0 && bTotal === 0) return 0;
                if (aTotal === 0) return 1;
                if (bTotal === 0) return -1;
                
                const aRate = aHealth.successCount / aTotal;
                const bRate = bHealth.successCount / bTotal;
                
                return bRate - aRate; // Higher success rate first
            });
    }

    /**
     * Get all RPCs for a chain (fallback order)
     * @param {number} chainId - Chain ID
     * @returns {string[]} Array of RPC URLs in fallback order
     */
    getRpcFallbackOrder(chainId) {
        this.initializeChain(chainId);
        
        const healthyRpcs = this.getHealthyRpcs(chainId);
        const allRpcs = this.getRpcUrls(chainId);
        
        // Return healthy RPCs first, then others
        const unhealthyRpcs = allRpcs.filter(url => !healthyRpcs.includes(url));
        return [...healthyRpcs, ...unhealthyRpcs];
    }

    /**
     * Update RPC health status
     * @param {number} chainId - Chain ID
     * @param {string} url - RPC URL
     * @param {boolean} success - Whether request succeeded
     * @param {number} [responseTime] - Response time in milliseconds
     */
    updateRpcHealth(chainId, url, success, responseTime = null) {
        this.initializeChain(chainId);
        
        const health = this.rpcHealth[chainId][url];
        if (!health) return;
        
        health.lastChecked = Date.now();
        
        if (success) {
            health.status = RPC_STATUS.HEALTHY;
            health.successCount++;
            health.lastSuccess = Date.now();
            health.failureCount = Math.max(0, health.failureCount - 1); // Reduce failure count on success
            if (responseTime !== null) {
                health.responseTime = responseTime;
            }
        } else {
            health.failureCount++;
            if (health.failureCount >= 3) {
                health.status = RPC_STATUS.UNHEALTHY;
            }
        }
        
        // Update cache order
        this.updateRpcCache(chainId);
    }

    /**
     * Update RPC cache order based on health
     * @param {number} chainId - Chain ID
     */
    updateRpcCache(chainId) {
        const healthyRpcs = this.getHealthyRpcs(chainId);
        const allRpcs = this.getRpcUrls(chainId);
        
        // Cache should include all RPCs, but healthy ones first
        this.rpcCache[chainId] = [
            ...healthyRpcs,
            ...allRpcs.filter(url => !healthyRpcs.includes(url))
        ];
    }

    /**
     * Check RPC health by making a simple request
     * @param {string} url - RPC URL
     * @param {number} chainId - Chain ID
     * @returns {Promise<boolean>} True if healthy
     */
    async checkRpcHealth(url, chainId) {
        try {
            const timeout = this.getTimeout(chainId);
            const startTime = Date.now();
            
            // Make a simple eth_blockNumber request
            const response = await axios.post(
                url,
                {
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1,
                },
                {
                    timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            const responseTime = Date.now() - startTime;
            
            if (response.data && response.data.result) {
                this.updateRpcHealth(chainId, url, true, responseTime);
                return true;
            } else {
                this.updateRpcHealth(chainId, url, false);
                return false;
            }
        } catch (error) {
            // Check if it's a rate limit error
            if (error.response?.status === 429 || 
                error.response?.status === 403 ||
                error.message?.includes('rate limit') ||
                error.message?.includes('too many requests')) {
                this.markRateLimited(url);
            }
            
            this.updateRpcHealth(chainId, url, false);
            return false;
        }
    }

    /**
     * Exponential backoff delay
     * Uses ChainConfigService retry delay if available
     * @param {number} attempt - Attempt number (0-indexed)
     * @param {number} chainId - Chain ID for chain-specific settings
     * @returns {number} Delay in milliseconds
     */
    getBackoffDelay(attempt, chainId = null) {
        let baseDelay = this.config.retryDelay;
        
        // Use chain-specific retry delay if available
        if (chainId) {
            const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
            if (timeoutSettings.retryDelay) {
                baseDelay = timeoutSettings.retryDelay;
            }
        }
        
        return baseDelay * Math.pow(2, attempt);
    }

    /**
     * Make RPC request with fallback and retry logic
     * @param {number} chainId - Chain ID
     * @param {Object} rpcRequest - RPC request object
     * @param {Object} [options] - Request options
     * @returns {Promise<Object>} RPC response
     */
    async request(chainId, rpcRequest, options = {}) {
        this.initializeChain(chainId);
        
        // Get chain-specific timeout and retry settings from ChainConfigService
        const timeoutSettings = chainConfig.getTimeoutSettings(chainId);
        
        const {
            retryAttempts = timeoutSettings.retryAttempts || this.config.retryAttempts,
            timeout = this.getTimeout(chainId),
            skipHealthCheck = false,
        } = options;
        
        const rpcUrls = this.getRpcFallbackOrder(chainId);
        
        if (rpcUrls.length === 0) {
            throw new Error(`No RPC endpoints available for chain ${chainId}`);
        }
        
        let lastError = null;
        
        // Try each RPC URL
        for (const url of rpcUrls) {
            // Skip if rate limited
            if (this.isRateLimited(url)) {
                continue;
            }
            
            // Try with retries
            for (let attempt = 0; attempt < retryAttempts; attempt++) {
                try {
                    if (attempt > 0) {
                        // Exponential backoff using chain-specific settings
                        const delay = this.getBackoffDelay(attempt - 1, chainId);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    const startTime = Date.now();
                    const response = await axios.post(
                        url,
                        rpcRequest,
                        {
                            timeout,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                    
                    const responseTime = Date.now() - startTime;
                    
                    // Check for RPC errors in response
                    if (response.data?.error) {
                        const error = response.data.error;
                        
                        // Check for rate limit errors
                        if (error.code === -32005 || 
                            error.message?.includes('rate limit') ||
                            error.message?.includes('too many requests')) {
                            this.markRateLimited(url);
                            lastError = new Error(error.message || 'Rate limited');
                            break; // Try next RPC
                        }
                        
                        // Other RPC errors
                        lastError = new Error(error.message || 'RPC error');
                        this.updateRpcHealth(chainId, url, false);
                        break; // Try next RPC
                    }
                    
                    // Success
                    this.updateRpcHealth(chainId, url, true, responseTime);
                    return response.data;
                    
                } catch (error) {
                    lastError = error;
                    
                    // Check if it's a rate limit error
                    if (error.response?.status === 429 || 
                        error.response?.status === 403 ||
                        error.message?.includes('rate limit') ||
                        error.message?.includes('too many requests')) {
                        this.markRateLimited(url);
                        break; // Try next RPC immediately
                    }
                    
                    // Network/timeout errors - try next RPC
                    if (error.code === 'ECONNABORTED' || 
                        error.code === 'ETIMEDOUT' ||
                        error.message?.includes('timeout')) {
                        this.updateRpcHealth(chainId, url, false);
                        break; // Try next RPC
                    }
                    
                    // For other errors, continue retrying this RPC
                    if (attempt === retryAttempts - 1) {
                        this.updateRpcHealth(chainId, url, false);
                    }
                }
            }
        }
        
        // All RPCs failed
        throw new Error(
            lastError?.message || 
            `All RPC endpoints failed for chain ${chainId}`
        );
    }

    /**
     * Get best RPC URL for a chain (most reliable)
     * @param {number} chainId - Chain ID
     * @returns {string|null} Best RPC URL or null
     */
    getBestRpc(chainId) {
        const healthyRpcs = this.getHealthyRpcs(chainId);
        if (healthyRpcs.length > 0) {
            return healthyRpcs[0];
        }
        
        // Fallback to first available RPC
        const allRpcs = this.getRpcUrls(chainId);
        return allRpcs.length > 0 ? allRpcs[0] : null;
    }

    /**
     * Get RPC health status for a chain
     * @param {number} chainId - Chain ID
     * @returns {Object} Health status for all RPCs
     */
    getRpcHealthStatus(chainId) {
        this.initializeChain(chainId);
        
        const health = this.rpcHealth[chainId];
        if (!health) return {};
        
        return Object.keys(health).reduce((acc, url) => {
            const rpcHealth = health[url];
            acc[url] = {
                status: rpcHealth.status,
                lastChecked: rpcHealth.lastChecked,
                failureCount: rpcHealth.failureCount,
                successCount: rpcHealth.successCount,
                successRate: rpcHealth.successCount + rpcHealth.failureCount > 0
                    ? rpcHealth.successCount / (rpcHealth.successCount + rpcHealth.failureCount)
                    : 0,
                responseTime: rpcHealth.responseTime,
                rateLimited: this.isRateLimited(url),
            };
            return acc;
        }, {});
    }

    /**
     * Start periodic health checks
     */
    startHealthCheckInterval() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);
    }

    /**
     * Perform health checks for all initialized chains
     */
    async performHealthChecks() {
        const chainIds = Object.keys(this.rpcHealth);
        
        for (const chainId of chainIds) {
            const urls = Object.keys(this.rpcHealth[chainId]);
            
            // Check health for each RPC (in parallel, but limit concurrency)
            const checkPromises = urls.map(url => 
                this.checkRpcHealth(url, parseInt(chainId))
            );
            
            // Limit concurrent health checks
            const chunks = [];
            for (let i = 0; i < checkPromises.length; i += this.config.maxConcurrentRequests) {
                chunks.push(checkPromises.slice(i, i + this.config.maxConcurrentRequests));
            }
            
            for (const chunk of chunks) {
                await Promise.allSettled(chunk);
            }
        }
    }

    /**
     * Reset health status for a chain
     * @param {number} chainId - Chain ID
     */
    resetChainHealth(chainId) {
        if (this.rpcHealth[chainId]) {
            const urls = Object.keys(this.rpcHealth[chainId]);
            urls.forEach(url => {
                this.rpcHealth[chainId][url] = {
                    status: RPC_STATUS.UNKNOWN,
                    lastChecked: null,
                    failureCount: 0,
                    successCount: 0,
                    lastSuccess: null,
                    rateLimitedUntil: null,
                    responseTime: null,
                };
            });
        }
        
        // Reset cache
        this.rpcCache[chainId] = [...this.getRpcUrls(chainId)];
    }

    /**
     * Get statistics for a chain
     * @param {number} chainId - Chain ID
     * @returns {Object} Statistics
     */
    getStatistics(chainId) {
        this.initializeChain(chainId);
        
        const health = this.rpcHealth[chainId];
        if (!health) return null;
        
        const urls = Object.keys(health);
        const healthyCount = urls.filter(url => {
            const rpcHealth = health[url];
            return rpcHealth.status === RPC_STATUS.HEALTHY && !this.isRateLimited(url);
        }).length;
        
        const rateLimitedCount = urls.filter(url => this.isRateLimited(url)).length;
        
        const totalRequests = urls.reduce((sum, url) => {
            return sum + health[url].successCount + health[url].failureCount;
        }, 0);
        
        const totalSuccess = urls.reduce((sum, url) => sum + health[url].successCount, 0);
        
        return {
            totalRpcs: urls.length,
            healthyRpcs: healthyCount,
            rateLimitedRpcs: rateLimitedCount,
            unhealthyRpcs: urls.length - healthyCount - rateLimitedCount,
            totalRequests,
            totalSuccess,
            successRate: totalRequests > 0 ? totalSuccess / totalRequests : 0,
        };
    }

    /**
     * Cleanup - stop health checks
     */
    destroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
}

// Create singleton instance
const rpcProvider = new RPCProvider();

export default rpcProvider;
export { RPCProvider, RPC_STATUS };

