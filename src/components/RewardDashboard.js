/**
 * RewardDashboard Component
 * 
 * Displays total rewards earned, rewards by chain, rewards by level,
 * reward history, pending rewards, and claimable rewards.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Table, Form, Badge, Alert, Button, Spinner, Modal } from 'react-bootstrap';
import { CashCoin, Trophy, Clock, CheckCircle, Download, ArrowClockwise, Wallet } from 'react-bootstrap-icons';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseAbi, parseUnits, formatUnits } from 'viem';
import chainConfig from '../services/chainConfig';
import { rewardApi } from '../services/mangoApi';
import referralWebSocket from '../services/referralWebSocket';
import ChainStatusBadge from './ChainStatusBadge';
import './css/RewardDashboard.css';

const RewardDashboard = ({ className = '' }) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const { writeContract } = useWriteContract();
    const [rewards, setRewards] = useState([]);
    const [claimableRewards, setClaimableRewards] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingClaim, setLoadingClaim] = useState(false);
    const [claimingChain, setClaimingChain] = useState(null);
    const [txHash, setTxHash] = useState(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedChains, setSelectedChains] = useState([]);
    const [filterChain, setFilterChain] = useState('all');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showHistory, setShowHistory] = useState(false);

    // Transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    // Fetch rewards
    const fetchRewards = useCallback(async () => {
        if (!address) {
            setRewards([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const rewardsData = await rewardApi.getRewards(address, null);
            setRewards(rewardsData || []);
        } catch (error) {
            console.error('Error fetching rewards:', error);
            setRewards([]);
        } finally {
            setLoading(false);
        }
    }, [address]);

    // Fetch claimable rewards
    const fetchClaimableRewards = useCallback(async () => {
        if (!address) {
            setClaimableRewards({});
            return;
        }

        try {
            const claimable = await rewardApi.getClaimableRewards(address, null);
            
            // Group by chain
            const byChain = {};
            if (claimable && claimable.rewards) {
                claimable.rewards.forEach(reward => {
                    const chainId = reward.chainId;
                    if (!byChain[chainId]) {
                        byChain[chainId] = {
                            chainId,
                            totalAmount: 0,
                            rewards: [],
                        };
                    }
                    const amount = parseFloat(reward.amount || 0);
                    byChain[chainId].totalAmount += amount;
                    byChain[chainId].rewards.push(reward);
                });
            }
            setClaimableRewards(byChain);
        } catch (error) {
            console.error('Error fetching claimable rewards:', error);
            setClaimableRewards({});
        }
    }, [address]);

    // Setup WebSocket for real-time updates
    useEffect(() => {
        if (!address) {
            return;
        }

        const unsubscribeReward = referralWebSocket.subscribe('reward_earned', (data) => {
            console.log('New reward earned:', data);
            // Refresh rewards
            fetchRewards();
            fetchClaimableRewards();
        });

        return () => {
            unsubscribeReward();
        };
    }, [address, fetchRewards, fetchClaimableRewards]);

    // Initial data fetch
    useEffect(() => {
        fetchRewards();
        fetchClaimableRewards();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchRewards();
            fetchClaimableRewards();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchRewards, fetchClaimableRewards]);

    // Handle claim transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash && claimingChain) {
            alert(`Rewards claimed successfully on ${chainConfig.getChain(claimingChain)?.chainName || `Chain ${claimingChain}`}!`);
            setTxHash(null);
            setClaimingChain(null);
            setLoadingClaim(false);
            // Refresh rewards
            fetchRewards();
            fetchClaimableRewards();
        }
    }, [isConfirmed, txHash, claimingChain, fetchRewards, fetchClaimableRewards]);

    const filteredRewards = useMemo(() => {
        let filtered = [...rewards];

        if (filterChain !== 'all') {
            filtered = filtered.filter(r => r.chainId === parseInt(filterChain));
        }

        if (filterLevel !== 'all') {
            filtered = filtered.filter(r => r.level === parseInt(filterLevel));
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(r => r.status === filterStatus);
        }

        if (dateRange.start) {
            const startDate = new Date(dateRange.start);
            filtered = filtered.filter(r => {
                const rewardDate = new Date(r.distributedAt || r.createdAt || 0);
                return rewardDate >= startDate;
            });
        }

        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999); // End of day
            filtered = filtered.filter(r => {
                const rewardDate = new Date(r.distributedAt || r.createdAt || 0);
                return rewardDate <= endDate;
            });
        }

        // Sort by date (newest first)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.distributedAt || a.createdAt || 0);
            const dateB = new Date(b.distributedAt || b.createdAt || 0);
            return dateB - dateA;
        });
    }, [rewards, filterChain, filterLevel, filterStatus, dateRange]);

    const totalRewards = useMemo(() => {
        return filteredRewards.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    }, [filteredRewards]);

    const rewardsByChain = useMemo(() => {
        const byChain = {};
        filteredRewards.forEach(r => {
            const chainId = r.chainId || 'unknown';
            byChain[chainId] = (byChain[chainId] || 0) + parseFloat(r.amount || 0);
        });
        return byChain;
    }, [filteredRewards]);

    const rewardsByLevel = useMemo(() => {
        const byLevel = {};
        filteredRewards.forEach(r => {
            const level = r.level || 'unknown';
            byLevel[level] = (byLevel[level] || 0) + parseFloat(r.amount || 0);
        });
        return byLevel;
    }, [filteredRewards]);

    const pendingRewards = useMemo(() => {
        return filteredRewards.filter(r => r.status === 'pending' || r.status === 'processing').length;
    }, [filteredRewards]);

    const getChainName = (chainId) => {
        const chain = chainConfig.getChain(chainId);
        return chain?.chainName || `Chain ${chainId}`;
    };

    // Get all chains for filter dropdown
    const allChains = useMemo(() => {
        return chainConfig.getAllChains();
    }, []);

    const getLevelLabel = (level) => {
        const levels = {
            1: 'Level 1 (40%)',
            2: 'Level 2 (25%)',
            3: 'Level 3 (15%)',
            4: 'Level 4 (10%)',
            5: 'Level 5 (10%)',
        };
        return levels[level] || `Level ${level}`;
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'warning', label: 'Pending' },
            processing: { bg: 'info', label: 'Processing' },
            completed: { bg: 'success', label: 'Completed' },
            claimed: { bg: 'success', label: 'Claimed' },
            failed: { bg: 'danger', label: 'Failed' },
        };
        const config = badges[status] || { bg: 'secondary', label: status };
        return <Badge bg={config.bg}>{config.label}</Badge>;
    };

    // Calculate total claimable rewards
    const totalClaimable = useMemo(() => {
        return Object.values(claimableRewards).reduce((sum, chain) => sum + chain.totalAmount, 0);
    }, [claimableRewards]);

    // Handle single chain claim
    const handleClaimRewards = async (targetChainId) => {
        if (!address || !targetChainId) {
            alert('Invalid claim parameters');
            return;
        }

        setLoadingClaim(true);
        setClaimingChain(targetChainId);
        setTxHash(null);

        try {
            const claimData = await rewardApi.claimRewards(address, targetChainId);
            
            if (claimData.txHash) {
                // Transaction already submitted by backend
                setTxHash(claimData.txHash);
            } else if (claimData.contractAddress && claimData.amount) {
                // Need to execute contract call
                const referralContract = chainConfig.getContractAddress(targetChainId, 'referral');
                if (!referralContract) {
                    throw new Error('Referral contract not found for this chain');
                }

                const referralAbi = parseAbi([
                    'function claimRewards() external returns (uint256)',
                    'function claimRewardsFor(address account) external returns (uint256)',
                ]);

                writeContract(
                    {
                        address: referralContract,
                        abi: referralAbi,
                        functionName: 'claimRewards',
                        gas: chainConfig.getGasSettings(targetChainId)?.gasLimit 
                            ? BigInt(chainConfig.getGasSettings(targetChainId).gasLimit)
                            : undefined,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('Claim transaction submitted:', hash);
                        },
                        onError: (error) => {
                            console.error('Claim failed:', error);
                            alert('Failed to claim rewards: ' + (error.message || 'Unknown error'));
                            setLoadingClaim(false);
                            setClaimingChain(null);
                        },
                    }
                );
            } else {
                throw new Error('Invalid claim response');
            }
        } catch (error) {
            console.error('Error claiming rewards:', error);
            alert('Failed to claim rewards: ' + (error.message || 'Unknown error'));
            setLoadingClaim(false);
            setClaimingChain(null);
        }
    };

    // Handle batch claim
    const handleBatchClaim = async () => {
        if (!address || selectedChains.length === 0) {
            alert('Please select at least one chain to claim');
            return;
        }

        setLoadingClaim(true);
        setShowClaimModal(false);

        try {
            const result = await rewardApi.batchClaimRewards(address, selectedChains);
            
            if (result.success) {
                alert(`Successfully claimed rewards on ${result.claimedChains?.length || selectedChains.length} chain(s)!`);
                // Refresh rewards
                fetchRewards();
                fetchClaimableRewards();
            } else {
                throw new Error(result.error || 'Batch claim failed');
            }
        } catch (error) {
            console.error('Error batch claiming rewards:', error);
            alert('Failed to batch claim rewards: ' + (error.message || 'Unknown error'));
        } finally {
            setLoadingClaim(false);
            setSelectedChains([]);
        }
    };

    // Export reward history
    const handleExportHistory = () => {
        const csvHeaders = ['Date', 'Chain', 'Level', 'Amount', 'Status', 'Transaction Hash'];
        const csvRows = filteredRewards.map(reward => [
            reward.distributedAt || reward.createdAt || 'N/A',
            getChainName(reward.chainId),
            getLevelLabel(reward.level),
            parseFloat(reward.amount || 0).toFixed(4),
            reward.status || 'N/A',
            reward.txHash || 'N/A',
        ]);

        const csv = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reward-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!address) {
        return (
            <Card className={`reward-dashboard ${className}`}>
                <Card.Body>
                    <Alert variant="info">Connect your wallet to view rewards</Alert>
                </Card.Body>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card className={`reward-dashboard ${className}`}>
                <Card.Body className="text-center">
                    <Spinner animation="border" />
                    <p className="mt-2">Loading rewards...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className={`reward-dashboard ${className}`}>
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <Trophy className="me-2" />
                        Reward Dashboard
                    </h5>
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                                fetchRewards();
                                fetchClaimableRewards();
                            }}
                            disabled={loading}
                        >
                            <ArrowClockwise size={14} className="me-1" />
                            Refresh
                        </Button>
                        {filteredRewards.length > 0 && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={handleExportHistory}
                            >
                                <Download size={14} className="me-1" />
                                Export
                            </Button>
                        )}
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                {/* Claimable Rewards Alert */}
                {totalClaimable > 0 && (
                    <Alert variant="success" className="mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <Wallet size={16} className="me-2" />
                                <strong>Claimable Rewards:</strong> {totalClaimable.toFixed(4)} MANGO
                            </div>
                            <div className="d-flex gap-2">
                                {Object.keys(claimableRewards).length === 1 ? (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleClaimRewards(parseInt(Object.keys(claimableRewards)[0]))}
                                        disabled={loadingClaim || isConfirming}
                                    >
                                        {loadingClaim || isConfirming ? (
                                            <>
                                                <Spinner size="sm" className="me-1" />
                                                {isConfirming ? 'Confirming...' : 'Claiming...'}
                                            </>
                                        ) : (
                                            'Claim Rewards'
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedChains(Object.keys(claimableRewards).map(c => parseInt(c)));
                                            setShowClaimModal(true);
                                        }}
                                        disabled={loadingClaim}
                                    >
                                        Claim All ({Object.keys(claimableRewards).length} chains)
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Alert>
                )}

                {/* Summary Cards */}
                <div className="summary-cards mb-4">
                    <div className="summary-card total">
                        <CashCoin size={24} className="mb-2" />
                        <div className="summary-label">Total Rewards</div>
                        <div className="summary-value">{totalRewards.toFixed(4)} MANGO</div>
                    </div>
                    <div className="summary-card pending">
                        <Clock size={24} className="mb-2" />
                        <div className="summary-label">Claimable</div>
                        <div className="summary-value">{totalClaimable.toFixed(4)} MANGO</div>
                    </div>
                    <div className="summary-card completed">
                        <CheckCircle size={24} className="mb-2" />
                        <div className="summary-label">Claimed</div>
                        <div className="summary-value">
                            {filteredRewards.filter(r => r.status === 'claimed' || r.status === 'completed').length}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters mb-3">
                    <div className="row g-2">
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
                            <Form.Label>Filter by Level</Form.Label>
                            <Form.Select
                                value={filterLevel}
                                onChange={(e) => setFilterLevel(e.target.value)}
                            >
                                <option value="all">All Levels</option>
                                <option value="1">Level 1 (40%)</option>
                                <option value="2">Level 2 (25%)</option>
                                <option value="3">Level 3 (15%)</option>
                                <option value="4">Level 4 (10%)</option>
                                <option value="5">Level 5 (10%)</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <Form.Label>Filter by Status</Form.Label>
                            <Form.Select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="claimable">Claimable</option>
                                <option value="claimed">Claimed</option>
                                <option value="completed">Completed</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <Form.Label>View</Form.Label>
                            <Form.Select
                                value={showHistory ? 'history' : 'rewards'}
                                onChange={(e) => setShowHistory(e.target.value === 'history')}
                            >
                                <option value="rewards">Current Rewards</option>
                                <option value="history">Full History</option>
                            </Form.Select>
                        </div>
                    </div>
                    {showHistory && (
                        <div className="row g-2 mt-2">
                            <div className="col-md-6">
                                <Form.Label>Start Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>End Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Rewards by Chain */}
                {Object.keys(rewardsByChain).length > 0 && (
                    <div className="rewards-breakdown mb-4">
                        <h6>Rewards by Chain</h6>
                        <div className="breakdown-items">
                            {Object.entries(rewardsByChain).map(([chainId, amount]) => (
                                <div key={chainId} className="breakdown-item">
                                    <div className="d-flex align-items-center gap-2">
                                        <Badge bg="primary">{getChainName(parseInt(chainId))}</Badge>
                                        <ChainStatusBadge chainId={parseInt(chainId)} />
                                    </div>
                                    <span className="amount">{amount.toFixed(4)} MANGO</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rewards by Level */}
                {Object.keys(rewardsByLevel).length > 0 && (
                    <div className="rewards-breakdown mb-4">
                        <h6>Rewards by Level</h6>
                        <div className="breakdown-items">
                            {Object.entries(rewardsByLevel).map(([level, amount]) => (
                                <div key={level} className="breakdown-item">
                                    <Badge bg="info">{getLevelLabel(parseInt(level))}</Badge>
                                    <span className="amount">{amount.toFixed(4)} MANGO</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rewards Table */}
                {filteredRewards.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <CashCoin size={48} className="mb-3" />
                        <p>No rewards found</p>
                    </div>
                ) : (
                    <Table responsive hover>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Chain</th>
                                <th>Level</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Transaction</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRewards.map((reward, index) => {
                                const isClaimable = reward.status === 'claimable' || reward.status === 'pending';
                                const claimableForChain = claimableRewards[reward.chainId];
                                
                                return (
                                    <tr key={reward.id || index}>
                                        <td>
                                            {reward.distributedAt
                                                ? new Date(reward.distributedAt).toLocaleString()
                                                : reward.createdAt
                                                ? new Date(reward.createdAt).toLocaleString()
                                                : 'N/A'}
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <Badge bg="primary">
                                                    {getChainName(reward.chainId)}
                                                </Badge>
                                                <ChainStatusBadge chainId={reward.chainId} />
                                            </div>
                                        </td>
                                        <td>{getLevelLabel(reward.level)}</td>
                                        <td>
                                            <strong>{parseFloat(reward.amount || 0).toFixed(4)} MANGO</strong>
                                        </td>
                                        <td>{getStatusBadge(reward.status)}</td>
                                        <td>
                                            {reward.txHash && reward.chainId ? (
                                                <a
                                                    href={chainConfig.getExplorerUrl(reward.chainId, reward.txHash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="tx-link"
                                                >
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-muted">N/A</span>
                                            )}
                                        </td>
                                        <td>
                                            {isClaimable && claimableForChain && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleClaimRewards(reward.chainId)}
                                                    disabled={loadingClaim || isConfirming || claimingChain === reward.chainId}
                                                >
                                                    {loadingClaim && claimingChain === reward.chainId ? (
                                                        <>
                                                            <Spinner size="sm" className="me-1" />
                                                            Claiming...
                                                        </>
                                                    ) : (
                                                        'Claim'
                                                    )}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}

                {/* Claim Transaction Status */}
                {txHash && claimingChain && (
                    <Alert variant="info" className="mt-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>Claim Transaction:</strong>{' '}
                                <a
                                    href={chainConfig.getExplorerUrl(claimingChain, txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                                </a>
                            </div>
                            {isConfirming && (
                                <Spinner size="sm" animation="border" />
                            )}
                        </div>
                    </Alert>
                )}
            </Card.Body>

            {/* Batch Claim Modal */}
            <Modal show={showClaimModal} onHide={() => setShowClaimModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Batch Claim Rewards</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Claim rewards on the following chains:</p>
                    <ul>
                        {selectedChains.map(chainId => {
                            const chain = claimableRewards[chainId];
                            return (
                                <li key={chainId}>
                                    {getChainName(chainId)}: {chain?.totalAmount.toFixed(4) || '0'} MANGO
                                </li>
                            );
                        })}
                    </ul>
                    <Alert variant="warning">
                        This will execute multiple transactions. Make sure you have enough gas on each chain.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowClaimModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleBatchClaim}
                        disabled={loadingClaim}
                    >
                        {loadingClaim ? (
                            <>
                                <Spinner size="sm" className="me-1" />
                                Claiming...
                            </>
                        ) : (
                            'Claim All'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
};

export default RewardDashboard;


