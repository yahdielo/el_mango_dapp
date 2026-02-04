/**
 * ReferralHistory Component
 * 
 * Displays referral chain history, referrals made by user,
 * earnings from referrals, and cross-chain referral status.
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, Table, Form, Badge, Button, Alert, Toast, ToastContainer } from 'react-bootstrap';
import { People, CashCoin, Link45deg, ArrowClockwise, Bell, Trophy } from 'react-bootstrap-icons';
import { useReferralChain } from '../hooks/useReferralChain';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import chainConfig from '../services/chainConfig';
import { referralApi } from '../services/mangoApi';
import referralWebSocket from '../services/referralWebSocket';
import ChainStatusBadge from './ChainStatusBadge';
import './css/ReferralHistory.css';

const ReferralHistory = ({ className = '' }) => {
    const { address } = useAccount();
    const navigate = useNavigate();
    const { referral, loading, refetch } = useReferralChain(true); // Get all chains

    const [filterChain, setFilterChain] = useState('all');
    const [referralRewards, setReferralRewards] = useState({});
    const [totalRewards, setTotalRewards] = useState(0);
    const [loadingRewards, setLoadingRewards] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30); // 30 seconds
    const [showNotification, setShowNotification] = useState(false);
    const [notificationData, setNotificationData] = useState(null);
    const refreshIntervalRef = useRef(null);
    const wsUnsubscribeRef = useRef(null);

    // Fetch referral rewards
    const fetchReferralRewards = useCallback(async () => {
        if (!address) {
            setReferralRewards({});
            setTotalRewards(0);
            return;
        }

        setLoadingRewards(true);
        try {
            const rewardsData = await referralApi.getReferralRewards(address, null);
            
            // Calculate rewards per referral
            const rewardsByReferrer = {};
            let total = 0;

            if (rewardsData && rewardsData.rewards) {
                rewardsData.rewards.forEach(reward => {
                    const referrerKey = `${reward.referrerAddress}-${reward.chainId}`;
                    if (!rewardsByReferrer[referrerKey]) {
                        rewardsByReferrer[referrerKey] = {
                            referrerAddress: reward.referrerAddress,
                            chainId: reward.chainId,
                            totalRewards: 0,
                            rewards: [],
                        };
                    }
                    const amount = parseFloat(reward.amount || 0);
                    rewardsByReferrer[referrerKey].totalRewards += amount;
                    rewardsByReferrer[referrerKey].rewards.push(reward);
                    total += amount;
                });
            }

            setReferralRewards(rewardsByReferrer);
            setTotalRewards(total);
        } catch (error) {
            console.error('Error fetching referral rewards:', error);
            // Don't show error to user, just log it
        } finally {
            setLoadingRewards(false);
        }
    }, [address]);

    // Fetch rewards for a specific referral
    const fetchRewardsForReferral = useCallback(async (referrerAddress, chainId) => {
        if (!address || !referrerAddress) return null;

        try {
            const rewardsData = await referralApi.getReferralRewardsByReferrer(
                address,
                referrerAddress,
                chainId
            );
            return rewardsData;
        } catch (error) {
            console.error('Error fetching rewards for referral:', error);
            return null;
        }
    }, [address]);

    // Setup WebSocket connection
    useEffect(() => {
        if (!address) {
            referralWebSocket.disconnect();
            return;
        }

        // Connect WebSocket
        referralWebSocket.connect(address);

        // Subscribe to events
        const unsubscribeNewReferral = referralWebSocket.subscribe('new_referral', (data) => {
            console.log('New referral received:', data);
            setNotificationData({
                type: 'new_referral',
                message: `New referral from ${formatAddress(data.referrerAddress)}`,
                data,
            });
            setShowNotification(true);
            // Refresh referral data
            refetch();
        });

        const unsubscribeRewardEarned = referralWebSocket.subscribe('reward_earned', (data) => {
            console.log('Reward earned:', data);
            setNotificationData({
                type: 'reward_earned',
                message: `Earned ${parseFloat(data.amount || 0).toFixed(4)} MANGO from referral`,
                data,
            });
            setShowNotification(true);
            // Refresh rewards
            fetchReferralRewards();
        });

        const unsubscribeUpdate = referralWebSocket.subscribe('referral_update', (data) => {
            console.log('Referral update:', data);
            // Refresh referral data
            refetch();
            fetchReferralRewards();
        });

        // Store unsubscribe functions
        wsUnsubscribeRef.current = () => {
            unsubscribeNewReferral();
            unsubscribeRewardEarned();
            unsubscribeUpdate();
        };

        // Cleanup on unmount
        return () => {
            if (wsUnsubscribeRef.current) {
                wsUnsubscribeRef.current();
            }
            referralWebSocket.disconnect();
        };
    }, [address, refetch, fetchReferralRewards]);

    // Setup auto-refresh
    useEffect(() => {
        if (!autoRefresh || !address) {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            return;
        }

        // Initial fetch
        fetchReferralRewards();

        // Setup interval
        refreshIntervalRef.current = setInterval(() => {
            refetch();
            fetchReferralRewards();
        }, refreshInterval * 1000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefresh, refreshInterval, address, refetch, fetchReferralRewards]);

    // Initial rewards fetch
    useEffect(() => {
        if (address) {
            fetchReferralRewards();
        }
    }, [address, fetchReferralRewards]);

    const filteredReferrals = useMemo(() => {
        if (!referral || !referral.referrals) return [];

        let filtered = referral.referrals;

        if (filterChain !== 'all') {
            filtered = filtered.filter(ref => ref.chainId === parseInt(filterChain));
        }

        return filtered;
    }, [referral, filterChain]);

    const formatAddress = (addr) => {
        if (!addr) return 'N/A';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const getChainName = (chainId) => {
        const chain = chainConfig.getChain(chainId);
        return chain?.chainName || `Chain ${chainId}`;
    };

    // Get all chains for filter dropdown
    const allChains = useMemo(() => {
        return chainConfig.getAllChains();
    }, []);

    if (loading) {
        return (
            <Card className={`referral-history ${className}`}>
                <Card.Body className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    if (!referral || !referral.referrals || referral.referrals.length === 0) {
        return (
            <Card className={`referral-history ${className}`}>
                <Card.Header>
                    <h5 className="mb-0">
                        <People className="me-2" />
                        Referral History
                    </h5>
                </Card.Header>
                <Card.Body>
                    <div className="text-center py-4 text-muted">
                        <People size={48} className="mb-3" />
                        <p>No referral history found</p>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className={`referral-history ${className}`}>
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <People className="me-2" />
                        Referral History
                    </h5>
                    {referral.primaryReferrer && (
                        <Badge bg="info">
                            Primary Referrer: {formatAddress(referral.primaryReferrer)}
                        </Badge>
                    )}
                </div>
            </Card.Header>
            <Card.Body>
                {/* Filters */}
                <div className="filters mb-3">
                    <Form.Select
                        value={filterChain}
                        onChange={(e) => setFilterChain(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    >
                        <option value="all">All Chains</option>
                        {allChains.map((chain) => (
                            <option key={chain.chainId} value={chain.chainId}>
                                {chain.chainName}
                            </option>
                        ))}
                    </Form.Select>
                </div>

                {/* Controls */}
                <div className="referral-controls mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <Form.Check
                            type="switch"
                            id="auto-refresh-switch"
                            label="Auto-refresh"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        {autoRefresh && (
                            <Form.Select
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                                style={{ width: 'auto' }}
                                size="sm"
                            >
                                <option value={10}>10s</option>
                                <option value={30}>30s</option>
                                <option value={60}>1m</option>
                                <option value={300}>5m</option>
                            </Form.Select>
                        )}
                    </div>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                            refetch();
                            fetchReferralRewards();
                        }}
                        disabled={loading || loadingRewards}
                    >
                        <ArrowClockwise size={14} className="me-1" />
                        Refresh
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="summary-stats mb-3">
                    <div className="stat-item">
                        <CashCoin size={20} className="me-2" />
                        <div>
                            <div className="stat-label">Total Referrals</div>
                            <div className="stat-value">{referral.referrals?.length || 0}</div>
                        </div>
                    </div>
                    <div className="stat-item">
                        <Link45deg size={20} className="me-2" />
                        <div>
                            <div className="stat-label">Chains Active</div>
                            <div className="stat-value">
                                {new Set(referral.referrals?.map(r => r.chainId)).size || 0}
                            </div>
                        </div>
                    </div>
                    <div className="stat-item">
                        <Trophy size={20} className="me-2" />
                        <div>
                            <div className="stat-label">Total Rewards</div>
                            <div className="stat-value">
                                {loadingRewards ? (
                                    <span className="spinner-border spinner-border-sm" role="status" />
                                ) : (
                                    `${totalRewards.toFixed(4)} MANGO`
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rewards Dashboard Link */}
                {totalRewards > 0 && (
                    <Alert variant="info" className="mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <Trophy size={16} className="me-2" />
                                <strong>Total Rewards Earned:</strong> {totalRewards.toFixed(4)} MANGO
                            </div>
                            <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => navigate('/rewards')}
                            >
                                View Rewards Dashboard
                            </Button>
                        </div>
                    </Alert>
                )}

                {/* Referrals Table */}
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th>Chain</th>
                            <th>Referrer</th>
                            <th>Referred On</th>
                            <th>Rewards Earned</th>
                            <th>Transaction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReferrals.map((ref, index) => {
                            const referrerKey = `${ref.referrer}-${ref.chainId}`;
                            const rewards = referralRewards[referrerKey];
                            const rewardsAmount = rewards?.totalRewards || 0;

                            return (
                                <tr key={index}>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <Badge bg="primary">{getChainName(ref.chainId)}</Badge>
                                            <ChainStatusBadge chainId={ref.chainId} />
                                        </div>
                                    </td>
                                    <td>
                                        <code className="address">{formatAddress(ref.referrer)}</code>
                                    </td>
                                    <td>
                                        {ref.createdAt
                                            ? new Date(ref.createdAt).toLocaleDateString()
                                            : 'N/A'}
                                    </td>
                                    <td>
                                        {loadingRewards ? (
                                            <span className="spinner-border spinner-border-sm" role="status" />
                                        ) : rewardsAmount > 0 ? (
                                            <Badge bg="success">
                                                <Trophy size={12} className="me-1" />
                                                {rewardsAmount.toFixed(4)} MANGO
                                            </Badge>
                                        ) : (
                                            <span className="text-muted">0 MANGO</span>
                                        )}
                                    </td>
                                    <td>
                                        {ref.txHash && ref.chainId ? (
                                            <a
                                                href={chainConfig.getExplorerUrl(ref.chainId, ref.txHash)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="tx-link"
                                            >
                                                View <Link45deg size={12} />
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

                {/* WebSocket Status */}
                <div className="websocket-status mt-3">
                    <small className="text-muted">
                        {referralWebSocket.isConnected() ? (
                            <span className="text-success">
                                <Bell size={12} className="me-1" />
                                Real-time updates active
                            </span>
                        ) : (
                            <span className="text-warning">
                                Real-time updates unavailable (polling mode)
                            </span>
                        )}
                    </small>
                </div>
            </Card.Body>

            {/* Notification Toast */}
            <ToastContainer position="top-end" className="p-3">
                <Toast
                    show={showNotification}
                    onClose={() => setShowNotification(false)}
                    delay={5000}
                    autohide
                    bg={notificationData?.type === 'reward_earned' ? 'success' : 'info'}
                >
                    <Toast.Header>
                        <Bell size={16} className="me-2" />
                        <strong className="me-auto">
                            {notificationData?.type === 'reward_earned' ? 'Reward Earned' : 'New Referral'}
                        </strong>
                    </Toast.Header>
                    <Toast.Body>
                        {notificationData?.message}
                        {notificationData?.type === 'reward_earned' && notificationData?.data?.txHash && (
                            <div className="mt-2">
                                <a
                                    href={chainConfig.getExplorerUrl(
                                        notificationData.data.chainId,
                                        notificationData.data.txHash
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white"
                                    style={{ textDecoration: 'underline' }}
                                >
                                    View Transaction <Link45deg size={12} />
                                </a>
                            </div>
                        )}
                    </Toast.Body>
                </Toast>
            </ToastContainer>
        </Card>
    );
};

export default ReferralHistory;


