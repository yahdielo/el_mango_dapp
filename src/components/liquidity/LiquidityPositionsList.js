import React, { useState, useEffect } from 'react';
import '../css/LiquidityMobile.css';

const LiquidityPositionsList = ({ address, isConnected, chainId }) => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isConnected && address) {
            // TODO: Fetch actual LP positions from API
            setLoading(true);
            setTimeout(() => {
                // Mock data
                setPositions([
                    {
                        id: 1,
                        tokenPair: 'BNB/MANGO',
                        lpAmount: '50.25',
                        usdValue: '1250.50',
                        sharePercent: '2.5',
                        apr: '12.5',
                        unclaimedFees: '5.25'
                    },
                    {
                        id: 2,
                        tokenPair: 'ETH/USDC',
                        lpAmount: '100.00',
                        usdValue: '2500.00',
                        sharePercent: '5.0',
                        apr: '15.2',
                        unclaimedFees: '10.50'
                    }
                ]);
                setLoading(false);
            }, 1000);
        } else {
            setPositions([]);
            setLoading(false);
        }
    }, [isConnected, address, chainId]);

    if (!isConnected) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-empty-state">
                    <p>Connect your wallet to view your liquidity positions</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-loading">Loading positions...</div>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-empty-state">
                    <p>No liquidity positions found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="liquidity-positions-list">
            {positions.map((position) => (
                <div key={position.id} className="liquidity-position-card">
                    <div className="liquidity-position-header">
                        <div className="liquidity-position-pair">{position.tokenPair}</div>
                        <div className="liquidity-position-value">${position.usdValue}</div>
                    </div>
                    
                    <div className="liquidity-position-details">
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">LP Tokens:</span>
                            <span className="liquidity-position-value">{position.lpAmount}</span>
                        </div>
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">Share:</span>
                            <span className="liquidity-position-value">{position.sharePercent}%</span>
                        </div>
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">APR:</span>
                            <span className="liquidity-position-value">{position.apr}%</span>
                        </div>
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">Unclaimed Fees:</span>
                            <span className="liquidity-position-value">{position.unclaimedFees}</span>
                        </div>
                    </div>

                    <div className="liquidity-position-actions">
                        <button className="liquidity-position-button liquidity-position-button-secondary">
                            Claim Fees
                        </button>
                        <button className="liquidity-position-button liquidity-position-button-primary">
                            Manage
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LiquidityPositionsList;

