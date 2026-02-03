import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import chainConfig from '../../services/chainConfig';
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
    }, [isConfirmed, txHash, unstakingId, claimingId]);

    const fetchStakes = async () => {
        if (!finalAddress) {
            setStakes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // TODO: Fetch actual active stakes from API/contract
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Mock data
            setStakes([
                {
                    id: 1,
                    token: 'MANGO',
                    amount: '1000.00',
                    apy: 12.5,
                    stakedDate: new Date(Date.now() - 86400000 * 10).toISOString(),
                    unlockDate: new Date(Date.now() + 86400000 * 20).toISOString(),
                    rewards: '12.50',
                    status: 'active'
                },
                {
                    id: 2,
                    token: 'BNB',
                    amount: '50.00',
                    apy: 8.5,
                    stakedDate: new Date(Date.now() - 86400000 * 5).toISOString(),
                    unlockDate: new Date(Date.now() + 86400000 * 2).toISOString(),
                    rewards: '2.15',
                    status: 'active'
                }
            ]);
        } catch (error) {
            console.error('Error fetching stakes:', error);
            setStakes([]);
        } finally {
            setLoading(false);
        }
    };

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
        if (!stake) return;

        const isBeforeUnlock = new Date(stake.unlockDate) > new Date();
        const confirmMessage = isBeforeUnlock 
            ? '⚠️ Unstaking before unlock date may incur penalties. Continue?'
            : 'Are you sure you want to unstake?';

        if (!window.confirm(confirmMessage)) return;

        setUnstakingId(stakeId);
        try {
            // TODO: Implement actual contract interaction
            // const stakingAbi = parseAbi(['function unstake(uint256 stakeId)']);
            // writeContract({
            //     address: stakingAddress,
            //     abi: stakingAbi,
            //     functionName: 'unstake',
            //     args: [stakeId],
            // });

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            setTxHash(mockTxHash);
        } catch (error) {
            console.error('Error unstaking:', error);
            alert('Failed to unstake: ' + (error.message || 'Unknown error'));
            setUnstakingId(null);
        }
    };

    const handleClaimRewards = async (stakeId) => {
        const stake = stakes.find(s => s.id === stakeId);
        if (!stake || parseFloat(stake.rewards) <= 0) {
            alert('No rewards to claim');
            return;
        }

        setClaimingId(stakeId);
        try {
            // TODO: Implement actual contract interaction
            // const stakingAbi = parseAbi(['function claimRewards(uint256 stakeId)']);
            // writeContract({
            //     address: stakingAddress,
            //     abi: stakingAbi,
            //     functionName: 'claimRewards',
            //     args: [stakeId],
            // });

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            setTxHash(mockTxHash);
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
                            <span className="stake-active-label">Pending Rewards:</span>
                            <span className="stake-active-value stake-active-rewards">
                                {stake.rewards} {stake.token}
                            </span>
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

