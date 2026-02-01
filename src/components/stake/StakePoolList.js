import React, { useState, useEffect } from 'react';
import '../css/StakeMobile.css';

const StakePoolList = ({ chainId }) => {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('apy'); // 'apy', 'tvl', 'token'

    useEffect(() => {
        // TODO: Fetch actual staking pools from API
        setLoading(true);
        setTimeout(() => {
            // Mock data
            setPools([
                {
                    id: 1,
                    token: 'MANGO',
                    tokenName: 'Mango Token',
                    apy: 12.5,
                    tvl: 500000,
                    totalStaked: 1000000,
                    minStake: 10,
                    lockPeriod: '30 days'
                },
                {
                    id: 2,
                    token: 'BNB',
                    tokenName: 'BNB',
                    apy: 8.5,
                    tvl: 2500000,
                    totalStaked: 5000000,
                    minStake: 1,
                    lockPeriod: '7 days'
                },
                {
                    id: 3,
                    token: 'ETH',
                    tokenName: 'Ethereum',
                    apy: 6.2,
                    tvl: 1000000,
                    totalStaked: 2000000,
                    minStake: 0.1,
                    lockPeriod: '14 days'
                }
            ]);
            setLoading(false);
        }, 1000);
    }, [chainId]);

    const formatNumber = (num) => {
        const n = parseFloat(num);
        if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
        return `$${n.toFixed(2)}`;
    };

    const sortedPools = [...pools].sort((a, b) => {
        switch (sortBy) {
            case 'apy':
                return b.apy - a.apy;
            case 'tvl':
                return b.tvl - a.tvl;
            case 'token':
                return a.token.localeCompare(b.token);
            default:
                return 0;
        }
    });

    if (loading) {
        return (
            <div className="stake-card">
                <div className="stake-loading">Loading pools...</div>
            </div>
        );
    }

    return (
        <div className="stake-pools-list">
            {/* Sort Control */}
            <div className="stake-pools-controls">
                <select 
                    className="stake-pools-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="apy">Sort by APY</option>
                    <option value="tvl">Sort by TVL</option>
                    <option value="token">Sort by Token</option>
                </select>
            </div>

            {/* Pool Cards */}
            {sortedPools.map((pool) => (
                <div key={pool.id} className="stake-pool-card">
                    <div className="stake-pool-header">
                        <div className="stake-pool-token">
                            <div className="stake-pool-token-symbol">{pool.token}</div>
                            <div className="stake-pool-token-name">{pool.tokenName}</div>
                        </div>
                        <div className="stake-pool-apy">{pool.apy.toFixed(2)}% APY</div>
                    </div>
                    
                    <div className="stake-pool-details">
                        <div className="stake-pool-detail-item">
                            <span className="stake-pool-label">Total Value Locked:</span>
                            <span className="stake-pool-value">{formatNumber(pool.tvl)}</span>
                        </div>
                        <div className="stake-pool-detail-item">
                            <span className="stake-pool-label">Total Staked:</span>
                            <span className="stake-pool-value">{formatNumber(pool.totalStaked)}</span>
                        </div>
                        <div className="stake-pool-detail-item">
                            <span className="stake-pool-label">Min Stake:</span>
                            <span className="stake-pool-value">{pool.minStake} {pool.token}</span>
                        </div>
                        <div className="stake-pool-detail-item">
                            <span className="stake-pool-label">Lock Period:</span>
                            <span className="stake-pool-value">{pool.lockPeriod}</span>
                        </div>
                    </div>

                    <button className="stake-pool-button">
                        Stake {pool.token}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default StakePoolList;

