import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import { getSwapHistory } from '../../services/transactionHistory';
import '../css/PortfolioMobile.css';

const TransactionHistoryList = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'swap', 'stake', 'liquidity', 'transfer'
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTransactions = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch from transaction history service (localStorage)
            const swapHistory = getSwapHistory(finalAddress, selectedChain);
            
            // Also check for liquidity history
            let liquidityHistory = [];
            try {
                const liquidityHistoryJson = localStorage.getItem('liquidityHistory');
                if (liquidityHistoryJson) {
                    liquidityHistory = JSON.parse(liquidityHistoryJson);
                    if (finalAddress) {
                        liquidityHistory = liquidityHistory.filter(tx => 
                            tx.userAddress?.toLowerCase() === finalAddress.toLowerCase()
                        );
                    }
                    if (selectedChain) {
                        liquidityHistory = liquidityHistory.filter(tx => tx.chainId === selectedChain);
                    }
                }
            } catch (error) {
                console.warn('Error reading liquidity history:', error);
            }

            // Check for staking history
            let stakingHistory = [];
            try {
                const stakingHistoryJson = localStorage.getItem('stakingHistory');
                if (stakingHistoryJson) {
                    stakingHistory = JSON.parse(stakingHistoryJson);
                    if (finalAddress) {
                        stakingHistory = stakingHistory.filter(tx => 
                            tx.userAddress?.toLowerCase() === finalAddress.toLowerCase()
                        );
                    }
                    if (selectedChain) {
                        stakingHistory = stakingHistory.filter(tx => tx.chainId === selectedChain);
                    }
                }
            } catch (error) {
                console.warn('Error reading staking history:', error);
            }

            // Combine and format all transactions
            const allTransactions = [];

            // Format swap transactions
            swapHistory.forEach(tx => {
                if (tx.type === 'swap' || !tx.type) {
                    allTransactions.push({
                        id: tx.txHash,
                        type: 'swap',
                        fromToken: tx.tokenInSymbol || tx.tokenIn || 'Unknown',
                        toToken: tx.tokenOutSymbol || tx.tokenOut || 'Unknown',
                        amount: tx.amountIn || '0',
                        timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
                        chainId: tx.chainId,
                        chainName: chainConfig.getChain(tx.chainId)?.chainName || `Chain ${tx.chainId}`,
                        txHash: tx.txHash,
                        status: tx.status || 'completed',
                    });
                }
            });

            // Format liquidity transactions
            [...swapHistory.filter(tx => tx.type === 'addLiquidity' || tx.type === 'removeLiquidity'), ...liquidityHistory].forEach(tx => {
                const isAdd = tx.type === 'addLiquidity' || tx.action === 'add';
                const tokenPair = tx.tokenOut || tx.tokenPair || 'Unknown';
                allTransactions.push({
                    id: tx.txHash || `liquidity-${Date.now()}-${Math.random()}`,
                    type: 'liquidity',
                    action: isAdd ? 'add' : 'remove',
                    tokenPair: tokenPair,
                    amount: tx.amountIn || tx.amount || '0',
                    timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
                    chainId: tx.chainId,
                    chainName: chainConfig.getChain(tx.chainId)?.chainName || `Chain ${tx.chainId}`,
                    txHash: tx.txHash,
                    status: tx.status || 'completed',
                });
            });

            // Format staking transactions
            stakingHistory.forEach(tx => {
                const isStake = tx.type === 'stake' || tx.action === 'stake';
                allTransactions.push({
                    id: tx.txHash || `stake-${Date.now()}-${Math.random()}`,
                    type: 'stake',
                    token: tx.tokenSymbol || tx.token || 'Unknown',
                    amount: tx.amount || tx.amountIn || '0',
                    action: isStake ? 'stake' : 'unstake',
                    timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
                    chainId: tx.chainId,
                    chainName: chainConfig.getChain(tx.chainId)?.chainName || `Chain ${tx.chainId}`,
                    txHash: tx.txHash,
                    status: tx.status || 'completed',
                });
            });

            // Sort by timestamp (newest first)
            allTransactions.sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateB - dateA;
            });

            setTransactions(allTransactions);
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

    const filteredTransactions = useMemo(() => {
        let filtered = transactions;

        // Apply type filter
        if (filter !== 'all') {
            filtered = filtered.filter(tx => tx.type === filter);
        }

        // Apply chain filter (already applied in fetchTransactions, but double-check)
        if (selectedChain) {
            filtered = filtered.filter(tx => tx.chainId === selectedChain);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(tx => 
                tx.txHash?.toLowerCase().includes(query) ||
                tx.fromToken?.toLowerCase().includes(query) ||
                tx.toToken?.toLowerCase().includes(query) ||
                tx.token?.toLowerCase().includes(query) ||
                tx.tokenPair?.toLowerCase().includes(query) ||
                tx.chainName?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [transactions, filter, selectedChain, searchQuery]);

    const getTransactionDescription = (tx) => {
        switch (tx.type) {
            case 'swap':
                return `Swapped ${parseFloat(tx.amount || '0').toFixed(4)} ${tx.fromToken} → ${tx.toToken}`;
            case 'stake':
                return `${tx.action === 'unstake' ? 'Unstaked' : 'Staked'} ${parseFloat(tx.amount || '0').toFixed(4)} ${tx.token}`;
            case 'liquidity':
                return `${tx.action === 'add' ? 'Added' : 'Removed'} ${parseFloat(tx.amount || '0').toFixed(4)} LP (${tx.tokenPair})`;
            case 'transfer':
                return `Transferred ${parseFloat(tx.amount || '0').toFixed(4)} ${tx.token}`;
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
            {/* Search */}
            <div style={{ marginBottom: '12px' }}>
                <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #E9E9E9',
                        fontSize: '14px',
                    }}
                />
            </div>

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

