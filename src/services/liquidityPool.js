/**
 * Liquidity Pool Service
 * Handles interactions with liquidity pool contracts (Uniswap V2 style)
 */

import { parseAbi, formatUnits } from 'viem';

// Standard Uniswap V2 Pair ABI
const PAIR_ABI = parseAbi([
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function totalSupply() external view returns (uint256)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function balanceOf(address account) external view returns (uint256)',
]);

// Standard Uniswap V2 Factory ABI (to get pair address)
const FACTORY_ABI = parseAbi([
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
]);

/**
 * Get pair address from factory
 * @param {Object} publicClient - Viem public client
 * @param {string} factoryAddress - Factory contract address
 * @param {string} tokenA - Token A address
 * @param {string} tokenB - Token B address
 * @returns {Promise<string|null>} Pair address or null
 */
export const getPairAddress = async (publicClient, factoryAddress, tokenA, tokenB) => {
    if (!publicClient || !factoryAddress || !tokenA || !tokenB) return null;
    
    try {
        // Try tokenA, tokenB order
        let pairAddress = await publicClient.readContract({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: 'getPair',
            args: [tokenA, tokenB],
        });
        
        if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
            return pairAddress;
        }
        
        // Try reverse order
        pairAddress = await publicClient.readContract({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: 'getPair',
            args: [tokenB, tokenA],
        });
        
        if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
            return pairAddress;
        }
        
        return null;
    } catch (error) {
        console.warn('Failed to get pair address:', error);
        return null;
    }
};

/**
 * Get pool reserves
 * @param {Object} publicClient - Viem public client
 * @param {string} pairAddress - Pair contract address
 * @returns {Promise<Object|null>} Reserves { reserve0, reserve1, token0, token1 } or null
 */
export const getPoolReserves = async (publicClient, pairAddress) => {
    if (!publicClient || !pairAddress) return null;
    
    try {
        const [reserves, token0, token1] = await Promise.all([
            publicClient.readContract({
                address: pairAddress,
                abi: PAIR_ABI,
                functionName: 'getReserves',
            }),
            publicClient.readContract({
                address: pairAddress,
                abi: PAIR_ABI,
                functionName: 'token0',
            }),
            publicClient.readContract({
                address: pairAddress,
                abi: PAIR_ABI,
                functionName: 'token1',
            }),
        ]);
        
        return {
            reserve0: reserves[0],
            reserve1: reserves[1],
            token0,
            token1,
        };
    } catch (error) {
        console.warn('Failed to get pool reserves:', error);
        return null;
    }
};

/**
 * Get pool total supply (LP tokens)
 * @param {Object} publicClient - Viem public client
 * @param {string} pairAddress - Pair contract address
 * @returns {Promise<bigint|null>} Total supply or null
 */
export const getPoolTotalSupply = async (publicClient, pairAddress) => {
    if (!publicClient || !pairAddress) return null;
    
    try {
        const totalSupply = await publicClient.readContract({
            address: pairAddress,
            abi: PAIR_ABI,
            functionName: 'totalSupply',
        });
        
        return totalSupply;
    } catch (error) {
        console.warn('Failed to get pool total supply:', error);
        return null;
    }
};

/**
 * Calculate price ratio from reserves
 * @param {bigint} reserve0 - Reserve of token0
 * @param {bigint} reserve1 - Reserve of token1
 * @param {number} decimals0 - Decimals of token0
 * @param {number} decimals1 - Decimals of token1
 * @returns {number} Price ratio (token0/token1)
 */
export const calculatePriceRatio = (reserve0, reserve1, decimals0 = 18, decimals1 = 18) => {
    if (!reserve0 || !reserve1 || reserve0 === 0n || reserve1 === 0n) return null;
    
    // Adjust for decimals
    const adjustedReserve0 = Number(reserve0) / (10 ** decimals0);
    const adjustedReserve1 = Number(reserve1) / (10 ** decimals1);
    
    return adjustedReserve0 / adjustedReserve1;
};

/**
 * Calculate LP tokens to mint
 * Uses constant product formula: LP = sqrt(amountA * amountB)
 * For existing pools: LP = (amountA / reserveA) * totalSupply
 * @param {bigint} amountA - Amount of token A
 * @param {bigint} amountB - Amount of token B
 * @param {bigint} reserveA - Reserve of token A in pool
 * @param {bigint} reserveB - Reserve of token B in pool
 * @param {bigint} totalSupply - Total LP token supply
 * @returns {bigint} LP tokens to mint
 */
export const calculateLPTokens = (amountA, amountB, reserveA, reserveB, totalSupply) => {
    if (!amountA || !amountB || amountA === 0n || amountB === 0n) return 0n;
    
    // If pool exists, use proportional minting
    if (reserveA && reserveB && reserveA > 0n && reserveB > 0n && totalSupply && totalSupply > 0n) {
        // LP = min((amountA / reserveA) * totalSupply, (amountB / reserveB) * totalSupply)
        const lpFromA = (amountA * totalSupply) / reserveA;
        const lpFromB = (amountB * totalSupply) / reserveB;
        return lpFromA < lpFromB ? lpFromA : lpFromB;
    }
    
    // For new pools, use constant product formula: LP = sqrt(amountA * amountB)
    // This is a simplified version - actual Uniswap V2 uses more complex calculation
    const product = amountA * amountB;
    if (product === 0n) return 0n;
    
    // Approximate sqrt using BigInt
    let x = product;
    let y = (x + 1n) / 2n;
    while (y < x) {
        x = y;
        y = (x + product / x) / 2n;
    }
    
    return x;
};

/**
 * Calculate pool share percentage
 * @param {bigint} lpTokens - LP tokens to receive
 * @param {bigint} totalSupply - Total LP token supply
 * @returns {number} Pool share percentage
 */
export const calculatePoolShare = (lpTokens, totalSupply) => {
    if (!lpTokens || !totalSupply || lpTokens === 0n || totalSupply === 0n) return 0;
    
    const share = (Number(lpTokens) / Number(totalSupply)) * 100;
    return share;
};

/**
 * Get pool information
 * @param {Object} publicClient - Viem public client
 * @param {string} factoryAddress - Factory contract address
 * @param {string} tokenA - Token A address
 * @param {string} tokenB - Token B address
 * @param {number} decimalsA - Decimals of token A
 * @param {number} decimalsB - Decimals of token B
 * @returns {Promise<Object|null>} Pool info or null
 */
export const getPoolInfo = async (publicClient, factoryAddress, tokenA, tokenB, decimalsA = 18, decimalsB = 18) => {
    if (!publicClient || !factoryAddress || !tokenA || !tokenB) return null;
    
    try {
        const pairAddress = await getPairAddress(publicClient, factoryAddress, tokenA, tokenB);
        
        if (!pairAddress) {
            // Pool doesn't exist yet
            return {
                exists: false,
                pairAddress: null,
                reserves: null,
                totalSupply: null,
                priceRatio: null,
            };
        }
        
        const [reserves, totalSupply] = await Promise.all([
            getPoolReserves(publicClient, pairAddress),
            getPoolTotalSupply(publicClient, pairAddress),
        ]);
        
        let priceRatio = null;
        if (reserves) {
            // Determine which token is token0 and token1
            const isTokenAFirst = reserves.token0.toLowerCase() === tokenA.toLowerCase();
            const reserveA = isTokenAFirst ? reserves.reserve0 : reserves.reserve1;
            const reserveB = isTokenAFirst ? reserves.reserve1 : reserves.reserve0;
            
            priceRatio = calculatePriceRatio(reserveA, reserveB, decimalsA, decimalsB);
        }
        
        return {
            exists: true,
            pairAddress,
            reserves,
            totalSupply,
            priceRatio,
        };
    } catch (error) {
        console.error('Failed to get pool info:', error);
        return null;
    }
};

export default {
    getPairAddress,
    getPoolReserves,
    getPoolTotalSupply,
    calculatePriceRatio,
    calculateLPTokens,
    calculatePoolShare,
    getPoolInfo,
};

