import React, { useState, useEffect } from 'react';
import '../css/LiquidityMobile.css';

const LiquidityPositionsList = ({ address, isConnected, chainId }) => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleClaimFees = async (positionId) => {
        try {
            const position = positions.find(p => p.id === positionId);
            if (!position || parseFloat(position.unclaimedFees) <= 0) {
                return;
            }

            // TODO: Implement actual fee claiming
            // This would involve calling claimFees on the pool contract
            console.log('Claiming fees for position:', positionId);
            
            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 1500));
            alert(`Successfully claimed ${position.unclaimedFees} in fees!`);
            
            // Refresh positions
            // In production, refetch from contracts
        } catch (error) {
            console.error('Error claiming fees:', error);
            alert('Failed to claim fees: ' + error.message);
        }
    };

    const handleManagePosition = (positionId) => {
        // Navigate to remove liquidity with pre-filled data
        // In production, this would navigate to remove liquidity tab with position data
        console.log('Managing position:', positionId);
        alert('Navigate to remove liquidity with this position');
    };

    useEffect(() => {
        const fetchPositions = async () => {
            if (!isConnected || !address) {
                setPositions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // TODO: Fetch actual LP positions from contracts/API
                // This would involve:
                // 1. Getting all LP token contracts user has balance in
                // 2. For each LP token, get:
                //    - LP token balance
                //    - Pool reserves (token0, token1)
                //    - Total LP supply
                //    - Calculate share percentage
                //    - Get unclaimed fees
                //    - Calculate USD value
                
                // Mock data for now
                await new Promise(resolve => setTimeout(resolve, 1000));
                setPositions([
                    {
                        id: 1,
                        tokenPair: 'BNB/MANGO',
                        lpAmount: '50.25',
                        usdValue: '1250.50',
                        sharePercent: '2.5',
                        apr: '12.5',
                        unclaimedFees: '5.25',
                        tokenA: { symbol: 'BNB', amount: '25.125' },
                        tokenB: { symbol: 'MANGO', amount: '5000' }
                    },
                    {
                        id: 2,
                        tokenPair: 'ETH/USDC',
                        lpAmount: '100.00',
                        usdValue: '2500.00',
                        sharePercent: '5.0',
                        apr: '15.2',
                        unclaimedFees: '10.50',
                        tokenA: { symbol: 'ETH', amount: '1.0' },
                        tokenB: { symbol: 'USDC', amount: '2500' }
                    }
                ]);
            } catch (error) {
                console.error('Error fetching positions:', error);
                setPositions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPositions();
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
                        <button 
                            className="liquidity-position-button liquidity-position-button-secondary"
                            onClick={() => handleClaimFees(position.id)}
                            disabled={parseFloat(position.unclaimedFees) <= 0}
                        >
                            Claim Fees
                        </button>
                        <button 
                            className="liquidity-position-button liquidity-position-button-primary"
                            onClick={() => handleManagePosition(position.id)}
                        >
                            Manage
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LiquidityPositionsList;

