import React, { useState, useEffect } from 'react';
import '../css/StakeMobile.css';

const StakeRewardsDisplay = ({ address, chainId }) => {
    const [rewards, setRewards] = useState({
        totalPending: 0,
        totalClaimed: 0,
        byToken: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (address) {
            // TODO: Fetch actual rewards from API
            setLoading(true);
            setTimeout(() => {
                // Mock data
                setRewards({
                    totalPending: 15.25,
                    totalClaimed: 50.75,
                    byToken: [
                        { token: 'MANGO', pending: 12.50, claimed: 40.00 },
                        { token: 'BNB', pending: 2.75, claimed: 10.75 }
                    ]
                });
                setLoading(false);
            }, 1000);
        } else {
            setRewards({
                totalPending: 0,
                totalClaimed: 0,
                byToken: []
            });
            setLoading(false);
        }
    }, [address, chainId]);

    const handleClaimAll = async () => {
        if (rewards.totalPending === 0) {
            alert('No pending rewards to claim');
            return;
        }

        // TODO: Implement claim all rewards logic
        console.log('Claiming all rewards:', rewards.totalPending);
        alert(`Claimed ${rewards.totalPending} tokens!`);
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
                    >
                        Claim All Rewards
                    </button>
                </div>
            )}
        </div>
    );
};

export default StakeRewardsDisplay;

