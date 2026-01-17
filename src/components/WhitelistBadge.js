/**
 * WhitelistBadge Component
 * 
 * Displays a badge indicating the user's whitelist tier (None/Standard/VIP/Premium)
 * with color-coding and tooltip showing tier benefits.
 */

import React from 'react';
import { Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Star, StarFill, Award } from 'react-bootstrap-icons';
import { useWhitelist } from '../hooks/useWhitelist';
import { useAccount, useChainId } from 'wagmi';
import { supportsWhitelist, getFeatureMessage, FEATURE_FLAGS } from '../utils/featureFlags';
import chainConfig from '../services/chainConfig';
import './css/WhitelistBadge.css';

const TIER_CONFIG = {
    None: {
        name: 'None',
        bg: 'secondary',
        icon: null,
        benefits: 'Standard fees apply',
    },
    Standard: {
        name: 'Standard',
        bg: 'info',
        icon: <Star size={14} />,
        benefits: 'Standard tier benefits',
    },
    VIP: {
        name: 'VIP',
        bg: 'warning',
        icon: <StarFill size={14} />,
        benefits: 'VIP benefits: 50% fee discount on swaps',
    },
    Premium: {
        name: 'Premium',
        bg: 'success',
        icon: <Award size={14} />,
        benefits: 'Premium benefits: 100% fee exemption on swaps and token transfers',
    },
};

const WhitelistBadge = ({ 
    showTooltip = true, 
    showIcon = true, 
    size = 'md',
    className = '',
    chainId = null // Optional chainId prop, otherwise uses current chain
}) => {
    const { address } = useAccount();
    const currentChainId = useChainId();
    const effectiveChainId = chainId || currentChainId;
    const { whitelistStatus, loading, error } = useWhitelist();

    // Check if whitelist is supported for this chain
    const isWhitelistSupported = effectiveChainId ? supportsWhitelist(effectiveChainId) : false;

    // Hide badge if whitelist is not supported
    if (effectiveChainId && !isWhitelistSupported) {
        return null;
    }

    if (loading || !address) {
        return null;
    }

    if (error || !whitelistStatus) {
        return null;
    }

    const tier = whitelistStatus.tier || 'None';
    const config = TIER_CONFIG[tier] || TIER_CONFIG.None;

    if (tier === 'None') {
        return null; // Don't show badge for None tier
    }

    const badge = (
        <Badge 
            bg={config.bg} 
            className={`whitelist-badge tier-${tier.toLowerCase()} size-${size} ${className}`}
        >
            {showIcon && config.icon && <span className="badge-icon">{config.icon}</span>}
            <span className="badge-text">{config.name}</span>
        </Badge>
    );

    if (showTooltip) {
        return (
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip id={`whitelist-tooltip-${tier}`}>
                        <strong>{config.name} Tier</strong>
                        <br />
                        {config.benefits}
                    </Tooltip>
                }
            >
                {badge}
            </OverlayTrigger>
        );
    }

    return badge;
};

/**
 * WhitelistBenefits Component
 * 
 * Displays detailed whitelist tier benefits and savings calculations
 */
export const WhitelistBenefits = ({ feeAmount = 0, className = '' }) => {
    const { address } = useAccount();
    const { whitelistStatus, loading } = useWhitelist();

    if (loading || !address || !whitelistStatus) {
        return null;
    }

    const tier = whitelistStatus.tier || 'None';
    
    if (tier === 'None' || feeAmount === 0) {
        return null;
    }

    let discount = 0;
    let discountPercentage = 0;
    let finalFee = feeAmount;

    if (tier === 'VIP') {
        discountPercentage = 50;
        discount = feeAmount * 0.5;
        finalFee = feeAmount - discount;
    } else if (tier === 'Premium') {
        discountPercentage = 100;
        discount = feeAmount;
        finalFee = 0;
    }

    if (discount === 0) {
        return null;
    }

    return (
        <div className={`whitelist-benefits ${className}`}>
            <div className="benefits-header">
                <WhitelistBadge showTooltip={false} />
                <span className="benefits-text">Discount Applied</span>
            </div>
            <div className="fee-breakdown">
                <div className="fee-row">
                    <span>Base Fee:</span>
                    <span>{feeAmount.toFixed(4)}</span>
                </div>
                <div className="fee-row discount">
                    <span>Discount ({discountPercentage}%):</span>
                    <span>-{discount.toFixed(4)}</span>
                </div>
                <div className="fee-row final">
                    <span><strong>Final Fee:</strong></span>
                    <span><strong>{finalFee.toFixed(4)}</strong></span>
                </div>
            </div>
        </div>
    );
};

export default WhitelistBadge;

