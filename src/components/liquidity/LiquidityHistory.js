import React, { useState, useEffect } from 'react';
import '../css/LiquidityMobile.css';

const LiquidityHistory = ({ address, chainId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'add', 'remove', 'claim'

    useEffect(() => {
        if (address) {
            // TODO: Fetch actual history from API
            setLoading(true);
            setTimeout(() => {
                // Mock data
                setHistory([
                    {
                        id: 1,
                        type: 'add',
                        tokenPair: 'BNB/MANGO',
                        amount: '50.25',
                        lpTokens: '50.25',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        txHash: '0x123...abc'
                    },
                    {
                        id: 2,
                        type: 'remove',
                        tokenPair: 'ETH/USDC',
                        amount: '25.00',
                        tokensReceived: { tokenA: '12.5', tokenB: '12.5' },
                        timestamp: new Date(Date.now() - 172800000).toISOString(),
                        txHash: '0x456...def'
                    },
                    {
                        id: 3,
                        type: 'claim',
                        tokenPair: 'BNB/MANGO',
                        fees: '5.25',
                        timestamp: new Date(Date.now() - 259200000).toISOString(),
                        txHash: '0x789...ghi'
                    }
                ]);
                setLoading(false);
            }, 1000);
        }
    }, [address, chainId]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredHistory = filter === 'all' 
        ? history 
        : history.filter(item => item.type === filter);

    if (loading) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-loading">Loading history...</div>
            </div>
        );
    }

    if (filteredHistory.length === 0) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-empty-state">
                    <p>No liquidity history found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="liquidity-history">
            {/* Filter */}
            <div className="liquidity-history-filters">
                <button 
                    className={`liquidity-history-filter ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button 
                    className={`liquidity-history-filter ${filter === 'add' ? 'active' : ''}`}
                    onClick={() => setFilter('add')}
                >
                    Added
                </button>
                <button 
                    className={`liquidity-history-filter ${filter === 'remove' ? 'active' : ''}`}
                    onClick={() => setFilter('remove')}
                >
                    Removed
                </button>
                <button 
                    className={`liquidity-history-filter ${filter === 'claim' ? 'active' : ''}`}
                    onClick={() => setFilter('claim')}
                >
                    Claims
                </button>
            </div>

            {/* History Items */}
            <div className="liquidity-history-list">
                {filteredHistory.map((item) => (
                    <div key={item.id} className="liquidity-history-item">
                        <div className="liquidity-history-header">
                            <div className={`liquidity-history-type liquidity-history-type-${item.type}`}>
                                {item.type === 'add' ? 'Added' : item.type === 'remove' ? 'Removed' : 'Claimed'}
                            </div>
                            <div className="liquidity-history-date">{formatDate(item.timestamp)}</div>
                        </div>
                        
                        <div className="liquidity-history-details">
                            <div className="liquidity-history-pair">{item.tokenPair}</div>
                            {item.type === 'add' && (
                                <div className="liquidity-history-amount">
                                    Amount: {item.amount} LP
                                </div>
                            )}
                            {item.type === 'remove' && (
                                <div className="liquidity-history-amount">
                                    Removed: {item.amount} LP
                                </div>
                            )}
                            {item.type === 'claim' && (
                                <div className="liquidity-history-amount">
                                    Fees: {item.fees}
                                </div>
                            )}
                        </div>

                        {item.txHash && (
                            <a 
                                href={`https://basescan.org/tx/${item.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="liquidity-history-link"
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

export default LiquidityHistory;

