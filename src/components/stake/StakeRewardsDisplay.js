import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import { getUserRewards, calculateReferralRewards, fetchClaimableRewardsFromContract, STAKING_ABI } from '../../services/stakingService';
import { saveSwapTransaction, updateSwapTransaction } from '../../services/transactionHistory';
import '../css/StakeMobile.css';

const StakeRewardsDisplay = ({ address, chainId }) => {
    const { address: accountAddress } = useAccount();
    const finalAddress = address || accountAddress;
    
    const [rewards, setRewards] = useState({
        totalPending: 0,
        totalClaimed: 0,
        byToken: []
    });
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
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

            alert('All rewards claimed successfully!');
            setClaiming(false);
            setTxHash(null);
            fetchRewards();
        }
    }, [isConfirmed, txHash, finalAddress, chainId, fetchRewards]);

    const fetchRewards = useCallback(async () => {
        if (!finalAddress) {
            setRewards({
                totalPending: 0,
                totalClaimed: 0,
                byToken: []
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch rewards from contract/API
            const rewardsData = await getUserRewards(publicClient, stakingAddress, finalAddress, chainId);
            
            // Calculate referral rewards if applicable
            const referralRewards = await calculateReferralRewards(finalAddress, chainId);
            
            // Add referral rewards to total pending if any
            const totalPending = rewardsData.totalPending + referralRewards;
            
            setRewards({
                totalPending: totalPending,
                totalClaimed: rewardsData.totalClaimed,
                byToken: rewardsData.byToken || []
            });
        } catch (error) {
            console.error('Error fetching rewards:', error);
            setRewards({
                totalPending: 0,
                totalClaimed: 0,
                byToken: []
            });
        } finally {
            setLoading(false);
        }
    }, [finalAddress, publicClient, stakingAddress, chainId]);

    useEffect(() => {
        fetchRewards();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchRewards, 30000);
        return () => clearInterval(interval);
    }, [fetchRewards]);

    const handleClaimAll = async () => {
        if (rewards.totalPending === 0 || !stakingAddress) {
            alert('No pending rewards to claim');
            return;
        }

        // Get claimable rewards to calculate total amount
        let totalClaimable = rewards.totalPending;
        if (publicClient && finalAddress) {
            try {
                const claimable = await fetchClaimableRewardsFromContract(publicClient, stakingAddress, finalAddress);
                if (claimable.amounts && claimable.amounts.length > 0) {
                    totalClaimable = claimable.amounts.reduce((sum, amt) => sum + amt, 0);
                }
            } catch (error) {
                console.warn('Failed to fetch claimable rewards:', error);
            }
        }

        if (totalClaimable === 0) {
            alert('No claimable rewards available');
            return;
        }

        setClaiming(true);
        try {
            writeContract(
                {
                    address: stakingAddress,
                    abi: STAKING_ABI,
                    functionName: 'claimAllRewards',
                    gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                },
                {
                    onSuccess: (hash) => {
                        setTxHash(hash);
                        console.log('Claim all rewards transaction submitted:', hash);
                        
                        // Save to transaction history
                        if (finalAddress && chainId) {
                            try {
                                saveSwapTransaction({
                                    txHash: hash,
                                    userAddress: finalAddress,
                                    chainId: chainId,
                                    type: 'claimAllRewards',
                                    tokenInSymbol: 'Rewards',
                                    amountIn: totalClaimable.toFixed(4),
                                    tokenOutSymbol: 'Multiple',
                                    amountOut: totalClaimable.toFixed(4),
                                    status: 'pending',
                                });
                            } catch (error) {
                                console.error('Failed to save transaction to history:', error);
                            }
                        }
                    },
                    onError: (error) => {
                        console.error('Claim all rewards failed:', error);
                        alert('Failed to claim rewards: ' + (error.message || 'Unknown error'));
                        setClaiming(false);
                    },
                }
            );
        } catch (error) {
            console.error('Error claiming rewards:', error);
            alert('Failed to claim rewards: ' + (error.message || 'Unknown error'));
            setClaiming(false);
        }
    };

    if (loading) {
        return (
            <div className="stake-card">
                <div className="stake-loading">Loading rewards...</div>
            </div>
        );
    }

    return (
        <div className="stake-rewards">
            {/* Total Rewards Summary */}
            <div className="stake-card stake-rewards-summary">
                <div className="stake-rewards-summary-title">Total Rewards</div>
                <div className="stake-rewards-summary-grid">
                    <div className="stake-rewards-summary-item">
                        <div className="stake-rewards-summary-label">Pending</div>
                        <div className="stake-rewards-summary-value stake-rewards-pending">
                            {rewards.totalPending.toFixed(4)}
                        </div>
                    </div>
                    <div className="stake-rewards-summary-item">
                        <div className="stake-rewards-summary-label">Claimed</div>
                        <div className="stake-rewards-summary-value stake-rewards-claimed">
                            {rewards.totalClaimed.toFixed(4)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Rewards by Token */}
            {rewards.byToken.length > 0 && (
                <div className="stake-card">
                    <div className="stake-card-title">Rewards by Token</div>
                    <div className="stake-rewards-by-token">
                        {rewards.byToken.map((item, index) => (
                            <div key={index} className="stake-rewards-token-item">
                                <div className="stake-rewards-token-header">
                                    <div className="stake-rewards-token-symbol">{item.token}</div>
                                </div>
                                <div className="stake-rewards-token-details">
                                    <div className="stake-rewards-token-detail">
                                        <span className="stake-rewards-token-label">Pending:</span>
                                        <span className="stake-rewards-token-value stake-rewards-pending">
                                            {item.pending.toFixed(4)} {item.token}
                                        </span>
                                    </div>
                                    <div className="stake-rewards-token-detail">
                                        <span className="stake-rewards-token-label">Claimed:</span>
                                        <span className="stake-rewards-token-value stake-rewards-claimed">
                                            {item.claimed.toFixed(4)} {item.token}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Claim All Button */}
            {rewards.totalPending > 0 && (
                <div className="stake-button-container">
                    <button
                        className="stake-button stake-button-primary"
                        onClick={handleClaimAll}
                        disabled={claiming || isConfirming}
                    >
                        {claiming || isConfirming ? (isConfirming ? 'Confirming...' : 'Claiming...') : 'Claim All Rewards'}
                    </button>
                    {txHash && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#7A7A7A', textAlign: 'center' }}>
                            Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StakeRewardsDisplay;

