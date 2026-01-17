/**
 * RewardDashboard Component
 * 
 * Displays total rewards earned, rewards by chain, rewards by level,
 * reward history, pending rewards, and claimable rewards.
 */

import React, { useState, useMemo } from 'react';
import { Card, Table, Form, Badge, Alert } from 'react-bootstrap';
import { CashCoin, Trophy, Clock, CheckCircle } from 'react-bootstrap-icons';
import { useAccount } from 'wagmi';
import chainConfig from '../services/chainConfig';
import ChainStatusBadge from './ChainStatusBadge';
import './css/RewardDashboard.css';

// Mock data - in production, this would come from API
const RewardDashboard = ({ rewards = [], className = '' }) => {
    const { address } = useAccount();
    const [filterChain, setFilterChain] = useState('all');
    const [filterLevel, setFilterLevel] = useState('all');

    const filteredRewards = useMemo(() => {
        let filtered = [...rewards];

        if (filterChain !== 'all') {
            filtered = filtered.filter(r => r.chainId === parseInt(filterChain));
        }

        if (filterLevel !== 'all') {
            filtered = filtered.filter(r => r.level === parseInt(filterLevel));
        }

        return filtered;
    }, [rewards, filterChain, filterLevel]);

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
            failed: { bg: 'danger', label: 'Failed' },
        };
        const config = badges[status] || { bg: 'secondary', label: status };
        return <Badge bg={config.bg}>{config.label}</Badge>;
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

    return (
        <Card className={`reward-dashboard ${className}`}>
            <Card.Header>
                <h5 className="mb-0">
                    <Trophy className="me-2" />
                    Reward Dashboard
                </h5>
            </Card.Header>
            <Card.Body>
                {/* Summary Cards */}
                <div className="summary-cards mb-4">
                    <div className="summary-card total">
                        <CashCoin size={24} className="mb-2" />
                        <div className="summary-label">Total Rewards</div>
                        <div className="summary-value">{totalRewards.toFixed(4)} MANGO</div>
                    </div>
                    <div className="summary-card pending">
                        <Clock size={24} className="mb-2" />
                        <div className="summary-label">Pending</div>
                        <div className="summary-value">{pendingRewards}</div>
                    </div>
                    <div className="summary-card completed">
                        <CheckCircle size={24} className="mb-2" />
                        <div className="summary-label">Completed</div>
                        <div className="summary-value">
                            {filteredRewards.filter(r => r.status === 'completed').length}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters mb-3">
                    <div className="row g-2">
                        <div className="col-md-6">
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
                        <div className="col-md-6">
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
                    </div>
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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRewards.map((reward, index) => (
                                <tr key={reward.id || index}>
                                    <td>
                                        {reward.distributedAt
                                            ? new Date(reward.distributedAt).toLocaleString()
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
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};

export default RewardDashboard;


