import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getUserStakes, calculateUnlockProgress, getEarlyUnstakePenalty, STAKING_ABI } from '../../services/stakingService';
import { saveSwapTransaction, updateSwapTransaction } from '../../services/transactionHistory';
import '../css/StakeMobile.css';

const ActiveStakesList = ({ address, chainId }) => {
    const { address: accountAddress } = useAccount();
    const finalAddress = address || accountAddress;
    
    const [stakes, setStakes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unstakingId, setUnstakingId] = useState(null);
    const [claimingId, setClaimingId] = useState(null);
    const [txHash, setTxHash] = useState(null);
    
    const stakingAddress = chainConfig.getContractAddress(chainId, 'manager');
    const gasSettings = chainConfig.getGasSettings(chainId);
    const publicClient = usePublicClient();
    const { writeContract } = useWriteContract();
    
    // Transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash && finalAddress && chainId) {
            // Update transaction status in history
            try {
                updateSwapTransaction(txHash, 'completed', {
                    confirmedAt: new Date().toISOString(),
                });
            } catch (error) {
                console.error('Failed to update transaction status:', error);
            }

            if (unstakingId) {
                alert('Tokens unstaked successfully!');
                setUnstakingId(null);
                fetchStakes();
            } else if (claimingId) {
                alert('Rewards claimed successfully!');
                setClaimingId(null);
                fetchStakes();
            }
            setTxHash(null);
        }
    }, [isConfirmed, txHash, unstakingId, claimingId, finalAddress, chainId, fetchStakes]);

    const fetchStakes = useCallback(async () => {
        if (!finalAddress) {
            setStakes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const fetchedStakes = await getUserStakes(publicClient, stakingAddress, finalAddress, chainId);
            setStakes(fetchedStakes);
        } catch (error) {
            console.error('Error fetching stakes:', error);
            setStakes([]);
        } finally {
            setLoading(false);
        }
    }, [finalAddress, publicClient, stakingAddress, chainId]);

    useEffect(() => {
        fetchStakes();
    }, [finalAddress, chainId]);

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleUnstake = async (stakeId) => {
        const stake = stakes.find(s => s.id === stakeId);
        if (!stake || !stakingAddress) return;

        const isBeforeUnlock = new Date(stake.unlockDate) > new Date();
        
        // Get early unstake penalty if applicable
        let penaltyPercent = 0;
        if (isBeforeUnlock && publicClient) {
            try {
                penaltyPercent = await getEarlyUnstakePenalty(publicClient, stakingAddress, stakeId);
            } catch (error) {
                console.warn('Failed to fetch penalty:', error);
                penaltyPercent = 2.5; // Default penalty
            }
        }

        const confirmMessage = isBeforeUnlock 
            ? `⚠️ Unstaking before unlock date will incur a ${penaltyPercent.toFixed(2)}% penalty. Continue?`
            : 'Are you sure you want to unstake?';

        if (!window.confirm(confirmMessage)) return;

        setUnstakingId(stakeId);
        try {
            writeContract(
                {
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'unstake',
                    args: [BigInt(stakeId)],
                    gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                },
                {
                    onSuccess: (hash) => {
                        setTxHash(hash);
                        console.log('Unstake transaction submitted:', hash);
                        
                        // Save to transaction history
                        if (finalAddress && chainId) {
                            try {
                                saveSwapTransaction({
                                    txHash: hash,
                                    userAddress: finalAddress,
                                    chainId: chainId,
                                    type: 'unstake',
                                    tokenInSymbol: 'Staked',
                                    tokenInAddress: stake.tokenAddress || 'staked',
                                    amountIn: stake.amount,
                                    tokenOutSymbol: stake.token,
                                    tokenOutAddress: stake.tokenAddress || 'native',
                                    amountOut: stake.amount,
                                    status: 'pending',
                                    earlyUnstake: isBeforeUnlock,
                                    penaltyPercent: penaltyPercent,
                                });
                            } catch (error) {
                                console.error('Failed to save transaction to history:', error);
                            }
                        }
                    },
                    onError: (error) => {
                        console.error('Unstake failed:', error);
                        alert('Failed to unstake: ' + (error.message || 'Unknown error'));
                        setUnstakingId(null);
                    },
                }
            );
        } catch (error) {
            console.error('Error unstaking:', error);
            alert('Failed to unstake: ' + (error.message || 'Unknown error'));
            setUnstakingId(null);
        }
    };

    const handleClaimRewards = async (stakeId) => {
        const stake = stakes.find(s => s.id === stakeId);
        if (!stake || parseFloat(stake.rewards) <= 0 || !stakingAddress) {
            alert('No rewards to claim');
            return;
        }

        setClaimingId(stakeId);
        try {
            writeContract(
                {
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'claimRewards',
                    args: [BigInt(stakeId)],
                    gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                },
                {
                    onSuccess: (hash) => {
                        setTxHash(hash);
                        console.log('Claim rewards transaction submitted:', hash);
                        
                        // Save to transaction history
                        if (finalAddress && chainId) {
                            try {
                                saveSwapTransaction({
                                    txHash: hash,
                                    userAddress: finalAddress,
                                    chainId: chainId,
                                    type: 'claimRewards',
                                    tokenInSymbol: 'Rewards',
                                    amountIn: stake.rewards,
                                    tokenOutSymbol: stake.token,
                                    tokenOutAddress: stake.tokenAddress || 'native',
                                    amountOut: stake.rewards,
                                    status: 'pending',
                                });
                            } catch (error) {
                                console.error('Failed to save transaction to history:', error);
                            }
                        }
                    },
                    onError: (error) => {
                        console.error('Claim rewards failed:', error);
                        alert('Failed to claim rewards: ' + (error.message || 'Unknown error'));
                        setClaimingId(null);
                    },
                }
            );
        } catch (error) {
            console.error('Error claiming rewards:', error);
            alert('Failed to claim rewards: ' + (error.message || 'Unknown error'));
            setClaimingId(null);
        }
    };

    if (loading) {
        return (
            <div className="stake-card">
                <div className="stake-loading">Loading active stakes...</div>
            </div>
        );
    }

    if (stakes.length === 0) {
        return (
            <div className="stake-card">
                <div className="stake-empty-state">
                    <p>No active stakes found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="stake-active-list">
            {stakes.map((stake) => (
                <div key={stake.id} className="stake-active-card">
                    <div className="stake-active-header">
                        <div className="stake-active-token">{stake.token}</div>
                        <div className={`stake-active-status stake-active-status-${stake.status}`}>
                            {stake.status}
                        </div>
                    </div>
                    
                    <div className="stake-active-details">
                        <div className="stake-active-detail-item">
                            <span className="stake-active-label">Staked Amount:</span>
                            <span className="stake-active-value">{stake.amount} {stake.token}</span>
                        </div>
                        <div className="stake-active-detail-item">
                            <span className="stake-active-label">APY:</span>
                            <span className="stake-active-value">{stake.apy.toFixed(2)}%</span>
                        </div>
                        <div className="stake-active-detail-item">
                            <span className="stake-active-label">Staked Date:</span>
                            <span className="stake-active-value">{formatDate(stake.stakedDate)}</span>
                        </div>
                        <div className="stake-active-detail-item">
                            <span className="stake-active-label">Unlock Date:</span>
                            <span className="stake-active-value">{formatDate(stake.unlockDate)}</span>
                        </div>
                        <div className="stake-active-detail-item">
                            <span className="stake-active-label">Unlock Progress:</span>
                            <span className="stake-active-value">
                                {calculateUnlockProgress(stake.stakedDate, stake.unlockDate).toFixed(1)}%
                            </span>
                        </div>
                        <div className="stake-active-detail-item">
                            <span className="stake-active-label">Pending Rewards:</span>
                            <span className="stake-active-value stake-active-rewards">
                                {stake.rewards} {stake.token}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="stake-unlock-progress">
                            <div 
                                className="stake-unlock-progress-bar"
                                style={{ 
                                    width: `${calculateUnlockProgress(stake.stakedDate, stake.unlockDate)}%` 
                                }}
                            />
                        </div>
                    </div>

                    <div className="stake-active-actions">
                        <button 
                            className="stake-active-button stake-active-button-secondary"
                            onClick={() => handleClaimRewards(stake.id)}
                            disabled={claimingId === stake.id || unstakingId === stake.id || isConfirming || parseFloat(stake.rewards) <= 0}
                        >
                            {claimingId === stake.id ? 'Claiming...' : 'Claim Rewards'}
                        </button>
                        <button 
                            className="stake-active-button stake-active-button-primary"
                            onClick={() => handleUnstake(stake.id)}
                            disabled={claimingId === stake.id || unstakingId === stake.id || isConfirming}
                        >
                            {unstakingId === stake.id ? 'Unstaking...' : 'Unstake'}
                        </button>
                    </div>
                    {txHash && (claimingId === stake.id || unstakingId === stake.id) && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#7A7A7A', textAlign: 'center' }}>
                            Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ActiveStakesList;

