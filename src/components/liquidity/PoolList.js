import React, { useState, useEffect } from 'react';
import '../css/LiquidityMobile.css';

const PoolList = ({ chainId }) => {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('tvl'); // 'tvl', 'volume', 'apr'
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // TODO: Fetch actual pools from API
        setLoading(true);
        setTimeout(() => {
            // Mock data
            setPools([
                {
                    id: 1,
                    tokenPair: 'BNB/MANGO',
                    tvl: '500000',
                    volume24h: '125000',
                    apr: '12.5',
                    fee: '0.3'
                },
                {
                    id: 2,
                    tokenPair: 'ETH/USDC',
                    tvl: '2500000',
                    volume24h: '500000',
                    apr: '15.2',
                    fee: '0.3'
                },
                {
                    id: 3,
                    tokenPair: 'USDT/USDC',
                    tvl: '1000000',
                    volume24h: '250000',
                    apr: '8.5',
                    fee: '0.05'
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
            case 'tvl':
                return parseFloat(b.tvl) - parseFloat(a.tvl);
            case 'volume':
                return parseFloat(b.volume24h) - parseFloat(a.volume24h);
            case 'apr':
                return parseFloat(b.apr) - parseFloat(a.apr);
            default:
                return 0;
        }
    });

    if (loading) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-loading">Loading pools...</div>
            </div>
        );
    }

    return (
        <div className="liquidity-pools-list">
            {/* Sort/Filter Controls */}
            <div className="liquidity-pools-controls">
                <select 
                    className="liquidity-pools-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="tvl">Sort by TVL</option>
                    <option value="volume">Sort by Volume</option>
                    <option value="apr">Sort by APR</option>
                </select>
            </div>

            {/* Pool Cards */}
            {sortedPools.map((pool) => (
                <div key={pool.id} className="liquidity-pool-card">
                    <div className="liquidity-pool-header">
                        <div className="liquidity-pool-pair">{pool.tokenPair}</div>
                        <div className="liquidity-pool-apr">{pool.apr}% APR</div>
                    </div>
                    
                    <div className="liquidity-pool-details">
                        <div className="liquidity-pool-detail-item">
                            <span className="liquidity-pool-label">TVL:</span>
                            <span className="liquidity-pool-value">{formatNumber(pool.tvl)}</span>
                        </div>
                        <div className="liquidity-pool-detail-item">
                            <span className="liquidity-pool-label">Volume 24h:</span>
                            <span className="liquidity-pool-value">{formatNumber(pool.volume24h)}</span>
                        </div>
                        <div className="liquidity-pool-detail-item">
                            <span className="liquidity-pool-label">Fee:</span>
                            <span className="liquidity-pool-value">{pool.fee}%</span>
                        </div>
                    </div>

                    <button className="liquidity-pool-button">
                        View Details
                    </button>
                </div>
            ))}
        </div>
    );
};

export default PoolList;

