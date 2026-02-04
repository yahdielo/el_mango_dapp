/**
 * SwapHistory Component
 * 
 * Displays history of all swaps with filtering and sorting capabilities.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Table, Form, Button, Badge, Spinner, Pagination, InputGroup } from 'react-bootstrap';
import { ArrowDownUp, BoxArrowUpRight, Download, Search, ArrowClockwise } from 'react-bootstrap-icons';
import chainConfig from '../services/chainConfig';
import { trackConfirmations } from '../utils/confirmationTracking';
import { getSwapHistory } from '../services/transactionHistory';
import { swapApi } from '../services/mangoApi';
import referralWebSocket from '../services/referralWebSocket';
import { useAccount, useChainId } from 'wagmi';
import './css/SwapHistory.css';

const SwapHistory = ({ swaps: propSwaps = [], className = '' }) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const [swaps, setSwaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [filterChain, setFilterChain] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [tokenPair, setTokenPair] = useState('');
    const [amountRange, setAmountRange] = useState({ min: '', max: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date' or 'amount'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [useApi, setUseApi] = useState(true); // Toggle between API and localStorage

    // Fetch swaps from API
    const fetchSwaps = useCallback(async (pageNum = 1, resetFilters = false) => {
        if (!address) {
            setSwaps([]);
            setLoading(false);
            return;
        }

        if (pageNum === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const filters = {
                page: pageNum,
                limit: 50,
            };

            if (filterChain !== 'all') {
                filters.chainId = parseInt(filterChain);
            }

            if (filterStatus !== 'all') {
                filters.status = filterStatus;
            }

            if (dateRange.start) {
                filters.startDate = new Date(dateRange.start).toISOString();
            }

            if (dateRange.end) {
                filters.endDate = new Date(dateRange.end).toISOString();
            }

            if (tokenPair) {
                filters.tokenPair = tokenPair;
            }

            if (amountRange.min) {
                filters.minAmount = parseFloat(amountRange.min);
            }

            if (amountRange.max) {
                filters.maxAmount = parseFloat(amountRange.max);
            }

            if (searchQuery) {
                filters.search = searchQuery;
            }

            const result = await swapApi.getSwapHistory(address, filters);
            
            if (result) {
                if (pageNum === 1) {
                    setSwaps(result.swaps || result.history || []);
                } else {
                    setSwaps(prev => [...prev, ...(result.swaps || result.history || [])]);
                }
                setTotalPages(result.totalPages || 1);
                setTotalItems(result.total || result.swaps?.length || 0);
            } else {
                // Fallback to localStorage
                const localHistory = getSwapHistory(address, filterChain !== 'all' ? parseInt(filterChain) : null);
                setSwaps(localHistory);
                setUseApi(false);
            }
        } catch (error) {
            console.error('Error fetching swap history:', error);
            // Fallback to localStorage
            const localHistory = getSwapHistory(address, filterChain !== 'all' ? parseInt(filterChain) : null);
            setSwaps(localHistory);
            setUseApi(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [address, filterChain, filterStatus, dateRange, tokenPair, amountRange, searchQuery]);

    // Load from localStorage as fallback
    const loadLocalSwaps = useCallback(() => {
        if (!address) {
            setSwaps([]);
            return;
        }

        const localHistory = getSwapHistory(address, filterChain !== 'all' ? parseInt(filterChain) : null);
        setSwaps(localHistory);
        setUseApi(false);
    }, [address, filterChain]);

    // Initial load
    useEffect(() => {
        if (propSwaps.length > 0) {
            setSwaps(propSwaps);
            setLoading(false);
        } else if (useApi && address) {
            fetchSwaps(1);
        } else if (address) {
            loadLocalSwaps();
        }
    }, [propSwaps, address, useApi, fetchSwaps, loadLocalSwaps]);

    // Setup WebSocket for real-time updates
    useEffect(() => {
        if (!address || !useApi) return;

        const unsubscribeSwap = referralWebSocket.subscribe('swap_completed', (data) => {
            console.log('New swap completed:', data);
            // Refresh first page
            fetchSwaps(1);
        });

        return () => {
            unsubscribeSwap();
        };
    }, [address, useApi, fetchSwaps]);

    // Refetch when filters change
    useEffect(() => {
        if (useApi && address) {
            setPage(1);
            fetchSwaps(1);
        } else if (address) {
            loadLocalSwaps();
        }
    }, [filterChain, filterStatus, dateRange, tokenPair, amountRange, searchQuery, useApi, address, fetchSwaps, loadLocalSwaps]);

    // Client-side filtering for localStorage data
    const filteredAndSortedSwaps = useMemo(() => {
        let filtered = [...swaps];

        // If using API, swaps are already filtered
        if (useApi) {
            // Just sort client-side
            filtered.sort((a, b) => {
                let comparison = 0;
                
                if (sortBy === 'date') {
                    const dateA = new Date(a.createdAt || a.timestamp || 0);
                    const dateB = new Date(b.createdAt || b.timestamp || 0);
                    comparison = dateA - dateB;
                } else if (sortBy === 'amount') {
                    const amountA = parseFloat(a.amountIn || 0);
                    const amountB = parseFloat(b.amountIn || 0);
                    comparison = amountA - amountB;
                }

                return sortOrder === 'asc' ? comparison : -comparison;
            });
            return filtered;
        }

        // Client-side filtering for localStorage
        if (filterChain !== 'all') {
            filtered = filtered.filter(
                swap => swap.chainId === parseInt(filterChain) ||
                        swap.sourceChainId === parseInt(filterChain) || 
                        swap.destChainId === parseInt(filterChain)
            );
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(swap => swap.status === filterStatus);
        }

        if (dateRange.start) {
            const startDate = new Date(dateRange.start);
            filtered = filtered.filter(swap => {
                const swapDate = new Date(swap.createdAt || swap.timestamp || 0);
                return swapDate >= startDate;
            });
        }

        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(swap => {
                const swapDate = new Date(swap.createdAt || swap.timestamp || 0);
                return swapDate <= endDate;
            });
        }

        if (tokenPair) {
            const pairLower = tokenPair.toLowerCase();
            filtered = filtered.filter(swap => {
                const tokenIn = (swap.tokenInSymbol || '').toLowerCase();
                const tokenOut = (swap.tokenOutSymbol || '').toLowerCase();
                return tokenIn.includes(pairLower) || tokenOut.includes(pairLower) ||
                       `${tokenIn}/${tokenOut}`.includes(pairLower);
            });
        }

        if (amountRange.min) {
            const minAmount = parseFloat(amountRange.min);
            filtered = filtered.filter(swap => parseFloat(swap.amountIn || 0) >= minAmount);
        }

        if (amountRange.max) {
            const maxAmount = parseFloat(amountRange.max);
            filtered = filtered.filter(swap => parseFloat(swap.amountIn || 0) <= maxAmount);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(swap => {
                return (
                    (swap.txHash || '').toLowerCase().includes(query) ||
                    (swap.tokenInSymbol || '').toLowerCase().includes(query) ||
                    (swap.tokenOutSymbol || '').toLowerCase().includes(query) ||
                    (swap.swapId || '').toLowerCase().includes(query)
                );
            });
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            
            if (sortBy === 'date') {
                const dateA = new Date(a.createdAt || a.timestamp || 0);
                const dateB = new Date(b.createdAt || b.timestamp || 0);
                comparison = dateA - dateB;
            } else if (sortBy === 'amount') {
                const amountA = parseFloat(a.amountIn || 0);
                const amountB = parseFloat(b.amountIn || 0);
                comparison = amountA - amountB;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [swaps, filterChain, filterStatus, dateRange, tokenPair, amountRange, searchQuery, sortBy, sortOrder, useApi]);

    const handleSort = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('desc');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'secondary', label: 'Pending' },
            processing: { bg: 'primary', label: 'Processing' },
            completed: { bg: 'success', label: 'Completed' },
            failed: { bg: 'danger', label: 'Failed' },
            cancelled: { bg: 'warning', label: 'Cancelled' },
        };
        const config = badges[status] || { bg: 'secondary', label: status };
        return <Badge bg={config.bg}>{config.label}</Badge>;
    };

    const getExplorerUrl = (chainId, txHash) => {
        if (!chainId || !txHash) return '#';
        try {
            return chainConfig.getExplorerUrl(chainId, txHash);
        } catch (error) {
            console.error('Error getting explorer URL:', error);
            return '#';
        }
    };

    const handleExport = () => {
        // Export swap history as CSV
        const csv = [
            ['Date', 'From Chain', 'To Chain', 'Token In', 'Token Out', 'Amount In', 'Amount Out', 'Status', 'TX Hash'],
            ...filteredAndSortedSwaps.map(swap => [
                (swap.createdAt || swap.timestamp) ? new Date(swap.createdAt || swap.timestamp).toLocaleString() : 'N/A',
                swap.sourceChainId ? (chainConfig.getChain(swap.sourceChainId)?.chainName || `Chain ${swap.sourceChainId}`) : 'N/A',
                swap.destChainId ? (chainConfig.getChain(swap.destChainId)?.chainName || `Chain ${swap.destChainId}`) : 'N/A',
                swap.tokenInSymbol || 'N/A',
                swap.tokenOutSymbol || 'N/A',
                swap.amountIn || '0',
                swap.amountOut || '0',
                swap.status || 'unknown',
                swap.txHash || swap.sourceTxHash || swap.destTxHash || 'N/A',
            ]),
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swap-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleLoadMore = () => {
        if (page < totalPages && !loadingMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchSwaps(nextPage);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
            setPage(newPage);
            fetchSwaps(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const allChains = useMemo(() => chainConfig.getAllChains(), []);

    if (!address) {
        return (
            <Card className={`swap-history ${className}`}>
                <Card.Body>
                    <div className="text-center py-4 text-muted">
                        Connect your wallet to view swap history
                    </div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className={`swap-history ${className}`}>
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 className="mb-0">Swap History</h5>
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => fetchSwaps(1)}
                            disabled={loading}
                        >
                            <ArrowClockwise size={14} className="me-1" />
                            Refresh
                        </Button>
                        <Button variant="outline-primary" size="sm" onClick={handleExport}>
                            <Download size={16} className="me-1" />
                            Export
                        </Button>
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                {/* Advanced Filters */}
                <div className="filters mb-3">
                    <div className="row g-2 mb-2">
                        <div className="col-md-3">
                            <Form.Label>Filter by Chain</Form.Label>
                            <Form.Select
                                value={filterChain}
                                onChange={(e) => setFilterChain(e.target.value)}
                            >
                                <option value="all">All Chains</option>
                                {allChains.map((chain) => (
                                    <option key={chain.chainId} value={chain.chainId}>
                                        {chain.chainName}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <Form.Label>Filter by Status</Form.Label>
                            <Form.Select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="cancelled">Cancelled</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="row g-2 mb-2">
                        <div className="col-md-4">
                            <Form.Label>Token Pair (e.g., ETH/USDC)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="ETH/USDC"
                                value={tokenPair}
                                onChange={(e) => setTokenPair(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <Form.Label>Min Amount</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="0.0"
                                value={amountRange.min}
                                onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                            />
                        </div>
                        <div className="col-md-4">
                            <Form.Label>Max Amount</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="0.0"
                                value={amountRange.max}
                                onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="row g-2">
                        <div className="col-md-12">
                            <Form.Label>Search</Form.Label>
                            <InputGroup>
                                <InputGroup.Text>
                                    <Search size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by TX hash, token symbol, or swap ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </InputGroup>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-4">
                        <Spinner animation="border" />
                        <p className="mt-2">Loading swap history...</p>
                    </div>
                )}

                {/* Table */}
                {!loading && filteredAndSortedSwaps.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <p>No swaps found</p>
                        {!useApi && (
                            <small className="d-block mt-2">
                                Showing local history. Enable API mode for full history from all chains.
                            </small>
                        )}
                    </div>
                ) : (
                    <>
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th>
                                        <button
                                            className="sort-button"
                                            onClick={() => handleSort('date')}
                                        >
                                            Date
                                            <ArrowDownUp size={12} className="ms-1" />
                                        </button>
                                    </th>
                                    <th>Route</th>
                                    <th>Token Pair</th>
                                    <th>
                                        <button
                                            className="sort-button"
                                            onClick={() => handleSort('amount')}
                                        >
                                            Amount
                                            <ArrowDownUp size={12} className="ms-1" />
                                        </button>
                                    </th>
                                    <th>Status</th>
                                    <th>Confirmations</th>
                                    <th>Transaction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedSwaps.map((swap, index) => {
                                    // Get confirmation tracking for source chain
                                    const sourceConfirmations = swap.sourceConfirmations || 0;
                                    const sourceChainId = swap.sourceChainId || swap.chainId;
                                    const sourceTracking = sourceChainId ? trackConfirmations(sourceChainId, sourceConfirmations) : null;
                                    
                                    return (
                                        <tr key={swap.swapId || swap.txHash || index}>
                                            <td>
                                                {(swap.createdAt || swap.timestamp)
                                                    ? new Date(swap.createdAt || swap.timestamp).toLocaleString()
                                                    : 'N/A'}
                                            </td>
                                            <td>
                                                {swap.sourceChainId && swap.destChainId ? (
                                                    <>
                                                        {chainConfig.getChain(swap.sourceChainId)?.chainName || `Chain ${swap.sourceChainId}`} → {chainConfig.getChain(swap.destChainId)?.chainName || `Chain ${swap.destChainId}`}
                                                    </>
                                                ) : swap.chainId ? (
                                                    chainConfig.getChain(swap.chainId)?.chainName || `Chain ${swap.chainId}`
                                                ) : (
                                                    'N/A'
                                                )}
                                            </td>
                                            <td>
                                                {swap.tokenInSymbol && swap.tokenOutSymbol ? (
                                                    <Badge bg="secondary">
                                                        {swap.tokenInSymbol}/{swap.tokenOutSymbol}
                                                    </Badge>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </td>
                                            <td>
                                                {swap.amountIn ? (
                                                    <strong>{parseFloat(swap.amountIn).toFixed(4)}</strong>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </td>
                                            <td>{getStatusBadge(swap.status)}</td>
                                            <td>
                                                {sourceTracking ? (
                                                    <div>
                                                        <Badge bg={sourceTracking.status.variant} className="me-1">
                                                            {sourceTracking.current}/{sourceTracking.required}
                                                        </Badge>
                                                        {!sourceTracking.isComplete && (
                                                            <small className="text-muted d-block mt-1">
                                                                {sourceTracking.formattedEstimatedTime} remaining
                                                            </small>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">N/A</span>
                                                )}
                                            </td>
                                            <td>
                                                {(swap.txHash || swap.sourceTxHash) && sourceChainId ? (
                                                    <a
                                                        href={getExplorerUrl(sourceChainId, swap.txHash || swap.sourceTxHash)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="tx-link"
                                                    >
                                                        View <BoxArrowUpRight size={12} />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted">N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>

                        {/* Pagination */}
                        {useApi && totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div>
                                    <small className="text-muted">
                                        Showing {filteredAndSortedSwaps.length} of {totalItems} swaps
                                    </small>
                                </div>
                                <div className="d-flex gap-2 align-items-center">
                                    <Pagination className="mb-0">
                                        <Pagination.First
                                            onClick={() => handlePageChange(1)}
                                            disabled={page === 1}
                                        />
                                        <Pagination.Prev
                                            onClick={() => handlePageChange(page - 1)}
                                            disabled={page === 1}
                                        />
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (page <= 3) {
                                                pageNum = i + 1;
                                            } else if (page >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = page - 2 + i;
                                            }
                                            return (
                                                <Pagination.Item
                                                    key={pageNum}
                                                    active={pageNum === page}
                                                    onClick={() => handlePageChange(pageNum)}
                                                >
                                                    {pageNum}
                                                </Pagination.Item>
                                            );
                                        })}
                                        <Pagination.Next
                                            onClick={() => handlePageChange(page + 1)}
                                            disabled={page === totalPages}
                                        />
                                        <Pagination.Last
                                            onClick={() => handlePageChange(totalPages)}
                                            disabled={page === totalPages}
                                        />
                                    </Pagination>
                                </div>
                            </div>
                        )}

                        {/* Load More Button (for infinite scroll alternative) */}
                        {useApi && page < totalPages && !loadingMore && (
                            <div className="text-center mt-3">
                                <Button
                                    variant="outline-primary"
                                    onClick={handleLoadMore}
                                >
                                    Load More
                                </Button>
                            </div>
                        )}

                        {loadingMore && (
                            <div className="text-center mt-3">
                                <Spinner size="sm" />
                                <span className="ms-2">Loading more...</span>
                            </div>
                        )}
                    </>
                )}
            </Card.Body>
        </Card>
    );
};

export default SwapHistory;


