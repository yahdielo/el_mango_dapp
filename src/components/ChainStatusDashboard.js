/**
 * ChainStatusDashboard Component
 * 
 * Displays overview of all supported chains with their status,
 * last sync time, block height, and other chain information.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Card, Table, Badge, Spinner, Button, Form, Toast, ToastContainer, Modal } from 'react-bootstrap';
import { CheckCircle, ExclamationTriangle, XCircle, Clock, ArrowClockwise, Bell, Activity, TrendingUp } from 'react-bootstrap-icons';
import { useSupportedChains, useChainStatus } from '../hooks/useChainStatus';
import { chainApi } from '../services/mangoApi';
import chainStatusWebSocket from '../services/chainStatusWebSocket';
import chainConfig from '../services/chainConfig';
import ChainStatusBadge from './ChainStatusBadge';
import './css/ChainStatusDashboard.css';

const STATUS_CONFIG = {
    operational: {
        variant: 'success',
        icon: <CheckCircle size={16} />,
        label: 'Operational',
    },
    degraded: {
        variant: 'warning',
        icon: <ExclamationTriangle size={16} />,
        label: 'Degraded',
    },
    offline: {
        variant: 'danger',
        icon: <XCircle size={16} />,
        label: 'Offline',
    },
    unknown: {
        variant: 'secondary',
        icon: <Clock size={16} />,
        label: 'Unknown',
    },
};

const ChainStatusDashboard = ({ className = '' }) => {
    const { chains: apiChains, loading, error, refetch } = useSupportedChains();
    const [chains, setChains] = useState([]);
    const [chainHealthMetrics, setChainHealthMetrics] = useState({});
    const [chainStatusHistory, setChainStatusHistory] = useState({});
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30); // 30 seconds
    const [showNotification, setShowNotification] = useState(false);
    const [notificationData, setNotificationData] = useState(null);
    const [selectedChain, setSelectedChain] = useState(null);
    const [showHealthModal, setShowHealthModal] = useState(false);
    const refreshIntervalRef = useRef(null);
    const wsUnsubscribeRef = useRef(null);
    
    // Merge API chains with ChainConfigService data
    useEffect(() => {
        const allChains = chainConfig.getAllChains();
        
        if (!apiChains || apiChains.length === 0) {
            setChains(allChains.map(chain => ({
                ...chain,
                status: chain.status || 'active',
                lastSync: null,
                lastBlockNumber: null,
                responseTime: null,
                errorRate: null,
                uptime: null,
            })));
            return;
        }
        
        // Merge API data with chain config
        const mergedChains = allChains.map(chain => {
            const apiChain = apiChains.find(ac => 
                parseInt(ac.chainId) === parseInt(chain.chainId)
            );
            
            return {
                ...chain,
                status: apiChain?.status || chain.status || 'active',
                lastSync: apiChain?.lastSync || null,
                lastBlockNumber: apiChain?.lastBlockNumber || null,
                dexes: chain.dexes || [],
                responseTime: apiChain?.responseTime || null,
                errorRate: apiChain?.errorRate || null,
                uptime: apiChain?.uptime || null,
            };
        });
        
        setChains(mergedChains);
    }, [apiChains]);

    // Fetch health metrics for all chains
    const fetchHealthMetrics = useCallback(async () => {
        const metrics = {};
        const history = {};
        
        for (const chain of chains) {
            const chainId = parseInt(chain.chainId);
            try {
                const healthData = await chainApi.getChainHealthMetrics(chainId, {
                    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
                });
                
                if (healthData) {
                    metrics[chainId] = {
                        responseTime: healthData.avgResponseTime || null,
                        errorRate: healthData.errorRate || null,
                        uptime: healthData.uptime || null,
                        totalRequests: healthData.totalRequests || 0,
                        failedRequests: healthData.failedRequests || 0,
                    };
                }

                // Fetch status history
                const statusHistory = await chainApi.getChainStatusHistory(chainId, {
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
                    interval: 'hour',
                });
                
                if (statusHistory) {
                    history[chainId] = statusHistory;
                }
            } catch (error) {
                console.warn(`Failed to fetch health metrics for chain ${chainId}:`, error);
            }
        }
        
        setChainHealthMetrics(metrics);
        setChainStatusHistory(history);
    }, [chains]);

    // Setup WebSocket connection
    useEffect(() => {
        chainStatusWebSocket.connect();

        // Subscribe to chain status updates
        const unsubscribeStatus = chainStatusWebSocket.subscribe('chain_status_update', (data) => {
            console.log('Chain status update:', data);
            if (data.chainId) {
                setChains(prevChains => prevChains.map(chain => {
                    if (parseInt(chain.chainId) === parseInt(data.chainId)) {
                        const oldStatus = chain.status;
                        const newStatus = data.status || chain.status;
                        
                        // Show notification if status changed
                        if (oldStatus !== newStatus) {
                            setNotificationData({
                                type: 'status_change',
                                message: `${chain.chainName || `Chain ${data.chainId}`} status changed: ${oldStatus} → ${newStatus}`,
                                chainId: data.chainId,
                                oldStatus,
                                newStatus,
                            });
                            setShowNotification(true);
                        }
                        
                        return {
                            ...chain,
                            status: newStatus,
                            lastSync: data.lastSync || chain.lastSync,
                            lastBlockNumber: data.lastBlockNumber || chain.lastBlockNumber,
                        };
                    }
                    return chain;
                }));
            }
        });

        const unsubscribeHealth = chainStatusWebSocket.subscribe('chain_health_update', (data) => {
            console.log('Chain health update:', data);
            if (data.chainId) {
                setChainHealthMetrics(prev => ({
                    ...prev,
                    [data.chainId]: {
                        ...prev[data.chainId],
                        responseTime: data.responseTime,
                        errorRate: data.errorRate,
                        uptime: data.uptime,
                    },
                }));
            }
        });

        const unsubscribeMetrics = chainStatusWebSocket.subscribe('chain_metrics_update', (data) => {
            console.log('Chain metrics update:', data);
            if (data.chainId) {
                setChainHealthMetrics(prev => ({
                    ...prev,
                    [data.chainId]: {
                        ...prev[data.chainId],
                        ...data.metrics,
                    },
                }));
            }
        });

        wsUnsubscribeRef.current = () => {
            unsubscribeStatus();
            unsubscribeHealth();
            unsubscribeMetrics();
        };

        return () => {
            if (wsUnsubscribeRef.current) {
                wsUnsubscribeRef.current();
            }
            chainStatusWebSocket.disconnect();
        };
    }, []);

    // Setup auto-refresh
    useEffect(() => {
        if (!autoRefresh) {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            return;
        }

        // Initial fetch
        refetch();
        fetchHealthMetrics();

        // Setup interval
        refreshIntervalRef.current = setInterval(() => {
            refetch();
            fetchHealthMetrics();
        }, refreshInterval * 1000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefresh, refreshInterval, refetch, fetchHealthMetrics]);

    // Initial health metrics fetch
    useEffect(() => {
        if (chains.length > 0) {
            fetchHealthMetrics();
        }
    }, [chains.length, fetchHealthMetrics]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch {
            return dateString;
        }
    };

    const formatBlockNumber = (blockNumber) => {
        if (!blockNumber) return 'N/A';
        return blockNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    if (loading) {
        return (
            <Card className={`chain-status-dashboard ${className}`}>
                <Card.Body className="text-center">
                    <Spinner animation="border" />
                    <p className="mt-2">Loading chain status...</p>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={`chain-status-dashboard ${className}`}>
                <Card.Body>
                    <div className="error-message">Error loading chain status: {error}</div>
                </Card.Body>
            </Card>
        );
    }

    if (!chains || chains.length === 0) {
        return (
            <Card className={`chain-status-dashboard ${className}`}>
                <Card.Body>
                    <div className="no-chains">No chains available</div>
                </Card.Body>
            </Card>
        );
    }

    const handleViewHealthMetrics = (chain) => {
        setSelectedChain(chain);
        setShowHealthModal(true);
    };

    const getHealthMetrics = (chainId) => {
        return chainHealthMetrics[parseInt(chainId)] || null;
    };

    const getStatusHistory = (chainId) => {
        return chainStatusHistory[parseInt(chainId)] || [];
    };

    const formatUptime = (uptime) => {
        if (uptime === null || uptime === undefined) return 'N/A';
        return `${(uptime * 100).toFixed(2)}%`;
    };

    const formatResponseTime = (responseTime) => {
        if (responseTime === null || responseTime === undefined) return 'N/A';
        if (responseTime < 1000) return `${responseTime.toFixed(0)}ms`;
        return `${(responseTime / 1000).toFixed(2)}s`;
    };

    const formatErrorRate = (errorRate) => {
        if (errorRate === null || errorRate === undefined) return 'N/A';
        return `${(errorRate * 100).toFixed(2)}%`;
    };

    return (
        <Card className={`chain-status-dashboard ${className}`}>
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 className="mb-0">Chain Status Dashboard</h5>
                    <div className="d-flex gap-2 align-items-center">
                        <Form.Check
                            type="switch"
                            id="auto-refresh-switch"
                            label="Auto-refresh"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="me-2"
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
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                                refetch();
                                fetchHealthMetrics();
                            }}
                            disabled={loading}
                        >
                            <ArrowClockwise size={14} className="me-1" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                {/* WebSocket Status */}
                <div className="websocket-status mb-3">
                    <small className="text-muted">
                        {chainStatusWebSocket.isConnected() ? (
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

                <Table responsive hover>
                    <thead>
                        <tr>
                            <th>Chain</th>
                            <th>Status</th>
                            <th>Health Metrics</th>
                            <th>Last Sync</th>
                            <th>Block Height</th>
                            <th>DEXes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chains.map((chain) => {
                            const status = chain.status?.toLowerCase() || 'unknown';
                            const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
                            const healthMetrics = getHealthMetrics(chain.chainId);
                            
                            return (
                                <tr key={chain.chainId}>
                                    <td>
                                        <strong>{chain.chainName || chain.name}</strong>
                                        <br />
                                        <small className="text-muted">
                                            ID: {chain.chainId} | Type: {chain.type || 'EVM'}
                                        </small>
                                    </td>
                                    <td>
                                        <ChainStatusBadge chainId={parseInt(chain.chainId)} />
                                    </td>
                                    <td>
                                        {healthMetrics ? (
                                            <div className="health-metrics">
                                                <div className="metric-item">
                                                    <Activity size={12} className="me-1" />
                                                    <small>Response: {formatResponseTime(healthMetrics.responseTime)}</small>
                                                </div>
                                                <div className="metric-item">
                                                    <TrendingUp size={12} className="me-1" />
                                                    <small>Uptime: {formatUptime(healthMetrics.uptime)}</small>
                                                </div>
                                                <div className="metric-item">
                                                    <ExclamationTriangle size={12} className="me-1" />
                                                    <small>Error Rate: {formatErrorRate(healthMetrics.errorRate)}</small>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted">Loading...</span>
                                        )}
                                    </td>
                                    <td>
                                        {chain.lastSync ? (
                                            <span className="last-sync">
                                                {formatDate(chain.lastSync)}
                                            </span>
                                        ) : (
                                            <span className="text-muted">N/A</span>
                                        )}
                                    </td>
                                    <td>
                                        {chain.lastBlockNumber ? (
                                            <code className="block-number">
                                                {formatBlockNumber(chain.lastBlockNumber)}
                                            </code>
                                        ) : (
                                            <span className="text-muted">N/A</span>
                                        )}
                                    </td>
                                    <td>
                                        {chain.dexes && chain.dexes.length > 0 ? (
                                            <div className="dex-badges">
                                                {chain.dexes.map((dex, index) => (
                                                    <Badge key={index} bg="info" className="me-1 mb-1">
                                                        {dex}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted">N/A</span>
                                        )}
                                    </td>
                                    <td>
                                        <Button
                                            variant="outline-info"
                                            size="sm"
                                            onClick={() => handleViewHealthMetrics(chain)}
                                        >
                                            View Details
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Card.Body>

            {/* Health Metrics Modal */}
            <Modal show={showHealthModal} onHide={() => setShowHealthModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Health Metrics - {selectedChain?.chainName || `Chain ${selectedChain?.chainId}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedChain && (() => {
                        const healthMetrics = getHealthMetrics(selectedChain.chainId);
                        const statusHistory = getStatusHistory(selectedChain.chainId);
                        
                        return (
                            <div>
                                <div className="health-metrics-detail mb-4">
                                    <h6>Current Metrics (Last 24 Hours)</h6>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <div className="metric-card">
                                                <div className="metric-label">Response Time</div>
                                                <div className="metric-value">
                                                    {formatResponseTime(healthMetrics?.responseTime)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="metric-card">
                                                <div className="metric-label">Uptime</div>
                                                <div className="metric-value">
                                                    {formatUptime(healthMetrics?.uptime)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="metric-card">
                                                <div className="metric-label">Error Rate</div>
                                                <div className="metric-value">
                                                    {formatErrorRate(healthMetrics?.errorRate)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {healthMetrics && (
                                        <div className="row g-3 mt-2">
                                            <div className="col-md-6">
                                                <small className="text-muted">
                                                    Total Requests: {healthMetrics.totalRequests || 0}
                                                </small>
                                            </div>
                                            <div className="col-md-6">
                                                <small className="text-muted">
                                                    Failed Requests: {healthMetrics.failedRequests || 0}
                                                </small>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {statusHistory.length > 0 && (
                                    <div className="status-history">
                                        <h6>Status History (Last 7 Days)</h6>
                                        <Table responsive size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Status</th>
                                                    <th>Response Time</th>
                                                    <th>Error Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {statusHistory.slice(0, 24).map((entry, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            {new Date(entry.timestamp).toLocaleString()}
                                                        </td>
                                                        <td>
                                                            <Badge bg={
                                                                entry.status === 'operational' ? 'success' :
                                                                entry.status === 'degraded' ? 'warning' :
                                                                entry.status === 'offline' ? 'danger' : 'secondary'
                                                            }>
                                                                {entry.status}
                                                            </Badge>
                                                        </td>
                                                        <td>{formatResponseTime(entry.responseTime)}</td>
                                                        <td>{formatErrorRate(entry.errorRate)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowHealthModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Notification Toast */}
            <ToastContainer position="top-end" className="p-3">
                <Toast
                    show={showNotification}
                    onClose={() => setShowNotification(false)}
                    delay={5000}
                    autohide
                    bg={notificationData?.newStatus === 'offline' ? 'danger' : 
                        notificationData?.newStatus === 'degraded' ? 'warning' : 'info'}
                >
                    <Toast.Header>
                        <Bell size={16} className="me-2" />
                        <strong className="me-auto">Chain Status Update</strong>
                    </Toast.Header>
                    <Toast.Body>
                        {notificationData?.message}
                    </Toast.Body>
                </Toast>
            </ToastContainer>
        </Card>
    );
};

export default ChainStatusDashboard;


