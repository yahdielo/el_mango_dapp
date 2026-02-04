import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import { getSwapHistory } from '../../services/transactionHistory';
import '../css/StakeMobile.css';

const StakeHistory = ({ address, chainId }) => {
    const { address: accountAddress } = useAccount();
    const finalAddress = address || accountAddress;
    
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'stake', 'unstake', 'claim'
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'year'

    const fetchHistory = useCallback(async () => {
        if (!finalAddress) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch all transactions from history service
            const allHistory = getSwapHistory(finalAddress, chainId);
            
            // Filter for staking-related transactions
            const stakingTypes = ['stake', 'unstake', 'claimRewards', 'claimAllRewards'];
            const stakingHistory = allHistory.filter(tx => 
                stakingTypes.includes(tx.type)
            ).map(tx => {
                // Map transaction types to display types
                let displayType = tx.type;
                if (tx.type === 'claimRewards' || tx.type === 'claimAllRewards') {
                    displayType = 'claim';
                }

                // Determine token and amount
                let token = tx.tokenOutSymbol || tx.tokenInSymbol || 'Unknown';
                let amount = tx.amountOut || tx.amountIn || '0';

                // For unstake, use tokenOut
                if (tx.type === 'unstake') {
                    token = tx.tokenOutSymbol || tx.tokenInSymbol || 'Unknown';
                    amount = tx.amountOut || tx.amountIn || '0';
                }

                // For stake, use tokenIn
                if (tx.type === 'stake') {
                    token = tx.tokenInSymbol || 'Unknown';
                    amount = tx.amountIn || '0';
                }

                // For claim, use tokenOut
                if (displayType === 'claim') {
                    token = tx.tokenOutSymbol || tx.tokenInSymbol || 'Unknown';
                    amount = tx.amountOut || tx.amountIn || '0';
                }

                return {
                    id: tx.txHash,
                    type: displayType,
                    token: token,
                    amount: amount,
                    timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
                    txHash: tx.txHash,
                    status: tx.status === 'completed' ? 'success' : tx.status || 'pending',
                    chainId: tx.chainId,
                };
            });

            setHistory(stakingHistory);
        } catch (error) {
            console.error('Error fetching staking history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [finalAddress, chainId]);

    useEffect(() => {
        fetchHistory();
        
        // Auto-refresh every 15 seconds
        const interval = setInterval(fetchHistory, 15000);
        return () => clearInterval(interval);
    }, [fetchHistory]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
            }
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const filteredHistory = useMemo(() => {
        let filtered = history;

        // Filter by type
        if (filter !== 'all') {
            filtered = filtered.filter(item => {
                if (filter === 'claim') {
                    return item.type === 'claim';
                }
                return item.type === filter;
            });
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            
            switch (dateFilter) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    break;
            }

            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= filterDate;
            });
        }

        return filtered;
    }, [history, filter, dateFilter]);

    const getTransactionDescription = (tx) => {
        switch (tx.type) {
            case 'stake':
                return `Staked ${tx.amount} ${tx.token}`;
            case 'unstake':
                return `Unstaked ${tx.amount} ${tx.token}`;
            case 'claim':
                return `Claimed ${tx.amount} ${tx.token} rewards`;
            default:
                return 'Transaction';
        }
    };

    if (loading) {
        return (
            <div className="stake-card">
                <div className="stake-loading">Loading history...</div>
            </div>
        );
    }

    if (filteredHistory.length === 0) {
        return (
            <div className="stake-card">
                <div className="stake-empty-state">
                    <p>No staking history found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="stake-history">
            {/* Filters */}
            <div className="stake-history-filters">
                <div className="stake-history-filter-group">
                    <button
                        className={`stake-history-filter ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`stake-history-filter ${filter === 'stake' ? 'active' : ''}`}
                        onClick={() => setFilter('stake')}
                    >
                        Stake
                    </button>
                    <button
                        className={`stake-history-filter ${filter === 'unstake' ? 'active' : ''}`}
                        onClick={() => setFilter('unstake')}
                    >
                        Unstake
                    </button>
                    <button
                        className={`stake-history-filter ${filter === 'claim' ? 'active' : ''}`}
                        onClick={() => setFilter('claim')}
                    >
                        Claims
                    </button>
                </div>
                <div className="stake-history-date-filter">
                    <select
                        className="stake-history-date-select"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="year">Last Year</option>
                    </select>
                </div>
            </div>

            {/* History List */}
            <div className="stake-history-list">
                {filteredHistory.map((tx) => (
                    <div key={tx.id} className="stake-history-item">
                        <div className="stake-history-header">
                            <div className={`stake-history-type stake-history-type-${tx.type}`}>
                                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            </div>
                            <div className="stake-history-status">
                                {tx.status === 'success' ? '✓' : '✗'}
                            </div>
                        </div>
                        
                        <div className="stake-history-body">
                            <div className="stake-history-description">
                                {getTransactionDescription(tx)}
                            </div>
                            <div className="stake-history-time">{formatDate(tx.timestamp)}</div>
                        </div>

                        {tx.txHash && (() => {
                            const txChainId = tx.chainId || chainId;
                            const chainInfo = chainConfig.getChain(txChainId);
                            const explorerUrl = chainInfo?.blockExplorers?.[0]?.url || 'https://basescan.org';
                            return (
                                <a
                                    href={`${explorerUrl}/tx/${tx.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="stake-history-link"
                                >
                                    View on Explorer
                                </a>
                            );
                        })()}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StakeHistory;

