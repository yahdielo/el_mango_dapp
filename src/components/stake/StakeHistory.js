import React, { useState, useEffect } from 'react';
import '../css/StakeMobile.css';

const StakeHistory = ({ address, chainId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'stake', 'unstake', 'claim'

    useEffect(() => {
        if (address) {
            // TODO: Fetch actual staking history from API
            setLoading(true);
            setTimeout(() => {
                // Mock data
                setHistory([
                    {
                        id: 1,
                        type: 'stake',
                        token: 'MANGO',
                        amount: '1000.00',
                        timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
                        txHash: '0x123...abc',
                        status: 'success'
                    },
                    {
                        id: 2,
                        type: 'claim',
                        token: 'MANGO',
                        amount: '12.50',
                        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
                        txHash: '0x456...def',
                        status: 'success'
                    },
                    {
                        id: 3,
                        type: 'stake',
                        token: 'BNB',
                        amount: '50.00',
                        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
                        txHash: '0x789...ghi',
                        status: 'success'
                    },
                    {
                        id: 4,
                        type: 'unstake',
                        token: 'ETH',
                        amount: '10.00',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        txHash: '0xabc...jkl',
                        status: 'success'
                    }
                ]);
                setLoading(false);
            }, 1000);
        } else {
            setHistory([]);
            setLoading(false);
        }
    }, [address, chainId]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return `${minutes} minutes ago`;
            }
            return `${hours} hours ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const filteredHistory = filter === 'all'
        ? history
        : history.filter(item => item.type === filter);

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
            {/* Filter */}
            <div className="stake-history-filters">
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

                        {tx.txHash && (
                            <a
                                href={`https://basescan.org/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="stake-history-link"
                            >
                                View on Explorer
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StakeHistory;

