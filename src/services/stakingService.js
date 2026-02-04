/**
 * Staking Service
 * 
 * Handles staking-related operations including:
 * - Fetching APY from contracts or API
 * - Managing lock periods
 * - Calculating rewards
 */

import { parseAbi } from 'viem';
import chainConfig from './chainConfig';

// Standard staking contract ABI (common functions)
const STAKING_ABI = parseAbi([
    'function getAPY(address token, uint256 lockPeriod) external view returns (uint256)',
    'function getAPYForToken(address token) external view returns (uint256)',
    'function stake(address token, uint256 amount, uint256 lockPeriod) external returns (uint256 stakeId)',
    'function stakeETH(uint256 lockPeriod) external payable returns (uint256 stakeId)',
    'function unstake(uint256 stakeId) external returns (bool)',
    'function claimRewards(uint256 stakeId) external returns (bool)',
    'function getLockPeriods() external view returns (uint256[])',
    'function getTotalStaked(address token) external view returns (uint256)',
    'function getUserStake(address user, address token) external view returns (uint256 amount, uint256 lockPeriod, uint256 unlockTime, uint256 rewards)',
    'function getUserStakes(address user) external view returns (uint256[] stakeIds)',
    'function getStakeInfo(uint256 stakeId) external view returns (address user, address token, uint256 amount, uint256 lockPeriod, uint256 stakedAt, uint256 unlockTime, uint256 rewards, bool isActive)',
    'function getPoolInfo(address token) external view returns (uint256 totalStaked, uint256 tvl, uint256 minStake, bool isActive)',
    'function getSupportedTokens() external view returns (address[] tokens)',
    'function getEarlyUnstakePenalty(uint256 stakeId) external view returns (uint256 penaltyPercent)',
    'function getTotalRewards(address user) external view returns (uint256 totalPending, uint256 totalClaimed)',
    'function getRewardsByToken(address user, address token) external view returns (uint256 pending, uint256 claimed)',
    'function getClaimableRewards(address user) external view returns (uint256[] stakeIds, uint256[] amounts)',
    'function claimAllRewards() external returns (bool)',
    'function getRewardHistory(address user, uint256 limit) external view returns (RewardClaim[] history)',
]);

// Lock periods in seconds
export const LOCK_PERIODS = {
    '7': 7 * 24 * 60 * 60,      // 7 days
    '14': 14 * 24 * 60 * 60,    // 14 days
    '30': 30 * 24 * 60 * 60,    // 30 days
    '60': 60 * 24 * 60 * 60,    // 60 days
    '90': 90 * 24 * 60 * 60,    // 90 days
    '180': 180 * 24 * 60 * 60,  // 180 days
    '365': 365 * 24 * 60 * 60,  // 365 days
};

// Lock period labels
export const LOCK_PERIOD_LABELS = {
    '7': '7 days',
    '14': '14 days',
    '30': '30 days',
    '60': '60 days',
    '90': '90 days',
    '180': '180 days',
    '365': '1 year',
};

/**
 * Fetch APY from staking contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} tokenAddress - Token address (or 'native' for native token)
 * @param {number} lockPeriod - Lock period in seconds (optional)
 * @returns {Promise<number|null>} APY percentage or null if error
 */
export const fetchAPYFromContract = async (publicClient, stakingAddress, tokenAddress, lockPeriod = null) => {
    if (!publicClient || !stakingAddress || !tokenAddress) {
        return null;
    }

    try {
        // If lock period is provided, try to get APY for specific lock period
        if (lockPeriod !== null) {
            try {
                const apy = await publicClient.readContract({
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'getAPY',
                    args: [tokenAddress === 'native' ? '0x0000000000000000000000000000000000000000' : tokenAddress, BigInt(lockPeriod)],
                });
                // APY is typically returned as basis points (10000 = 100%), convert to percentage
                return Number(apy) / 100;
            } catch (error) {
                console.warn('Failed to fetch APY with lock period:', error);
            }
        }

        // Fallback: try to get general APY for token
        try {
            const apy = await publicClient.readContract({
                address: stakingAddress,
                abi: STAKING_ABI,
                functionName: 'getAPYForToken',
                args: [tokenAddress === 'native' ? '0x0000000000000000000000000000000000000000' : tokenAddress],
            });
            return Number(apy) / 100;
        } catch (error) {
            console.warn('Failed to fetch APY from contract:', error);
            return null;
        }
    } catch (error) {
        console.error('Error fetching APY from contract:', error);
        return null;
    }
};

/**
 * Fetch APY from API (fallback)
 * @param {string} tokenSymbol - Token symbol
 * @param {number} chainId - Chain ID
 * @param {number} lockPeriod - Lock period in days (optional)
 * @returns {Promise<number|null>} APY percentage or null if error
 */
export const fetchAPYFromAPI = async (tokenSymbol, chainId, lockPeriod = null) => {
    try {
        // TODO: Replace with actual API endpoint
        const apiUrl = process.env.REACT_APP_STAKING_API_URL || 'https://api.mango.defi/staking';
        
        const params = new URLSearchParams({
            token: tokenSymbol,
            chainId: chainId.toString(),
        });
        
        if (lockPeriod) {
            params.append('lockPeriod', lockPeriod.toString());
        }

        const response = await fetch(`${apiUrl}/apy?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.apy || null;
    } catch (error) {
        console.warn('Failed to fetch APY from API:', error);
        return null;
    }
};

/**
 * Get APY for a token (tries contract first, then API, then mock)
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} tokenAddress - Token address (or 'native')
 * @param {string} tokenSymbol - Token symbol
 * @param {number} chainId - Chain ID
 * @param {number} lockPeriod - Lock period in seconds (optional)
 * @returns {Promise<number>} APY percentage
 */
export const getAPY = async (publicClient, stakingAddress, tokenAddress, tokenSymbol, chainId, lockPeriod = null) => {
    // Try contract first
    if (publicClient && stakingAddress) {
        const contractAPY = await fetchAPYFromContract(publicClient, stakingAddress, tokenAddress, lockPeriod);
        if (contractAPY !== null && contractAPY > 0) {
            return contractAPY;
        }
    }

    // Try API
    const lockPeriodDays = lockPeriod ? Math.floor(lockPeriod / (24 * 60 * 60)) : null;
    const apiAPY = await fetchAPYFromAPI(tokenSymbol, chainId, lockPeriodDays);
    if (apiAPY !== null && apiAPY > 0) {
        return apiAPY;
    }

    // Fallback to mock APY based on token and lock period
    const baseAPY = tokenSymbol === 'MANGO' ? 12.5 : tokenSymbol === 'BNB' ? 8.5 : tokenSymbol === 'ETH' ? 6.2 : 5.0;
    
    // Increase APY based on lock period (longer lock = higher APY)
    let multiplier = 1.0;
    if (lockPeriod) {
        const days = lockPeriod / (24 * 60 * 60);
        if (days >= 365) multiplier = 1.5;
        else if (days >= 180) multiplier = 1.3;
        else if (days >= 90) multiplier = 1.2;
        else if (days >= 60) multiplier = 1.15;
        else if (days >= 30) multiplier = 1.1;
        else if (days >= 14) multiplier = 1.05;
    }
    
    return baseAPY * multiplier;
};

/**
 * Get available lock periods from contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @returns {Promise<number[]>} Array of lock periods in seconds
 */
export const getLockPeriodsFromContract = async (publicClient, stakingAddress) => {
    if (!publicClient || !stakingAddress) {
        return Object.values(LOCK_PERIODS);
    }

    try {
        const periods = await publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getLockPeriods',
        });
        return periods.map(p => Number(p));
    } catch (error) {
        console.warn('Failed to fetch lock periods from contract:', error);
        return Object.values(LOCK_PERIODS);
    }
};

/**
 * Fetch staking pools from contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of pool objects
 */
export const fetchPoolsFromContract = async (publicClient, stakingAddress, chainId) => {
    if (!publicClient || !stakingAddress) {
        return [];
    }

    try {
        // Get supported tokens
        const supportedTokens = await publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getSupportedTokens',
        });

        if (!supportedTokens || supportedTokens.length === 0) {
            return [];
        }

        const pools = [];
        const chainInfo = chainConfig.getChain(chainId);
        const tokenList = chainInfo?.tokens || [];

        // Fetch pool info for each token
        for (const tokenAddress of supportedTokens) {
            try {
                const poolInfo = await publicClient.readContract({
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'getPoolInfo',
                    args: [tokenAddress],
                });

                // Find token info from token list
                const token = tokenList.find(t => 
                    t.address?.toLowerCase() === tokenAddress.toLowerCase() ||
                    (tokenAddress === '0x0000000000000000000000000000000000000000' && t.address === 'native')
                ) || { symbol: 'UNKNOWN', name: 'Unknown Token', address: tokenAddress };

                // Get APY for default lock period (30 days)
                const defaultLockPeriod = LOCK_PERIODS['30'];
                const apy = await fetchAPYFromContract(publicClient, stakingAddress, tokenAddress, defaultLockPeriod) || 0;

                pools.push({
                    id: `${chainId}-${tokenAddress}`,
                    tokenAddress: tokenAddress,
                    token: token.symbol || 'UNKNOWN',
                    tokenName: token.name || 'Unknown Token',
                    apy: apy,
                    tvl: Number(poolInfo.tvl || 0n) / 1e18, // Assuming 18 decimals for TVL
                    totalStaked: Number(poolInfo.totalStaked || 0n) / 1e18,
                    minStake: Number(poolInfo.minStake || 0n) / 1e18,
                    lockPeriod: '30 days', // Default, could be made dynamic
                    status: poolInfo.isActive ? 'active' : 'inactive',
                });
            } catch (error) {
                console.warn(`Failed to fetch pool info for ${tokenAddress}:`, error);
            }
        }

        return pools;
    } catch (error) {
        console.error('Error fetching pools from contract:', error);
        return [];
    }
};

/**
 * Fetch pools from API (fallback)
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of pool objects
 */
export const fetchPoolsFromAPI = async (chainId) => {
    try {
        const apiUrl = process.env.REACT_APP_STAKING_API_URL || 'https://api.mango.defi/staking';
        const response = await fetch(`${apiUrl}/pools?chainId=${chainId}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.pools || [];
    } catch (error) {
        console.warn('Failed to fetch pools from API:', error);
        return [];
    }
};

/**
 * Get staking pools (tries contract first, then API, then mock)
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of pool objects
 */
export const getStakingPools = async (publicClient, stakingAddress, chainId) => {
    // Try contract first
    if (publicClient && stakingAddress) {
        const contractPools = await fetchPoolsFromContract(publicClient, stakingAddress, chainId);
        if (contractPools && contractPools.length > 0) {
            return contractPools;
        }
    }

    // Try API
    const apiPools = await fetchPoolsFromAPI(chainId);
    if (apiPools && apiPools.length > 0) {
        return apiPools;
    }

    // Fallback to mock pools
    const chainInfo = chainConfig.getChain(chainId);
    const tokenList = chainInfo?.tokens || [];
    const mockPools = tokenList.slice(0, 3).map((token, index) => ({
        id: `${chainId}-${token.address || 'native'}-${index}`,
        tokenAddress: token.address || 'native',
        token: token.symbol,
        tokenName: token.name,
        apy: token.symbol === 'MANGO' ? 12.5 : token.symbol === 'BNB' ? 8.5 : 6.2,
        tvl: Math.random() * 5000000 + 100000,
        totalStaked: Math.random() * 10000000 + 500000,
        minStake: token.symbol === 'MANGO' ? 10 : token.symbol === 'BNB' ? 1 : 0.1,
        lockPeriod: '30 days',
        status: 'active',
    }));

    return mockPools;
};

/**
 * Fetch user's active stakes from contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of stake objects
 */
export const fetchUserStakesFromContract = async (publicClient, stakingAddress, userAddress, chainId) => {
    if (!publicClient || !stakingAddress || !userAddress) {
        return [];
    }

    try {
        // Get user's stake IDs
        const stakeIds = await publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getUserStakes',
            args: [userAddress],
        });

        if (!stakeIds || stakeIds.length === 0) {
            return [];
        }

        const stakes = [];
        const chainInfo = chainConfig.getChain(chainId);
        const tokenList = chainInfo?.tokens || [];

        // Fetch info for each stake
        for (const stakeId of stakeIds) {
            try {
                const stakeInfo = await publicClient.readContract({
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'getStakeInfo',
                    args: [stakeId],
                });

                if (!stakeInfo.isActive) continue; // Skip inactive stakes

                // Find token info
                const token = tokenList.find(t => 
                    t.address?.toLowerCase() === stakeInfo.token.toLowerCase() ||
                    (stakeInfo.token === '0x0000000000000000000000000000000000000000' && t.address === 'native')
                ) || { symbol: 'UNKNOWN', decimals: 18 };

                const decimals = token.decimals || 18;
                const amount = Number(stakeInfo.amount) / (10 ** decimals);
                const rewards = Number(stakeInfo.rewards) / (10 ** decimals);
                const lockPeriodSeconds = Number(stakeInfo.lockPeriod);
                const stakedAt = Number(stakeInfo.stakedAt) * 1000; // Convert to milliseconds
                const unlockTime = Number(stakeInfo.unlockTime) * 1000;

                // Calculate APY for this stake's lock period
                const apy = await fetchAPYFromContract(publicClient, stakingAddress, stakeInfo.token, lockPeriodSeconds) || 0;

                stakes.push({
                    id: Number(stakeId),
                    stakeId: Number(stakeId),
                    token: token.symbol,
                    tokenAddress: stakeInfo.token,
                    amount: amount.toFixed(2),
                    apy: apy,
                    stakedDate: new Date(stakedAt).toISOString(),
                    unlockDate: new Date(unlockTime).toISOString(),
                    rewards: rewards.toFixed(2),
                    status: stakeInfo.isActive ? 'active' : 'inactive',
                    lockPeriod: lockPeriodSeconds,
                });
            } catch (error) {
                console.warn(`Failed to fetch stake info for stakeId ${stakeId}:`, error);
            }
        }

        return stakes;
    } catch (error) {
        console.error('Error fetching user stakes from contract:', error);
        return [];
    }
};

/**
 * Fetch user stakes from API (fallback)
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of stake objects
 */
export const fetchUserStakesFromAPI = async (userAddress, chainId) => {
    try {
        const apiUrl = process.env.REACT_APP_STAKING_API_URL || 'https://api.mango.defi/staking';
        const response = await fetch(`${apiUrl}/stakes?user=${userAddress}&chainId=${chainId}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.stakes || [];
    } catch (error) {
        console.warn('Failed to fetch user stakes from API:', error);
        return [];
    }
};

/**
 * Get user's active stakes (tries contract first, then API, then mock)
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of stake objects
 */
export const getUserStakes = async (publicClient, stakingAddress, userAddress, chainId) => {
    // Try contract first
    if (publicClient && stakingAddress && userAddress) {
        const contractStakes = await fetchUserStakesFromContract(publicClient, stakingAddress, userAddress, chainId);
        if (contractStakes && contractStakes.length > 0) {
            return contractStakes;
        }
    }

    // Try API
    const apiStakes = await fetchUserStakesFromAPI(userAddress, chainId);
    if (apiStakes && apiStakes.length > 0) {
        return apiStakes;
    }

    // Return empty array if no stakes found (don't use mock data for user stakes)
    return [];
};

/**
 * Calculate unlock progress percentage
 * @param {string} stakedDate - ISO date string
 * @param {string} unlockDate - ISO date string
 * @returns {number} Progress percentage (0-100)
 */
export const calculateUnlockProgress = (stakedDate, unlockDate) => {
    const now = Date.now();
    const staked = new Date(stakedDate).getTime();
    const unlock = new Date(unlockDate).getTime();
    
    if (now >= unlock) return 100;
    if (now <= staked) return 0;
    
    const total = unlock - staked;
    const elapsed = now - staked;
    return Math.min(100, (elapsed / total) * 100);
};

/**
 * Get early unstake penalty percentage
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {number} stakeId - Stake ID
 * @returns {Promise<number>} Penalty percentage (0-100)
 */
export const getEarlyUnstakePenalty = async (publicClient, stakingAddress, stakeId) => {
    if (!publicClient || !stakingAddress) {
        return 0; // Default no penalty if can't fetch
    }

    try {
        const penalty = await publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getEarlyUnstakePenalty',
            args: [BigInt(stakeId)],
        });
        return Number(penalty) / 100; // Convert from basis points to percentage
    } catch (error) {
        console.warn('Failed to fetch early unstake penalty:', error);
        // Default penalty: 2-5% depending on how early
        return 2.5;
    }
};

/**
 * Fetch total rewards from contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} userAddress - User wallet address
 * @returns {Promise<Object>} { totalPending, totalClaimed }
 */
export const fetchTotalRewardsFromContract = async (publicClient, stakingAddress, userAddress) => {
    if (!publicClient || !stakingAddress || !userAddress) {
        return { totalPending: 0, totalClaimed: 0 };
    }

    try {
        const rewards = await publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getTotalRewards',
            args: [userAddress],
        });

        // Assuming rewards are returned as [totalPending, totalClaimed] in wei
        const totalPending = Number(rewards[0] || 0n) / 1e18;
        const totalClaimed = Number(rewards[1] || 0n) / 1e18;

        return { totalPending, totalClaimed };
    } catch (error) {
        console.warn('Failed to fetch total rewards from contract:', error);
        return { totalPending: 0, totalClaimed: 0 };
    }
};

/**
 * Fetch rewards by token from contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Array>} Array of { token, pending, claimed }
 */
export const fetchRewardsByTokenFromContract = async (publicClient, stakingAddress, userAddress, chainId) => {
    if (!publicClient || !stakingAddress || !userAddress) {
        return [];
    }

    try {
        const chainInfo = chainConfig.getChain(chainId);
        const tokenList = chainInfo?.tokens || [];
        const rewardsByToken = [];

        // Get rewards for each supported token
        for (const token of tokenList.slice(0, 10)) { // Limit to first 10 tokens
            try {
                const tokenAddress = token.address === 'native' 
                    ? '0x0000000000000000000000000000000000000000' 
                    : token.address;

                const rewards = await publicClient.readContract({
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'getRewardsByToken',
                    args: [userAddress, tokenAddress],
                });

                const decimals = token.decimals || 18;
                const pending = Number(rewards[0] || 0n) / (10 ** decimals);
                const claimed = Number(rewards[1] || 0n) / (10 ** decimals);

                if (pending > 0 || claimed > 0) {
                    rewardsByToken.push({
                        token: token.symbol,
                        tokenAddress: tokenAddress,
                        pending: pending,
                        claimed: claimed,
                    });
                }
            } catch (error) {
                console.warn(`Failed to fetch rewards for ${token.symbol}:`, error);
            }
        }

        return rewardsByToken;
    } catch (error) {
        console.error('Error fetching rewards by token from contract:', error);
        return [];
    }
};

/**
 * Fetch claimable rewards from contract
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} userAddress - User wallet address
 * @returns {Promise<Object>} { stakeIds, amounts }
 */
export const fetchClaimableRewardsFromContract = async (publicClient, stakingAddress, userAddress) => {
    if (!publicClient || !stakingAddress || !userAddress) {
        return { stakeIds: [], amounts: [] };
    }

    try {
        const claimable = await publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getClaimableRewards',
            args: [userAddress],
        });

        const stakeIds = claimable[0]?.map(id => Number(id)) || [];
        const amounts = claimable[1]?.map(amt => Number(amt) / 1e18) || [];

        return { stakeIds, amounts };
    } catch (error) {
        console.warn('Failed to fetch claimable rewards from contract:', error);
        return { stakeIds: [], amounts: [] };
    }
};

/**
 * Fetch rewards from API (fallback)
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Object>} Rewards data
 */
export const fetchRewardsFromAPI = async (userAddress, chainId) => {
    try {
        const apiUrl = process.env.REACT_APP_STAKING_API_URL || 'https://api.mango.defi/staking';
        const response = await fetch(`${apiUrl}/rewards?user=${userAddress}&chainId=${chainId}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('Failed to fetch rewards from API:', error);
        return null;
    }
};

/**
 * Get user rewards (tries contract first, then API, then mock)
 * @param {Object} publicClient - Viem public client
 * @param {string} stakingAddress - Staking contract address
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Object>} Rewards data
 */
export const getUserRewards = async (publicClient, stakingAddress, userAddress, chainId) => {
    // Try contract first
    if (publicClient && stakingAddress && userAddress) {
        try {
            const [totalRewards, rewardsByToken] = await Promise.all([
                fetchTotalRewardsFromContract(publicClient, stakingAddress, userAddress),
                fetchRewardsByTokenFromContract(publicClient, stakingAddress, userAddress, chainId),
            ]);

            if (totalRewards.totalPending > 0 || totalRewards.totalClaimed > 0 || rewardsByToken.length > 0) {
                return {
                    totalPending: totalRewards.totalPending,
                    totalClaimed: totalRewards.totalClaimed,
                    byToken: rewardsByToken,
                };
            }
        } catch (error) {
            console.warn('Failed to fetch rewards from contract:', error);
        }
    }

    // Try API
    const apiRewards = await fetchRewardsFromAPI(userAddress, chainId);
    if (apiRewards) {
        return apiRewards;
    }

    // Return empty rewards if nothing found
    return {
        totalPending: 0,
        totalClaimed: 0,
        byToken: [],
    };
};

/**
 * Calculate referral rewards (if applicable)
 * @param {string} userAddress - User wallet address
 * @param {number} chainId - Chain ID
 * @returns {Promise<number>} Referral rewards amount
 */
export const calculateReferralRewards = async (userAddress, chainId) => {
    // TODO: Integrate with referral system to calculate referral rewards from staking
    // This would typically involve:
    // 1. Getting user's referral chain
    // 2. Calculating rewards based on referral tier
    // 3. Summing up referral rewards from all stakes
    
    try {
        // Placeholder: In production, this would fetch from referral contract/API
        // For now, return 0 as referral rewards are typically calculated separately
        return 0;
    } catch (error) {
        console.warn('Failed to calculate referral rewards:', error);
        return 0;
    }
};

export default {
    fetchAPYFromContract,
    fetchAPYFromAPI,
    getAPY,
    getLockPeriodsFromContract,
    fetchPoolsFromContract,
    fetchPoolsFromAPI,
    getStakingPools,
    fetchUserStakesFromContract,
    fetchUserStakesFromAPI,
    getUserStakes,
    calculateUnlockProgress,
    getEarlyUnstakePenalty,
    fetchTotalRewardsFromContract,
    fetchRewardsByTokenFromContract,
    fetchClaimableRewardsFromContract,
    fetchRewardsFromAPI,
    getUserRewards,
    calculateReferralRewards,
    LOCK_PERIODS,
    LOCK_PERIOD_LABELS,
    STAKING_ABI,
};

