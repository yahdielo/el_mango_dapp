/**
 * LayerSwapIntegration Component
 * 
 * Handles swaps for Solana and Bitcoin via LayerSwap.
 * Shows LayerSwap-specific UI, instructions, swap status, and error handling.
 */

import React, { useState } from 'react';
import { Card, Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { InfoCircle, CheckCircle, XCircle, Clock, BoxArrowUpRight } from 'react-bootstrap-icons';
import { useLayerSwap } from '../hooks/useLayerSwap';
import chainConfig from '../services/chainConfig';
import SwapProgress from './SwapProgress';
import './css/LayerSwapIntegration.css';

const LayerSwapIntegration = ({ 
    sourceChainId, 
    destChainId, 
    amount, 
    token,
    onSwapComplete,
    className = '' 
}) => {
    const { initiateSwap, swapStatus, loading, error, cancelSwap } = useLayerSwap();
    const [showInstructions, setShowInstructions] = useState(true);

    if (!sourceChainId || !destChainId) {
        return (
            <Card className={`layer-swap-integration ${className}`}>
                <Card.Body>
                    <Alert variant="info">
                        <InfoCircle className="me-2" />
                        Please select source and destination chains
                    </Alert>
                </Card.Body>
            </Card>
        );
    }

    const sourceChain = chainConfig.getChain(sourceChainId);
    const destChain = chainConfig.getChain(destChainId);
    const sourceRequiresLS = chainConfig.requiresLayerSwap(sourceChainId);
    const destRequiresLS = chainConfig.requiresLayerSwap(destChainId);

    // Check if LayerSwap is required
    if (!sourceRequiresLS && !destRequiresLS) {
        return null; // Don't show LayerSwap UI if not needed
    }

    const handleInitiateSwap = async () => {
        if (!amount || !token) {
            return;
        }

        try {
            const result = await initiateSwap({
                sourceChainId,
                destChainId,
                tokenIn: token.address || token,
                tokenOut: token.address || token, // For LayerSwap, often same token
                amountIn: amount,
            });

            setShowInstructions(false);
            
            if (onSwapComplete) {
                onSwapComplete(result);
            }
        } catch (err) {
            console.error('LayerSwap initiation failed:', err);
        }
    };

    const handleCancel = async () => {
        if (swapStatus?.swapId) {
            try {
                await cancelSwap(swapStatus.swapId);
            } catch (err) {
                console.error('Failed to cancel swap:', err);
            }
        }
    };

    // Show swap progress if swap is in progress
    if (swapStatus && swapStatus.status !== 'pending') {
        return (
            <Card className={`layer-swap-integration ${className}`}>
                <Card.Header>
                    <div className="d-flex align-items-center">
                        <Badge bg="info" className="me-2">LayerSwap</Badge>
                        <h6 className="mb-0">Swap in Progress</h6>
                    </div>
                </Card.Header>
                <Card.Body>
                    <SwapProgress 
                        swapStatus={swapStatus} 
                        onCancel={handleCancel}
                    />
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className={`layer-swap-integration ${className}`}>
            <Card.Header>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <Badge bg="info" className="me-2">LayerSwap</Badge>
                        <h6 className="mb-0">LayerSwap Integration</h6>
                    </div>
                    {showInstructions && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowInstructions(!showInstructions)}
                        >
                            {showInstructions ? 'Hide' : 'Show'} Instructions
                        </Button>
                    )}
                </div>
            </Card.Header>
            <Card.Body>
                {/* Instructions */}
                {showInstructions && (
                    <div className="instructions mb-3">
                        <Alert variant="info">
                            <h6>
                                <InfoCircle className="me-2" />
                                How LayerSwap Works
                            </h6>
                            <ol className="mb-0">
                                <li>
                                    <strong>Initiate Swap:</strong> Click the button below to create a swap order
                                </li>
                                <li>
                                    <strong>Deposit Funds:</strong> Send your tokens to the deposit address provided
                                </li>
                                <li>
                                    <strong>Wait for Processing:</strong> LayerSwap will process your swap (typically 5-15 minutes)
                                </li>
                                <li>
                                    <strong>Receive Tokens:</strong> Your tokens will arrive on the destination chain
                                </li>
                            </ol>
                        </Alert>

                        {(sourceRequiresLS || destRequiresLS) && (
                            <Alert variant="warning" className="mt-2">
                                <strong>Note:</strong> This swap uses LayerSwap bridge service.
                                {sourceRequiresLS && (
                                    <div className="mt-1">
                                        <strong>{sourceChain?.chainName || `Chain ${sourceChainId}`}</strong> requires LayerSwap integration.
                                    </div>
                                )}
                                {destRequiresLS && (
                                    <div className="mt-1">
                                        <strong>{destChain?.chainName || `Chain ${destChainId}`}</strong> requires LayerSwap integration.
                                    </div>
                                )}
                            </Alert>
                        )}
                    </div>
                )}

                {/* Swap Details */}
                <div className="swap-details mb-3">
                    <div className="detail-row">
                        <span>From:</span>
                        <span>
                            {sourceChain?.chainName || `Chain ${sourceChainId}`}
                            {sourceRequiresLS && <Badge bg="info" className="ms-2">LayerSwap</Badge>}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span>To:</span>
                        <span>
                            {destChain?.chainName || `Chain ${destChainId}`}
                            {destRequiresLS && <Badge bg="info" className="ms-2">LayerSwap</Badge>}
                        </span>
                    </div>
                    {amount && (
                        <div className="detail-row">
                            <span>Amount:</span>
                            <span>{amount}</span>
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <Alert variant="danger" className="mb-3">
                        <XCircle className="me-2" />
                        <strong>Error:</strong> {error}
                    </Alert>
                )}

                {/* Initiate Swap Button */}
                {!swapStatus && (
                    <Button
                        variant="primary"
                        className="w-100"
                        onClick={handleInitiateSwap}
                        disabled={loading || !amount || !token}
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Initiating Swap...
                            </>
                        ) : (
                            <>
                                <BoxArrowUpRight className="me-2" />
                                Initiate LayerSwap
                            </>
                        )}
                    </Button>
                )}

                {/* Pending Swap Status */}
                {swapStatus && swapStatus.status === 'pending' && (
                    <Alert variant="info">
                        <Clock className="me-2" />
                        <strong>Swap Initiated</strong>
                        {swapStatus.depositAddress && (
                            <div className="mt-2">
                                <small>
                                    <strong>Deposit Address:</strong>
                                    <code className="ms-2">{swapStatus.depositAddress}</code>
                                </small>
                            </div>
                        )}
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};

export default LayerSwapIntegration;

