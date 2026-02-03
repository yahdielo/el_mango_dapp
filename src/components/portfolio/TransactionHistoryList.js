import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import '../css/PortfolioMobile.css';

const TransactionHistoryList = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'swap', 'stake', 'liquidity', 'transfer'

    const fetchTransactions = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // TODO: Fetch actual transaction history from API/blockchain
            // This would query:
            // 1. Swap transactions from DEX contracts
            // 2. Stake/unstake transactions from staking contracts
            // 3. Liquidity add/remove transactions from LP contracts
            // 4. Transfer transactions from token contracts
            // 5. Aggregate and format for display
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Enhanced mock data
            const mockTransactions = [
                {
                    id: 1,
                    type: 'swap',
                    fromToken: 'BNB',
                    toToken: 'MANGO',
                    amount: '10.00',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    chainId: 8453,
                    chainName: 'Base',
                    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    status: 'success'
                },
                {
                    id: 2,
                    type: 'stake',
                    token: 'MANGO',
                    amount: '100.00',
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    chainId: 56,
                    chainName: 'BNB Smart Chain',
                    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    status: 'success'
                },
                {
                    id: 3,
                    type: 'liquidity',
                    action: 'add',
                    tokenPair: 'BNB/MANGO',
                    amount: '50.25',
                    timestamp: new Date(Date.now() - 172800000).toISOString(),
                    chainId: 8453,
                    chainName: 'Base',
                    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    status: 'success'
                },
                {
                    id: 4,
                    type: 'transfer',
                    token: 'ETH',
                    amount: '1.5',
                    to: '0xabc...xyz',
                    timestamp: new Date(Date.now() - 259200000).toISOString(),
                    chainId: 42161,
                    chainName: 'Arbitrum One',
                    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    status: 'success'
                }
            ];
            
            setTransactions(mockTransactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

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

    const filteredTransactions = filter === 'all'
        ? transactions.filter(tx => !selectedChain || tx.chainId === selectedChain)
        : transactions.filter(tx => 
            tx.type === filter && (!selectedChain || tx.chainId === selectedChain)
        );

    const getTransactionDescription = (tx) => {
        switch (tx.type) {
            case 'swap':
                return `Swapped ${tx.amount} ${tx.fromToken} for ${tx.toToken}`;
            case 'stake':
                return `Staked ${tx.amount} ${tx.token}`;
            case 'liquidity':
                return `${tx.action === 'add' ? 'Added' : 'Removed'} ${tx.amount} LP (${tx.tokenPair})`;
            case 'transfer':
                return `Transferred ${tx.amount} ${tx.token}`;
            default:
                return 'Transaction';
        }
    };

    if (!finalIsConnected) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-empty-state">
                    <p>Connect your wallet to view transaction history</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-loading">Loading transactions...</div>
            </div>
        );
    }

    return (
        <div className="portfolio-history">
            {/* Filter */}
            <div className="portfolio-history-filters">
                <button
                    className={`portfolio-history-filter ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`portfolio-history-filter ${filter === 'swap' ? 'active' : ''}`}
                    onClick={() => setFilter('swap')}
                >
                    Swap
                </button>
                <button
                    className={`portfolio-history-filter ${filter === 'stake' ? 'active' : ''}`}
                    onClick={() => setFilter('stake')}
                >
                    Stake
                </button>
                <button
                    className={`portfolio-history-filter ${filter === 'liquidity' ? 'active' : ''}`}
                    onClick={() => setFilter('liquidity')}
                >
                    Liquidity
                </button>
                <button
                    className={`portfolio-history-filter ${filter === 'transfer' ? 'active' : ''}`}
                    onClick={() => setFilter('transfer')}
                >
                    Transfer
                </button>
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
                <div className="portfolio-card">
                    <div className="portfolio-empty-state">
                        <p>No transactions found</p>
                    </div>
                </div>
            ) : (
                <div className="portfolio-history-list">
                    {filteredTransactions.map((tx) => (
                        <div key={tx.id} className="portfolio-history-item">
                            <div className="portfolio-history-header">
                                <div className={`portfolio-history-type portfolio-history-type-${tx.type}`}>
                                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                </div>
                                <div className="portfolio-history-status">
                                    {tx.status === 'success' ? '✓' : '✗'}
                                </div>
                            </div>
                            
                            <div className="portfolio-history-body">
                                <div className="portfolio-history-description">
                                    {getTransactionDescription(tx)}
                                </div>
                                <div className="portfolio-history-meta">
                                    <span className="portfolio-history-chain">{tx.chainName}</span>
                                    <span className="portfolio-history-time">{formatDate(tx.timestamp)}</span>
                                </div>
                            </div>

                            {tx.txHash && (() => {
                                const chain = chainConfig.getChain(tx.chainId);
                                const explorerUrl = chain?.blockExplorers?.[0]?.url || 'https://basescan.org';
                                return (
                                    <a
                                        href={`${explorerUrl}/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="portfolio-history-link"
                                    >
                                        View on Explorer
                                    </a>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransactionHistoryList;

