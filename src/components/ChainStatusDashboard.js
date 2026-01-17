/**
 * ChainStatusDashboard Component
 * 
 * Displays overview of all supported chains with their status,
 * last sync time, block height, and other chain information.
 */

import React, { useMemo } from 'react';
import { Card, Table, Badge, Spinner } from 'react-bootstrap';
import { CheckCircle, ExclamationTriangle, XCircle, Clock } from 'react-bootstrap-icons';
import { useSupportedChains, useChainStatus } from '../hooks/useChainStatus';
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
    const { chains: apiChains, loading, error } = useSupportedChains();
    
    // Merge API chains with ChainConfigService data
    const chains = useMemo(() => {
        const allChains = chainConfig.getAllChains();
        
        if (!apiChains || apiChains.length === 0) {
            return allChains.map(chain => ({
                ...chain,
                status: chain.status || 'active',
                lastSync: null,
                lastBlockNumber: null,
            }));
        }
        
        // Merge API data with chain config
        return allChains.map(chain => {
            const apiChain = apiChains.find(ac => 
                parseInt(ac.chainId) === parseInt(chain.chainId)
            );
            
            return {
                ...chain,
                status: apiChain?.status || chain.status || 'active',
                lastSync: apiChain?.lastSync || null,
                lastBlockNumber: apiChain?.lastBlockNumber || null,
                dexes: chain.dexes || [],
            };
        });
    }, [apiChains]);

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

    return (
        <Card className={`chain-status-dashboard ${className}`}>
            <Card.Header>
                <h5 className="mb-0">Chain Status Dashboard</h5>
            </Card.Header>
            <Card.Body>
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th>Chain</th>
                            <th>Status</th>
                            <th>Last Sync</th>
                            <th>Block Height</th>
                            <th>DEXes</th>
                            <th>Contracts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chains.map((chain) => {
                            const status = chain.status?.toLowerCase() || 'unknown';
                            const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
                            
                            const contractAddresses = {
                                router: chainConfig.getContractAddress(parseInt(chain.chainId), 'router'),
                                referral: chainConfig.getContractAddress(parseInt(chain.chainId), 'referral'),
                                token: chainConfig.getContractAddress(parseInt(chain.chainId), 'token'),
                            };
                            
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
                                        <div className="contract-addresses">
                                            {contractAddresses.router && (
                                                <div className="contract-item">
                                                    <small className="text-muted">Router:</small>
                                                    <code className="contract-address">
                                                        {contractAddresses.router.slice(0, 10)}...
                                                    </code>
                                                </div>
                                            )}
                                            {contractAddresses.referral && (
                                                <div className="contract-item">
                                                    <small className="text-muted">Referral:</small>
                                                    <code className="contract-address">
                                                        {contractAddresses.referral.slice(0, 10)}...
                                                    </code>
                                                </div>
                                            )}
                                            {contractAddresses.token && (
                                                <div className="contract-item">
                                                    <small className="text-muted">Token:</small>
                                                    <code className="contract-address">
                                                        {contractAddresses.token.slice(0, 10)}...
                                                    </code>
                                                </div>
                                            )}
                                            {!contractAddresses.router && !contractAddresses.referral && !contractAddresses.token && (
                                                <span className="text-muted">Not configured</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default ChainStatusDashboard;


