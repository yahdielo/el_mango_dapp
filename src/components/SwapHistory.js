/**
 * SwapHistory Component
 * 
 * Displays history of all swaps with filtering and sorting capabilities.
 */

import React, { useState, useMemo } from 'react';
import { Card, Table, Form, Button, Badge } from 'react-bootstrap';
import { ArrowDownUp, BoxArrowUpRight, Download } from 'react-bootstrap-icons';
import chainConfig from '../services/chainConfig';
import { trackConfirmations } from '../utils/confirmationTracking';
import './css/SwapHistory.css';

// Mock data - in production, this would come from API
const SwapHistory = ({ swaps = [], className = '' }) => {
    const [filterChain, setFilterChain] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('date'); // 'date' or 'amount'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

    const filteredAndSortedSwaps = useMemo(() => {
        let filtered = [...swaps];

        // Filter by chain
        if (filterChain !== 'all') {
            filtered = filtered.filter(
                swap => swap.sourceChainId === parseInt(filterChain) || 
                        swap.destChainId === parseInt(filterChain)
            );
        }

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(swap => swap.status === filterStatus);
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            
            if (sortBy === 'date') {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                comparison = dateA - dateB;
            } else if (sortBy === 'amount') {
                const amountA = parseFloat(a.amountIn || 0);
                const amountB = parseFloat(b.amountIn || 0);
                comparison = amountA - amountB;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [swaps, filterChain, filterStatus, sortBy, sortOrder]);

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
            ['Date', 'From Chain', 'To Chain', 'Amount', 'Status', 'TX Hash'],
            ...filteredAndSortedSwaps.map(swap => [
                new Date(swap.createdAt).toLocaleString(),
                swap.sourceChainId || 'N/A',
                swap.destChainId || 'N/A',
                swap.amountIn || '0',
                swap.status || 'unknown',
                swap.sourceTxHash || swap.destTxHash || 'N/A',
            ]),
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swap-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <Card className={`swap-history ${className}`}>
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Swap History</h5>
                    <Button variant="outline-primary" size="sm" onClick={handleExport}>
                        <Download size={16} className="me-1" />
                        Export
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                {/* Filters */}
                <div className="filters mb-3">
                    <div className="row g-2">
                        <div className="col-md-4">
                            <Form.Label>Filter by Chain</Form.Label>
                            <Form.Select
                                value={filterChain}
                                onChange={(e) => setFilterChain(e.target.value)}
                            >
                                <option value="all">All Chains</option>
                                <option value="8453">Base</option>
                                <option value="42161">Arbitrum</option>
                                <option value="137">Polygon</option>
                                <option value="10">Optimism</option>
                                <option value="43114">Avalanche</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-4">
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
                    </div>
                </div>

                {/* Table */}
                {filteredAndSortedSwaps.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        No swaps found
                    </div>
                ) : (
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
                                const sourceChainId = swap.sourceChainId;
                                const sourceTracking = sourceChainId ? trackConfirmations(sourceChainId, sourceConfirmations) : null;
                                
                                return (
                                    <tr key={swap.swapId || index}>
                                        <td>
                                            {swap.createdAt
                                                ? new Date(swap.createdAt).toLocaleString()
                                                : 'N/A'}
                                        </td>
                                        <td>
                                            {swap.sourceChainId && swap.destChainId ? (
                                                <>
                                                    {chainConfig.getChain(swap.sourceChainId)?.chainName || `Chain ${swap.sourceChainId}`} → {chainConfig.getChain(swap.destChainId)?.chainName || `Chain ${swap.destChainId}`}
                                                </>
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
                                            {swap.sourceTxHash && swap.sourceChainId ? (
                                                <a
                                                    href={getExplorerUrl(swap.sourceChainId, swap.sourceTxHash)}
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
                )}
            </Card.Body>
        </Card>
    );
};

export default SwapHistory;


