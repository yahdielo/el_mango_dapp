/**
 * LayerSwapSwap Component
 * 
 * Full swap flow for LayerSwap integration.
 * Includes source/destination chain selection, amount input, fee display,
 * swap initiation, and status tracking.
 */

import React, { useState, useMemo } from 'react';
import { Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { ArrowLeftRight, BoxArrowUpRight, InfoCircle, Clock } from 'react-bootstrap-icons';
import { useAccount } from 'wagmi';
import { useLayerSwap, useLayerSwapRoutes, useLayerSwapEstimate } from '../hooks/useLayerSwap';
import chainConfig from '../services/chainConfig';
import ChainModal from './chainModal';
import ChainStatusBadge from './ChainStatusBadge';
import SwapProgress from './SwapProgress';
import LayerSwapIntegration from './LayerSwapIntegration';
import './css/LayerSwapSwap.css';

const LayerSwapSwap = ({ className = '' }) => {
    const { address } = useAccount();
    const [sourceChainId, setSourceChainId] = useState(null);
    const [destChainId, setDestChainId] = useState(null);
    const [amount, setAmount] = useState('');
    const [tokenAddress, setTokenAddress] = useState('');
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showDestModal, setShowDestModal] = useState(false);

    // Get LayerSwap routes
    const { routes, loading: routesLoading } = useLayerSwapRoutes(sourceChainId, destChainId);

    // Get fee estimate
    const estimateParams = useMemo(() => {
        if (!sourceChainId || !destChainId || !amount || !tokenAddress) {
            return null;
        }
        return {
            sourceChainId,
            destChainId,
            tokenIn: tokenAddress,
            tokenOut: tokenAddress, // For LayerSwap, often same token
            amountIn: amount,
        };
    }, [sourceChainId, destChainId, amount, tokenAddress]);

    const { estimate, loading: estimateLoading } = useLayerSwapEstimate(estimateParams);

    // Swap execution
    const { initiateSwap, swapStatus, loading: swapLoading, error, cancelSwap } = useLayerSwap();

    // Filter chains that require LayerSwap or are Solana/Bitcoin
    const layerSwapChains = useMemo(() => {
        const allChains = chainConfig.getAllChains();
        if (!allChains || !Array.isArray(allChains)) {
            return [];
        }
        return allChains.filter(chain => {
            const chainId = parseInt(chain.chainId);
            return chainConfig.requiresLayerSwap(chainId) || 
                   chainId === 501111 || // Solana
                   chainId === 0; // Bitcoin
        });
    }, []);

    const sourceChain = sourceChainId ? chainConfig.getChain(sourceChainId) : null;
    const destChain = destChainId ? chainConfig.getChain(destChainId) : null;

    const handleSourceChainSelect = (chain) => {
        setSourceChainId(parseInt(chain.chainId));
        setShowSourceModal(false);
    };

    const handleDestChainSelect = (chain) => {
        setDestChainId(parseInt(chain.chainId));
        setShowDestModal(false);
    };

    const handleSwap = async () => {
        if (!address) {
            alert('Please connect your wallet');
            return;
        }

        if (!sourceChainId || !destChainId || !amount || !tokenAddress) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await initiateSwap({
                sourceChainId,
                destChainId,
                tokenIn: tokenAddress,
                tokenOut: tokenAddress,
                amountIn: amount,
            });
        } catch (err) {
            console.error('Swap initiation failed:', err);
        }
    };

    const canInitiateSwap = address && sourceChainId && destChainId && amount && tokenAddress && estimate;

    // If swap is in progress, show progress component
    if (swapStatus && swapStatus.status !== 'pending') {
        return (
            <Card className={`layer-swap-swap ${className}`}>
                <Card.Header>
                    <h5 className="mb-0">
                        <Badge bg="info" className="me-2">LayerSwap</Badge>
                        Swap in Progress
                    </h5>
                </Card.Header>
                <Card.Body>
                    <SwapProgress 
                        swapStatus={swapStatus} 
                        onCancel={cancelSwap}
                    />
                </Card.Body>
            </Card>
        );
    }

    return (
        <div className={`layer-swap-swap ${className}`}>
            <Card>
                <Card.Header>
                    <h5 className="mb-0">
                        <Badge bg="info" className="me-2">LayerSwap</Badge>
                        Cross-Chain Swap
                    </h5>
                </Card.Header>
                <Card.Body>
                    {/* Chain Selection */}
                    <div className="chain-selection mb-3">
                        <div className="chain-selector">
                            <Form.Label>
                                From Chain
                                {sourceChainId && (
                                    <ChainStatusBadge chainId={sourceChainId} className="ms-2" />
                                )}
                            </Form.Label>
                            <Button
                                variant="outline-primary"
                                className="w-100 chain-select-button"
                                onClick={() => setShowSourceModal(true)}
                            >
                                {sourceChain ? (
                                    <>
                                        {sourceChain.img && (
                                            <img 
                                                src={sourceChain.img} 
                                                alt={sourceChain.chainName}
                                                className="chain-icon me-2"
                                            />
                                        )}
                                        {sourceChain.chainName}
                                    </>
                                ) : (
                                    'Select Source Chain'
                                )}
                            </Button>
                        </div>

                        <div className="swap-arrow">
                            <ArrowLeftRight size={24} />
                        </div>

                        <div className="chain-selector">
                            <Form.Label>
                                To Chain
                                {destChainId && (
                                    <ChainStatusBadge chainId={destChainId} className="ms-2" />
                                )}
                            </Form.Label>
                            <Button
                                variant="outline-primary"
                                className="w-100 chain-select-button"
                                onClick={() => setShowDestModal(true)}
                            >
                                {destChain ? (
                                    <>
                                        {destChain.img && (
                                            <img 
                                                src={destChain.img} 
                                                alt={destChain.chainName}
                                                className="chain-icon me-2"
                                            />
                                        )}
                                        {destChain.chainName}
                                    </>
                                ) : (
                                    'Select Destination Chain'
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Token Address Input */}
                    <Form.Group className="mb-3">
                        <Form.Label>Token Address</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="0x... or token address"
                            value={tokenAddress}
                            onChange={(e) => setTokenAddress(e.target.value)}
                            disabled={swapLoading}
                        />
                        <Form.Text className="text-muted">
                            Enter the token contract address on the source chain
                        </Form.Text>
                    </Form.Group>

                    {/* Amount Input */}
                    <Form.Group className="mb-3">
                        <Form.Label>Amount</Form.Label>
                        <Form.Control
                            type="number"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={swapLoading}
                            step="any"
                            min="0"
                        />
                        <Form.Text className="text-muted">
                            Enter the amount to swap (in smallest unit, e.g., wei)
                        </Form.Text>
                    </Form.Group>

                    {/* Route Information */}
                    {routesLoading && (
                        <div className="text-center mb-3">
                            <Spinner size="sm" /> Loading routes...
                        </div>
                    )}

                    {routes && routes.length > 0 && (
                        <Alert variant="info" className="mb-3">
                            <InfoCircle className="me-2" />
                            <strong>Available Routes:</strong> {routes.length} route(s) found
                        </Alert>
                    )}

                    {/* Fee Estimation */}
                    {estimateLoading && (
                        <div className="text-center mb-3">
                            <Spinner size="sm" /> Calculating fees...
                        </div>
                    )}

                    {estimate && (
                        <div className="fee-estimate mb-3">
                            <h6>Fee Estimate</h6>
                            <div className="estimate-details">
                                <div className="estimate-row">
                                    <span>LayerSwap Fee:</span>
                                    <span>{estimate.layerSwapFee || 'N/A'}</span>
                                </div>
                                <div className="estimate-row">
                                    <span>Mango Fee:</span>
                                    <span>{estimate.mangoFee || 'N/A'}</span>
                                </div>
                                {estimate.totalFee && (
                                    <div className="estimate-row">
                                        <span><strong>Total Fee:</strong></span>
                                        <span><strong>{estimate.totalFee}</strong></span>
                                    </div>
                                )}
                                {estimate.estimatedTime && (
                                    <div className="estimate-row">
                                        <span><Clock size={14} className="me-1" /> Estimated Time:</span>
                                        <span>{estimate.estimatedTime} seconds</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <Alert 
                            variant="danger" 
                            className="mb-3"
                            data-testid="layer-swap-error"
                            role="alert"
                        >
                            <strong>Error:</strong> {error}
                        </Alert>
                    )}

                    {/* Swap Button */}
                    {!address && (
                        <Alert variant="warning" className="mb-3">
                            Please connect your wallet to continue
                        </Alert>
                    )}

                    <Button
                        variant="primary"
                        className="w-100"
                        onClick={handleSwap}
                        disabled={!canInitiateSwap || swapLoading}
                    >
                        {swapLoading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <BoxArrowUpRight className="me-2" />
                                Initiate Swap
                            </>
                        )}
                    </Button>

                    {/* Pending Swap Status */}
                    {swapStatus && swapStatus.status === 'pending' && (
                        <Alert variant="info" className="mt-3">
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

            {/* Chain Selection Modals */}
            <ChainModal
                show={showSourceModal}
                onHide={() => setShowSourceModal(false)}
                onChainSelect={handleSourceChainSelect}
                filterType="all"
                excludeChainIds={destChainId ? [destChainId] : []}
            />

            <ChainModal
                show={showDestModal}
                onHide={() => setShowDestModal(false)}
                onChainSelect={handleDestChainSelect}
                filterType="all"
                excludeChainIds={sourceChainId ? [sourceChainId] : []}
            />
        </div>
    );
};

export default LayerSwapSwap;

