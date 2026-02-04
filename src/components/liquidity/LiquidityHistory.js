import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getSwapHistory } from '../../services/transactionHistory';
import '../css/LiquidityMobile.css';

const LiquidityHistory = ({ address, chainId }) => {
    const { address: accountAddress } = useAccount();
    const publicClient = usePublicClient();
    const finalAddress = address || accountAddress;
    
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'add', 'remove', 'claim'

    const fetchHistory = useCallback(async () => {
        if (!finalAddress) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch from transaction history (localStorage)
            const swapHistory = getSwapHistory(finalAddress, chainId);
            
            // Filter for liquidity-related transactions
            const liquidityHistory = swapHistory.filter(tx => 
                tx.type === 'addLiquidity' || 
                tx.type === 'removeLiquidity' || 
                tx.type === 'claimFees'
            ).map(tx => {
                // Map transaction types to history format
                let type = 'add';
                if (tx.type === 'removeLiquidity') type = 'remove';
                if (tx.type === 'claimFees') type = 'claim';

                // Extract token pair from tokenOut or tokenIn
                let tokenPair = 'Unknown';
                if (tx.tokenOut) {
                    // tokenOut might be "TOKENA/TOKENB" or just a symbol
                    tokenPair = tx.tokenOut;
                } else if (tx.tokenIn && tx.tokenIn !== 'LP') {
                    tokenPair = tx.tokenIn;
                }

                return {
                    id: tx.txHash,
                    type: type,
                    tokenPair: tokenPair,
                    amount: tx.amountIn || '0',
                    lpTokens: tx.type === 'addLiquidity' ? tx.amountIn : (tx.type === 'removeLiquidity' ? tx.amountIn : '0'),
                    tokensReceived: tx.type === 'removeLiquidity' && tx.amountOut ? {
                        tokenA: tx.amountOut.split('/')[0] || '0',
                        tokenB: tx.amountOut.split('/')[1] || '0',
                    } : undefined,
                    fees: tx.type === 'claimFees' ? tx.amountOut : undefined,
                    timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
                    txHash: tx.txHash,
                    status: tx.status || 'completed',
                };
            });

            // Sort by timestamp (newest first)
            liquidityHistory.sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateB - dateA;
            });

            setHistory(liquidityHistory);

            // TODO: Also fetch from blockchain events for more complete history
            // This would involve:
            // 1. Querying contract events (PairCreated, Mint, Burn, Swap)
            // 2. Filtering by user address
            // 3. Parsing event data
            // 4. Merging with localStorage history
            // 
            // Example:
            // const events = await publicClient.getLogs({
            //     address: pairAddress,
            //     event: parseAbiItem('event Mint(address indexed sender, uint amount0, uint amount1)'),
            //     args: { sender: finalAddress },
            //     fromBlock: 'earliest',
            // });
            
        } catch (error) {
            console.error('Error fetching history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [finalAddress, chainId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredHistory = useMemo(() => {
        return filter === 'all' 
            ? history 
            : history.filter(item => item.type === filter);
    }, [history, filter]);

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
                                href={chainConfig.getChain(chainId)?.blockExplorers?.[0]?.url 
                                    ? `${chainConfig.getChain(chainId).blockExplorers[0].url}/tx/${item.txHash}`
                                    : `https://basescan.org/tx/${item.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="liquidity-history-link"
                            >
                                View on Explorer
                            </a>
                        )}
                        {item.status && item.status !== 'completed' && (
                            <div className="liquidity-history-status" style={{
                                fontSize: '11px',
                                color: item.status === 'pending' ? '#FF9800' : '#F44336',
                                marginTop: '4px'
                            }}>
                                Status: {item.status}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiquidityHistory;

