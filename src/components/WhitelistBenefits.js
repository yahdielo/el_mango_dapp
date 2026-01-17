/**
 * WhitelistBenefits Component
 * 
 * Displays tier-based benefits, fee exemptions, tax exemptions, and savings calculations.
 */

import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { CheckCircle, Percent, Shield } from 'react-bootstrap-icons';
import { useWhitelist } from '../hooks/useWhitelist';
import { useAccount } from 'wagmi';
import WhitelistBadge from './WhitelistBadge';
import './css/WhitelistBenefits.css';

const TIER_BENEFITS = {
    None: {
        feeDiscount: '0%',
        taxExemption: false,
        benefits: [
            'Standard swap fees apply (3%)',
            'Standard token taxes apply',
        ],
    },
    Standard: {
        feeDiscount: '0%',
        taxExemption: false,
        benefits: [
            'Standard tier recognition',
            'Priority support',
        ],
    },
    VIP: {
        feeDiscount: '50%',
        taxExemption: false,
        benefits: [
            '50% discount on swap fees',
            'Reduced fees: 1.5% instead of 3%',
            'Priority support',
            'Early access to new features',
        ],
    },
    Premium: {
        feeDiscount: '100%',
        taxExemption: true,
        benefits: [
            '100% fee exemption on swaps',
            '100% tax exemption on token transfers',
            'No swap fees',
            'No buy/sell taxes',
            'Priority support',
            'Exclusive features access',
        ],
    },
};

const WhitelistBenefits = ({ className = '', showBadge = true }) => {
    const { address } = useAccount();
    const { whitelistStatus, loading, error } = useWhitelist();

    if (loading) {
        return (
            <Card className={`whitelist-benefits ${className}`}>
                <Card.Body>
                    <div className="text-center">
                        <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={`whitelist-benefits ${className}`}>
                <Card.Body>
                    <div className="text-danger small">Error loading whitelist status</div>
                </Card.Body>
            </Card>
        );
    }

    if (!address) {
        return (
            <Card className={`whitelist-benefits ${className}`}>
                <Card.Body>
                    <div className="text-muted text-center">Connect your wallet to view benefits</div>
                </Card.Body>
            </Card>
        );
    }

    const tier = whitelistStatus?.tier || 'None';
    const benefits = TIER_BENEFITS[tier] || TIER_BENEFITS.None;

    return (
        <Card className={`whitelist-benefits ${className}`}>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Whitelist Benefits</h5>
                {showBadge && <WhitelistBadge size="sm" />}
            </Card.Header>
            <Card.Body>
                <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                        <Badge bg="primary" className="me-2">
                            <Percent size={14} className="me-1" />
                            Fee Discount
                        </Badge>
                        <strong>{benefits.feeDiscount}</strong>
                    </div>
                    
                    {benefits.taxExemption && (
                        <div className="d-flex align-items-center mb-2">
                            <Badge bg="success" className="me-2">
                                <Shield size={14} className="me-1" />
                                Tax Exemption
                            </Badge>
                            <strong>Active</strong>
                        </div>
                    )}
                </div>

                <ListGroup variant="flush">
                    {benefits.benefits.map((benefit, index) => (
                        <ListGroup.Item key={index} className="px-0">
                            <CheckCircle size={16} className="text-success me-2" />
                            {benefit}
                        </ListGroup.Item>
                    ))}
                </ListGroup>

                {tier !== 'Premium' && (
                    <div className="mt-3 p-2 bg-light rounded">
                        <small className="text-muted">
                            <strong>Upgrade:</strong> Contact the team to upgrade your tier and unlock more benefits.
                        </small>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default WhitelistBenefits;

