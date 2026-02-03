import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import chainConfig from '../../services/chainConfig';
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
        if (isConfirmed && txHash) {
            alert('All rewards claimed successfully!');
            setClaiming(false);
            setTxHash(null);
            fetchRewards();
        }
    }, [isConfirmed, txHash]);

    const fetchRewards = async () => {
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
            // TODO: Fetch actual rewards from API/contract
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Mock data
            setRewards({
                totalPending: 15.25,
                totalClaimed: 50.75,
                byToken: [
                    { token: 'MANGO', pending: 12.50, claimed: 40.00 },
                    { token: 'BNB', pending: 2.75, claimed: 10.75 }
                ]
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
    };

    useEffect(() => {
        fetchRewards();
    }, [finalAddress, chainId]);

    const handleClaimAll = async () => {
        if (rewards.totalPending === 0) {
            alert('No pending rewards to claim');
            return;
        }

        setClaiming(true);
        try {
            // TODO: Implement actual contract interaction
            // const stakingAbi = parseAbi(['function claimAllRewards()']);
            // writeContract({
            //     address: stakingAddress,
            //     abi: stakingAbi,
            //     functionName: 'claimAllRewards',
            // });

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            setTxHash(mockTxHash);
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

