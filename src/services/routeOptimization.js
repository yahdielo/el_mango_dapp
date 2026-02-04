/**
 * Route Optimization Service
 * 
 * Compares multiple cross-chain swap routes and selects the best one
 * based on cost, time, and reliability.
 */

import { swapApi, layerSwapApi } from './mangoApi';
import chainConfig from './chainConfig';

/**
 * Calculate route score based on multiple factors
 * @param {Object} route - Route object
 * @returns {number} Score (higher is better)
 */
const calculateRouteScore = (route) => {
    let score = 100; // Base score

    // Cost factor (lower cost = higher score)
    const totalCost = parseFloat(route.totalFee || 0) + parseFloat(route.gasCost || 0);
    if (totalCost > 0) {
        // Normalize cost (assume max cost of 100 USD, adjust based on actual data)
        const costPenalty = Math.min((totalCost / 100) * 30, 30); // Max 30 point penalty
        score -= costPenalty;
    }

    // Time factor (faster = higher score)
    const estimatedTime = route.estimatedTime || 0;
    if (estimatedTime > 0) {
        // Normalize time (assume max time of 1 hour, adjust based on actual data)
        const timePenalty = Math.min((estimatedTime / 3600) * 20, 20); // Max 20 point penalty
        score -= timePenalty;
    }

    // Reliability factor (more reliable = higher score)
    const reliability = route.reliability || 0.5; // Default 50% reliability
    const reliabilityBonus = (reliability - 0.5) * 30; // Up to 15 point bonus
    score += reliabilityBonus;

    // Success rate factor
    const successRate = route.successRate || 0.95; // Default 95% success rate
    const successBonus = (successRate - 0.9) * 20; // Up to 10 point bonus
    score += successBonus;

    return Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
};

/**
 * Fetch multiple routes for comparison
 * @param {number} sourceChainId - Source chain ID
 * @param {number} destChainId - Destination chain ID
 * @param {string} tokenIn - Source token address
 * @param {string} tokenOut - Destination token address
 * @param {string} amountIn - Amount to swap
 * @returns {Promise<Array>} Array of route objects with estimates
 */
export const fetchMultipleRoutes = async (sourceChainId, destChainId, tokenIn, tokenOut, amountIn) => {
    if (!sourceChainId || !destChainId || !tokenIn || !tokenOut || !amountIn) {
        return [];
    }

    const routes = [];
    const sourceChain = chainConfig.getChain(sourceChainId);
    const destChain = chainConfig.getChain(destChainId);

    // Check if LayerSwap is required
    const requiresLayerSwap = chainConfig.requiresLayerSwap(sourceChainId) || 
                              chainConfig.requiresLayerSwap(destChainId) ||
                              sourceChain?.type === 'SOLANA' ||
                              sourceChain?.type === 'BITCOIN' ||
                              destChain?.type === 'SOLANA' ||
                              destChain?.type === 'BITCOIN';

    try {
        if (requiresLayerSwap) {
            // Fetch LayerSwap routes
            try {
                const layerSwapRoutes = await layerSwapApi.getRoutes(
                    sourceChain?.chainName?.toLowerCase() || `chain-${sourceChainId}`,
                    destChain?.chainName?.toLowerCase() || `chain-${destChainId}`
                );

                if (layerSwapRoutes && Array.isArray(layerSwapRoutes.routes)) {
                    // Get estimates for each LayerSwap route
                    for (const lsRoute of layerSwapRoutes.routes.slice(0, 3)) { // Limit to 3 routes
                        try {
                            const estimate = await layerSwapApi.getEstimate({
                                source: lsRoute.source,
                                destination: lsRoute.destination,
                                amount: amountIn,
                            });

                            routes.push({
                                id: `layerswap-${lsRoute.id || Math.random()}`,
                                type: 'layerswap',
                                source: lsRoute.source,
                                destination: lsRoute.destination,
                                sourceChainId,
                                destChainId,
                                totalFee: estimate.fee || '0',
                                layerSwapFee: estimate.fee || '0',
                                mangoFee: '0', // LayerSwap handles fees
                                estimatedTime: estimate.estimatedTime || 300, // Default 5 minutes
                                gasCost: '0', // LayerSwap handles gas
                                reliability: lsRoute.reliability || 0.95,
                                successRate: lsRoute.successRate || 0.95,
                                bridge: 'LayerSwap',
                                steps: lsRoute.steps || [],
                            });
                        } catch (error) {
                            console.warn('Failed to get estimate for LayerSwap route:', error);
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch LayerSwap routes:', error);
            }
        }

        // Fetch Mango API routes (if available)
        try {
            const mangoRoutes = await swapApi.getRoutes(sourceChainId, destChainId, tokenIn, tokenOut);
            
            if (mangoRoutes && mangoRoutes.routes && Array.isArray(mangoRoutes.routes)) {
                // Get estimates for each Mango route
                for (const route of mangoRoutes.routes.slice(0, 3)) { // Limit to 3 routes
                    try {
                        const estimate = await swapApi.getEstimate({
                            sourceChainId,
                            destChainId,
                            tokenIn,
                            tokenOut,
                            amountIn,
                            routeId: route.id,
                        });

                        routes.push({
                            id: route.id || `mango-${Math.random()}`,
                            type: 'mango',
                            source: chainConfig.getChain(sourceChainId)?.chainName || `Chain ${sourceChainId}`,
                            destination: chainConfig.getChain(destChainId)?.chainName || `Chain ${destChainId}`,
                            sourceChainId,
                            destChainId,
                            totalFee: estimate.totalFee || estimate.mangoFee || '0',
                            layerSwapFee: estimate.layerSwapFee || '0',
                            mangoFee: estimate.mangoFee || '0',
                            estimatedTime: estimate.estimatedTime || 180, // Default 3 minutes
                            gasCost: estimate.gasCost || '0',
                            reliability: route.reliability || 0.98,
                            successRate: route.successRate || 0.98,
                            bridge: route.bridge || 'Mango',
                            steps: route.steps || [],
                        });
                    } catch (error) {
                        console.warn('Failed to get estimate for Mango route:', error);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to fetch Mango routes:', error);
        }

        // Calculate scores and sort
        routes.forEach(route => {
            route.score = calculateRouteScore(route);
        });

        return routes.sort((a, b) => b.score - a.score); // Sort by score (best first)
    } catch (error) {
        console.error('Error fetching multiple routes:', error);
        return [];
    }
};

/**
 * Get the best route from multiple options
 * @param {Array} routes - Array of route objects
 * @returns {Object|null} Best route or null
 */
export const getBestRoute = (routes) => {
    if (!routes || routes.length === 0) {
        return null;
    }

    // Routes should already be sorted by score
    return routes[0];
};

/**
 * Compare routes side by side
 * @param {Array} routes - Array of route objects
 * @returns {Object} Comparison data
 */
export const compareRoutes = (routes) => {
    if (!routes || routes.length === 0) {
        return {
            bestRoute: null,
            cheapestRoute: null,
            fastestRoute: null,
            mostReliableRoute: null,
            comparison: [],
        };
    }

    let cheapestRoute = routes[0];
    let fastestRoute = routes[0];
    let mostReliableRoute = routes[0];

    routes.forEach(route => {
        const totalCost = parseFloat(route.totalFee || 0) + parseFloat(route.gasCost || 0);
        const cheapestCost = parseFloat(cheapestRoute.totalFee || 0) + parseFloat(cheapestRoute.gasCost || 0);
        
        if (totalCost < cheapestCost) {
            cheapestRoute = route;
        }

        const estimatedTime = route.estimatedTime || Infinity;
        const fastestTime = fastestRoute.estimatedTime || Infinity;
        
        if (estimatedTime < fastestTime) {
            fastestRoute = route;
        }

        const reliability = route.reliability || 0;
        const mostReliable = mostReliableRoute.reliability || 0;
        
        if (reliability > mostReliable) {
            mostReliableRoute = route;
        }
    });

    const bestRoute = routes[0]; // Already sorted by score

    return {
        bestRoute,
        cheapestRoute,
        fastestRoute,
        mostReliableRoute,
        comparison: routes.map(route => ({
            id: route.id,
            type: route.type,
            bridge: route.bridge,
            totalCost: parseFloat(route.totalFee || 0) + parseFloat(route.gasCost || 0),
            estimatedTime: route.estimatedTime || 0,
            reliability: route.reliability || 0,
            successRate: route.successRate || 0,
            score: route.score || 0,
        })),
    };
};

/**
 * Format time estimate for display
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTimeEstimate = (seconds) => {
    if (!seconds || seconds === 0) return 'N/A';
    
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
};

/**
 * Format cost estimate for display
 * @param {number|string} cost - Cost amount
 * @param {string} currency - Currency symbol (default: USD)
 * @returns {string} Formatted cost string
 */
export const formatCostEstimate = (cost, currency = 'USD') => {
    const costNum = parseFloat(cost || 0);
    if (costNum === 0) return 'Free';
    if (costNum < 0.01) return `< $0.01 ${currency}`;
    if (costNum < 1) return `$${costNum.toFixed(3)} ${currency}`;
    return `$${costNum.toFixed(2)} ${currency}`;
};

export default {
    fetchMultipleRoutes,
    getBestRoute,
    compareRoutes,
    formatTimeEstimate,
    formatCostEstimate,
    calculateRouteScore,
};

