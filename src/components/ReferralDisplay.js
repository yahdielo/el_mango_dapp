/**
 * ReferralDisplay Component
 * 
 * Displays referral information including referrer address, chain depth,
 * benefits, and earnings. Provides functionality to copy referrer address
 * and generate referral links.
 */

import React, { useState } from 'react';
import { Card, Button, Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Copy, Check, BoxArrowUpRight, People } from 'react-bootstrap-icons';
import { useReferralChain } from '../hooks/useReferralChain';
import { useAccount, useChainId } from 'wagmi';
import chainConfig from '../services/chainConfig';
import ChainStatusBadge from './ChainStatusBadge';
import './css/ReferralDisplay.css';

const ReferralDisplay = ({ className = '' }) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const { referral, loading, error } = useReferralChain(false);
    const [copied, setCopied] = useState(false);
    const [referralLink] = useState(() => {
        if (!address) return null;
        const baseUrl = window.location.origin;
        return `${baseUrl}?ref=${address}`;
    });

    const handleCopyReferrer = () => {
        if (referral?.referrerAddress) {
            navigator.clipboard.writeText(referral.referrerAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyReferralLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return 'N/A';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (loading) {
        return (
            <Card className={`referral-display ${className}`}>
                <Card.Body>
                    <div className="loading-spinner">Loading referral information...</div>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={`referral-display ${className}`}>
                <Card.Body>
                    <div className="error-message">Error loading referral: {error}</div>
                </Card.Body>
            </Card>
        );
    }

    if (!referral || !referral.referrerAddress) {
        return (
            <Card className={`referral-display ${className}`}>
                <Card.Body>
                    <div className="no-referral">
                        <People size={24} />
                        <h5>No Referrer</h5>
                        <p>You don't have a referrer set. Use a referral link when signing up!</p>
                        {referralLink && (
                            <div className="referral-link-section">
                                <p className="small mb-2">Share your referral link:</p>
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={referralLink} 
                                        readOnly 
                                    />
                                    <Button 
                                        variant="outline-secondary" 
                                        onClick={handleCopyReferralLink}
                                    >
                                        {copied ? <Check /> : <Copy />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className={`referral-display ${className}`}>
            <Card.Header>
                <h5 className="mb-0">
                    <People className="me-2" />
                    Referral Information
                </h5>
            </Card.Header>
            <Card.Body>
                <div className="referral-info">
                    <div className="info-row">
                        <span className="label">Referrer Address:</span>
                        <div className="value-group">
                            <code className="address">{formatAddress(referral.referrerAddress)}</code>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Copy full address</Tooltip>}
                            >
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="copy-btn"
                                    onClick={handleCopyReferrer}
                                >
                                    {copied ? <Check color="green" /> : <Copy />}
                                </Button>
                            </OverlayTrigger>
                            {referral.chainId && referral.referrerAddress && (() => {
                                try {
                                    const chain = chainConfig.getChain(referral.chainId);
                                    const explorerUrl = chain?.blockExplorers?.[0]?.url;
                                    if (explorerUrl) {
                                        return (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                href={`${explorerUrl}/address/${referral.referrerAddress}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <BoxArrowUpRight size={14} />
                                            </Button>
                                        );
                                    }
                                    return null;
                                } catch (error) {
                                    console.error('Error getting explorer URL:', error);
                                    return null;
                                }
                            })()}
                        </div>
                    </div>

                    {referral.chainId && (
                        <div className="info-row">
                            <span className="label">Chain:</span>
                            <div className="d-flex align-items-center gap-2">
                                <Badge bg="primary">
                                    {chainConfig.getChain(referral.chainId)?.chainName || referral.chainName || `Chain ${referral.chainId}`}
                                </Badge>
                                <ChainStatusBadge chainId={referral.chainId} />
                            </div>
                        </div>
                    )}

                    {referral.createdAt && (
                        <div className="info-row">
                            <span className="label">Referred On:</span>
                            <span className="value">{new Date(referral.createdAt).toLocaleDateString()}</span>
                        </div>
                    )}

                    {referral.earnings && referral.earnings > 0 && (
                        <div className="info-row earnings">
                            <span className="label">Total Earnings:</span>
                            <Badge bg="success" className="earnings-badge">
                                {referral.earnings.toFixed(4)} MANGO
                            </Badge>
                        </div>
                    )}

                    <div className="benefits-section">
                        <h6>Referral Benefits</h6>
                        <ul className="benefits-list">
                            <li>Earn rewards when your referrals make swaps</li>
                            <li>Multi-level reward structure (up to 5 levels)</li>
                            <li>Rewards distributed automatically in MANGO tokens</li>
                        </ul>
                    </div>

                    {referralLink && (
                        <div className="referral-link-section mt-3">
                            <h6>Your Referral Link</h6>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={referralLink} 
                                    readOnly 
                                />
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={handleCopyReferralLink}
                                >
                                    {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
};

export default ReferralDisplay;


