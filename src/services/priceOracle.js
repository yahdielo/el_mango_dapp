/**
 * Price Oracle Service
 * Fetches token prices from CoinGecko API with caching and fallback mechanisms
 */

import axios from 'axios';

// Token symbol to CoinGecko ID mapping
const TOKEN_COINGECKO_MAP = {
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'BUSDT': 'tether',
    'DAI': 'dai',
    'WBTC': 'wrapped-bitcoin',
    'MANGO': null, // Custom token - will need custom price source
};

// Cache for prices (5 minute TTL)
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get token price from CoinGecko
 * @param {string} symbol - Token symbol (e.g., 'ETH', 'USDC')
 * @returns {Promise<number|null>} Token price in USD or null if unavailable
 */
export const getTokenPrice = async (symbol) => {
    // Check cache first
    const cacheKey = symbol.toUpperCase();
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }

    // Handle stablecoins
    if (['USDC', 'USDT', 'BUSDT', 'DAI'].includes(cacheKey)) {
        const price = 1.0;
        priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
    }

    // Get CoinGecko ID
    const coingeckoId = TOKEN_COINGECKO_MAP[cacheKey];
    if (!coingeckoId) {
        console.warn(`No CoinGecko mapping for token: ${symbol}`);
        return null;
    }

    try {
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price`,
            {
                params: {
                    ids: coingeckoId,
                    vs_currencies: 'usd',
                },
                timeout: 5000,
            }
        );

        const price = response.data[coingeckoId]?.usd;
        if (price) {
            priceCache.set(cacheKey, { price, timestamp: Date.now() });
            return price;
        }

        return null;
    } catch (error) {
        console.warn(`Failed to fetch price for ${symbol}:`, error.message);
        // Return cached price if available, even if expired
        if (cached) {
            return cached.price;
        }
        return null;
    }
};

/**
 * Get multiple token prices at once
 * @param {string[]} symbols - Array of token symbols
 * @returns {Promise<Object>} Object mapping symbol to price
 */
export const getTokenPrices = async (symbols) => {
    const prices = {};
    await Promise.all(
        symbols.map(async (symbol) => {
            const price = await getTokenPrice(symbol);
            if (price !== null) {
                prices[symbol] = price;
            }
        })
    );
    return prices;
};

/**
 * Calculate price impact for a swap
 * @param {number} amountIn - Input amount
 * @param {number} amountOut - Output amount
 * @param {number} priceIn - Input token price
 * @param {number} priceOut - Output token price
 * @returns {number} Price impact percentage
 */
export const calculatePriceImpact = (amountIn, amountOut, priceIn, priceOut) => {
    if (!amountIn || !amountOut || !priceIn || !priceOut) return 0;
    
    const valueIn = amountIn * priceIn;
    const valueOut = amountOut * priceOut;
    
    if (valueIn === 0) return 0;
    
    const impact = ((valueIn - valueOut) / valueIn) * 100;
    return Math.max(0, impact); // Ensure non-negative
};

/**
 * Clear price cache
 */
export const clearPriceCache = () => {
    priceCache.clear();
};

export default {
    getTokenPrice,
    getTokenPrices,
    calculatePriceImpact,
    clearPriceCache,
};

