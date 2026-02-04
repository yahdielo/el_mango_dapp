import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import { getStakingPools } from '../../services/stakingService';
import '../css/StakeMobile.css';

const StakePoolList = ({ chainId }) => {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('apy'); // 'apy', 'tvl', 'token'
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
    const publicClient = usePublicClient();

    const stakingAddress = chainConfig.getContractAddress(chainId, 'manager');

    const fetchPools = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedPools = await getStakingPools(publicClient, stakingAddress, chainId);
            setPools(fetchedPools);
        } catch (error) {
            console.error('Error fetching pools:', error);
            setPools([]);
        } finally {
            setLoading(false);
        }
    }, [publicClient, stakingAddress, chainId]);

    useEffect(() => {
        fetchPools();
        
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchPools, 60000);
        return () => clearInterval(interval);
    }, [fetchPools]);

    const formatNumber = (num) => {
        const n = parseFloat(num);
        if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
        return `$${n.toFixed(2)}`;
    };

    const filteredAndSortedPools = useMemo(() => {
        let filtered = pools.filter(pool => {
            const matchesSearch = !searchQuery || 
                pool.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pool.tokenName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || pool.status === filterStatus;
            return matchesSearch && matchesStatus;
        });

        return filtered.sort((a, b) => {
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
    }, [pools, searchQuery, filterStatus, sortBy]);

    if (loading) {
        return (
            <div className="stake-card">
                <div className="stake-loading">Loading pools...</div>
            </div>
        );
    }

    return (
        <div className="stake-pools-list">
            {/* Search and Filter Controls */}
            <div className="stake-pools-controls">
                <input
                    type="text"
                    className="stake-pools-search"
                    placeholder="Search pools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="stake-pools-filters">
                    <select 
                        className="stake-pools-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
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
            </div>

            {/* Pool Cards */}
            {filteredAndSortedPools.length === 0 ? (
                <div className="stake-card">
                    <div className="stake-empty-state">
                        <p>No pools found matching your criteria</p>
                    </div>
                </div>
            ) : (
                filteredAndSortedPools.map((pool) => (
                <div key={pool.id} className="stake-pool-card">
                    <div className="stake-pool-header">
                        <div className="stake-pool-token">
                            <div className="stake-pool-token-symbol">{pool.token}</div>
                            <div className="stake-pool-token-name">{pool.tokenName}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div className="stake-pool-apy">{pool.apy.toFixed(2)}% APY</div>
                            <div className={`stake-pool-status stake-pool-status-${pool.status}`}>
                                {pool.status === 'active' ? '✓ Active' : '✗ Inactive'}
                            </div>
                        </div>
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

                    <button 
                        className="stake-pool-button"
                        onClick={() => {
                            // Navigate to stake tab with pre-selected token
                            // This would require passing a callback or using navigation
                            console.log('Navigate to stake with token:', pool.token);
                            // In production, this would navigate to stake tab with token pre-selected
                            alert(`Navigate to stake ${pool.token}`);
                        }}
                    >
                        Stake {pool.token}
                    </button>
                </div>
                ))
            )}
        </div>
    );
};

export default StakePoolList;

