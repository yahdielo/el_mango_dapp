import React, { useState, useEffect } from 'react';
import '../css/StakeMobile.css';

const ActiveStakesList = ({ address, chainId }) => {
    const [stakes, setStakes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (address) {
            // TODO: Fetch actual active stakes from API
            setLoading(true);
            setTimeout(() => {
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
                setLoading(false);
            }, 1000);
        } else {
            setStakes([]);
            setLoading(false);
        }
    }, [address, chainId]);

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleUnstake = async (stakeId) => {
        if (window.confirm('Are you sure you want to unstake? This may incur penalties if before unlock date.')) {
            // TODO: Implement unstake logic
            console.log('Unstaking:', stakeId);
            alert('Unstake initiated');
        }
    };

    const handleClaimRewards = async (stakeId) => {
        // TODO: Implement claim rewards logic
        console.log('Claiming rewards for:', stakeId);
        alert('Rewards claimed successfully!');
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
                        >
                            Claim Rewards
                        </button>
                        <button 
                            className="stake-active-button stake-active-button-primary"
                            onClick={() => handleUnstake(stake.id)}
                        >
                            Unstake
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActiveStakesList;

