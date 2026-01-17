/**
 * ReferralHistory Component
 * 
 * Displays referral chain history, referrals made by user,
 * earnings from referrals, and cross-chain referral status.
 */

import React, { useState, useMemo } from 'react';
import { Card, Table, Form, Badge } from 'react-bootstrap';
import { People, CashCoin, Link45deg } from 'react-bootstrap-icons';
import { useReferralChain } from '../hooks/useReferralChain';
import { useAccount } from 'wagmi';
import chainConfig from '../services/chainConfig';
import ChainStatusBadge from './ChainStatusBadge';
import './css/ReferralHistory.css';

const ReferralHistory = ({ className = '' }) => {
    const { address } = useAccount();
    const { referral, loading } = useReferralChain(true); // Get all chains

    const [filterChain, setFilterChain] = useState('all');

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
                </div>

                {/* Referrals Table */}
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th>Chain</th>
                            <th>Referrer</th>
                            <th>Referred On</th>
                            <th>Transaction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReferrals.map((ref, index) => (
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
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default ReferralHistory;


