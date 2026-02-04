/**
 * CrossChainSwap Component
 * 
 * Enables users to perform cross-chain swaps using LayerSwap integration.
 * Provides chain selection, route discovery, fee estimation, and swap initiation.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge, Modal, Image } from 'react-bootstrap';
import { ArrowLeftRight, Search, XCircle, Clock } from 'react-bootstrap-icons';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { useCrossChainSwap, useSwapRoutes, useSwapEstimate } from '../hooks/useCrossChainSwap';
import chainConfig from '../services/chainConfig';
import { checkMinimumAmount } from '../utils/chainValidation';
import { supportsDirectSwap, requiresLayerSwap, supportsWhitelist, getFeatureMessage, FEATURE_FLAGS } from '../utils/featureFlags';
import { formatErrorForDisplay } from '../utils/chainErrors';
import { fetchMultipleRoutes, getBestRoute, compareRoutes, formatTimeEstimate, formatCostEstimate } from '../services/routeOptimization';
import ChainStatusBadge from './ChainStatusBadge';
import WhitelistBadge from './WhitelistBadge';
import SwapProgress from './SwapProgress';
import CallTokenList from './getTokenList';
import './css/CrossChainSwap.css';

const CrossChainSwap = ({ className = '' }) => {
    const { address } = useAccount();
    
    // Get all chains from ChainConfigService
    const supportedChains = useMemo(() => chainConfig.getAllChains(), []);
    
    const [sourceChainId, setSourceChainId] = useState(null);
    const [destChainId, setDestChainId] = useState(null);
    const [tokenIn, setTokenIn] = useState('');
    const [tokenOut, setTokenOut] = useState('');
    const [amountIn, setAmountIn] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    
    // Token selection state
    const [showTokenInModal, setShowTokenInModal] = useState(false);
    const [showTokenOutModal, setShowTokenOutModal] = useState(false);
    const [selectedTokenIn, setSelectedTokenIn] = useState(null);
    const [selectedTokenOut, setSelectedTokenOut] = useState(null);
    
    // Route discovery with optimization
    const { routes: basicRoutes, loading: routesLoading, error: routesError } = useSwapRoutes(
        sourceChainId,
        destChainId,
        tokenIn || null,
        tokenOut || null
    );
    
    const [optimizedRoutes, setOptimizedRoutes] = useState([]);
    const [routesComparison, setRoutesComparison] = useState(null);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loadingOptimizedRoutes, setLoadingOptimizedRoutes] = useState(false);
    
    // Fee estimation
    const estimateParams = sourceChainId && destChainId && tokenIn && tokenOut && amountIn
        ? { sourceChainId, destChainId, tokenIn, tokenOut, amountIn }
        : null;
    const { estimate, loading: estimateLoading, error: estimateError } = useSwapEstimate(estimateParams);
    
    // Swap execution
    const { initiateSwap, swapStatus, loading: swapLoading, error: swapError, cancelSwap, requestRefund, getRefundStatus } = useCrossChainSwap();
    
    // Token balance hooks
    // For tokenIn balance (source chain)
    const isTokenInNative = selectedTokenIn?.symbol === 'ETH' || selectedTokenIn?.address === null || selectedTokenIn?.address === undefined;
    const tokenInBalance = useBalance({
        address: address,
        token: isTokenInNative ? undefined : (selectedTokenIn?.address),
        chainId: sourceChainId,
        query: {
            enabled: !!address && !!selectedTokenIn && !!sourceChainId && !swapLoading,
        },
    });
    
    // For tokenOut balance (destination chain)
    const isTokenOutNative = selectedTokenOut?.symbol === 'ETH' || selectedTokenOut?.address === null || selectedTokenOut?.address === undefined;
    const tokenOutBalance = useBalance({
        address: address,
        token: isTokenOutNative ? undefined : (selectedTokenOut?.address),
        chainId: destChainId,
        query: {
            enabled: !!address && !!selectedTokenOut && !!destChainId && !swapLoading,
        },
    });
    
    // Format balances
    const formattedTokenInBalance = useMemo(() => {
        if (!tokenInBalance.data || !selectedTokenIn) return null;
        const decimals = selectedTokenIn.decimals || 18;
        try {
            const balance = formatUnits(tokenInBalance.data.value, decimals);
            return parseFloat(balance).toFixed(4);
        } catch (e) {
            return null;
        }
    }, [tokenInBalance.data, selectedTokenIn]);
    
    const formattedTokenOutBalance = useMemo(() => {
        if (!tokenOutBalance.data || !selectedTokenOut) return null;
        const decimals = selectedTokenOut.decimals || 18;
        try {
            const balance = formatUnits(tokenOutBalance.data.value, decimals);
            return parseFloat(balance).toFixed(4);
        } catch (e) {
            return null;
        }
    }, [tokenOutBalance.data, selectedTokenOut]);

    const handleInitiateSwap = async () => {
        if (!address || !sourceChainId || !destChainId || !tokenIn || !tokenOut || !amountIn) {
            return;
        }

        // Validate minimum amount before initiating swap
        if (sourceChainId) {
            const validation = checkMinimumAmount(sourceChainId, amountIn, 'swap');
            if (!validation.isValid) {
                alert(validation.message);
                return; // Prevent swap if below minimum
            }
        }

        try {
            await initiateSwap({
                sourceChainId,
                destChainId,
                tokenIn,
                tokenOut,
                amountIn,
                recipient: address,
                routeId: selectedRoute?.id, // Include selected route ID if available
            });
            setShowConfirmation(false);
        } catch (error) {
            console.error('Swap initiation failed:', error);
            // Format error using ChainConfigService
            const formattedError = formatErrorForDisplay(error, sourceChainId);
            alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
        }
    };

    const handleRequestRefund = async () => {
        if (!swapStatus?.swapId) {
            alert('No swap ID available for refund request');
            return;
        }

        const reason = window.prompt('Please provide a reason for the refund request:');
        if (!reason) {
            return; // User cancelled
        }

        try {
            await requestRefund(swapStatus.swapId, reason);
            alert('Refund request submitted successfully. You will be notified once it is processed.');
        } catch (error) {
            console.error('Refund request failed:', error);
            alert('Failed to request refund: ' + (error.message || 'Unknown error'));
        }
    };

    const handleSwap = () => {
        setShowConfirmation(true);
    };

    // Token selection handlers
    const handleTokenInSelect = (token) => {
        setSelectedTokenIn(token);
        setTokenIn(token.address); // Set token address for swap
        setShowTokenInModal(false);
        
        // Auto-select source chain if token has chainId
        if (token.chainId && token.chainId !== sourceChainId) {
            setSourceChainId(token.chainId);
        }
    };

    const handleTokenOutSelect = (token) => {
        setSelectedTokenOut(token);
        setTokenOut(token.address); // Set token address for swap
        setShowTokenOutModal(false);
        
        // Auto-select destination chain if token has chainId
        if (token.chainId && token.chainId !== destChainId) {
            setDestChainId(token.chainId);
        }
    };

    // Fetch optimized routes when parameters change
    useEffect(() => {
        const fetchOptimized = async () => {
            if (!sourceChainId || !destChainId || !tokenIn || !tokenOut || !amountIn) {
                setOptimizedRoutes([]);
                setRoutesComparison(null);
                setSelectedRoute(null);
                return;
            }

            setLoadingOptimizedRoutes(true);
            try {
                const routes = await fetchMultipleRoutes(
                    sourceChainId,
                    destChainId,
                    tokenIn,
                    tokenOut,
                    amountIn
                );
                
                setOptimizedRoutes(routes);
                
                if (routes.length > 0) {
                    const comparison = compareRoutes(routes);
                    setRoutesComparison(comparison);
                    // Auto-select best route
                    setSelectedRoute(comparison.bestRoute);
                } else {
                    setRoutesComparison(null);
                    setSelectedRoute(null);
                }
            } catch (error) {
                console.error('Error fetching optimized routes:', error);
                setOptimizedRoutes([]);
                setRoutesComparison(null);
                setSelectedRoute(null);
            } finally {
                setLoadingOptimizedRoutes(false);
            }
        };

        fetchOptimized();
    }, [sourceChainId, destChainId, tokenIn, tokenOut, amountIn]);

    // Get chainInfo for token list component
    const chainInfo = useMemo(() => {
        if (!sourceChainId) return null;
        return {
            chainId: sourceChainId,
            // Add other chain info as needed
        };
    }, [sourceChainId]);

    // Check if swap can be initiated (including minimum amount validation)
    const canInitiateSwap = useMemo(() => {
        if (!address || !sourceChainId || !destChainId || !tokenIn || !tokenOut || !amountIn || !estimate) {
            return false;
        }
        
        // Validate minimum amount
        if (sourceChainId) {
            const validation = checkMinimumAmount(sourceChainId, amountIn, 'swap');
            if (!validation.isValid) {
                return false;
            }
        }
        
        return true;
    }, [address, sourceChainId, destChainId, tokenIn, tokenOut, amountIn, estimate]);

    return (
        <div className={`cross-chain-swap ${className}`}>
            <Card>
                <Card.Header>
                    <h5 className="mb-0">
                        <ArrowLeftRight className="me-2" />
                        Cross-Chain Swap
                    </h5>
                </Card.Header>
                <Card.Body>
                    {/* Chain Selection */}
                    <div className="chain-selection">
                        <div className="chain-selector">
                            <Form.Label htmlFor="source-chain-select">
                                From Chain
                                {sourceChainId && (
                                    <ChainStatusBadge chainId={sourceChainId} className="ms-2" />
                                )}
                            </Form.Label>
                            <Form.Select
                                id="source-chain-select"
                                value={sourceChainId || ''}
                                onChange={(e) => setSourceChainId(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={swapLoading}
                            >
                                <option value="">Select source chain</option>
                                {supportedChains?.map(chain => {
                                    const chainId = parseInt(chain.chainId);
                                    const chainName = chain.chainName || `Chain ${chainId}`;
                                    return (
                                        <option key={chain.chainId} value={chainId}>
                                            {chainName}
                                        </option>
                                    );
                                })}
                            </Form.Select>
                        </div>

                        <div className="swap-arrow">
                            <ArrowLeftRight size={24} />
                        </div>

                        <div className="chain-selector">
                            <Form.Label htmlFor="dest-chain-select">
                                To Chain
                                {destChainId != null && (
                                    <ChainStatusBadge chainId={destChainId} className="ms-2" />
                                )}
                            </Form.Label>
                            <Form.Select
                                id="dest-chain-select"
                                value={destChainId || ''}
                                onChange={(e) => setDestChainId(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={swapLoading}
                            >
                                <option value="">Select destination chain</option>
                                {supportedChains?.map(chain => {
                                    const chainId = parseInt(chain.chainId);
                                    const chainName = chain.chainName || `Chain ${chainId}`;
                                    return (
                                        <option key={chain.chainId} value={chainId}>
                                            {chainName}
                                        </option>
                                    );
                                })}
                            </Form.Select>
                        </div>
                    </div>

                    {/* Token Selection */}
                    <div className="token-selection mt-3">
                        <Form.Group>
                            <Form.Label htmlFor="token-in-select">Token In</Form.Label>
                            <Button
                                id="token-in-select"
                                variant="outline-primary"
                                onClick={() => setShowTokenInModal(true)}
                                className="w-100 d-flex align-items-center justify-content-between"
                                disabled={swapLoading}
                            >
                                <span className="d-flex flex-column align-items-start" style={{ flex: 1 }}>
                                    {selectedTokenIn ? (
                                        <>
                                            <div className="d-flex align-items-center">
                                                <Image
                                                    src={selectedTokenIn.img}
                                                    roundedCircle
                                                    style={{ width: '24px', height: '24px', marginRight: '8px' }}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/logo192.png'; }}
                                                />
                                                <span>{selectedTokenIn.symbol}</span>
                                                {selectedTokenIn.chainId && (
                                                    <Badge bg="secondary" className="ms-2">
                                                        {chainConfig.getChain(selectedTokenIn.chainId)?.chainName || `Chain ${selectedTokenIn.chainId}`}
                                                    </Badge>
                                                )}
                                            </div>
                                            {formattedTokenInBalance !== null && (
                                                <Form.Text className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '32px', marginTop: '2px' }}>
                                                    Balance: {formattedTokenInBalance} {selectedTokenIn.symbol}
                                                </Form.Text>
                                            )}
                                        </>
                                    ) : (
                                        'Select Token In'
                                    )}
                                </span>
                                <span>▼</span>
                            </Button>
                        </Form.Group>

                        <Form.Group className="mt-2">
                            <Form.Label htmlFor="token-out-select">Token Out</Form.Label>
                            <Button
                                id="token-out-select"
                                variant="outline-primary"
                                onClick={() => setShowTokenOutModal(true)}
                                className="w-100 d-flex align-items-center justify-content-between"
                                disabled={swapLoading}
                            >
                                <span className="d-flex flex-column align-items-start" style={{ flex: 1 }}>
                                    {selectedTokenOut ? (
                                        <>
                                            <div className="d-flex align-items-center">
                                                <Image
                                                    src={selectedTokenOut.img}
                                                    roundedCircle
                                                    style={{ width: '24px', height: '24px', marginRight: '8px' }}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/logo192.png'; }}
                                                />
                                                <span>{selectedTokenOut.symbol}</span>
                                                {selectedTokenOut.chainId && (
                                                    <Badge bg="secondary" className="ms-2">
                                                        {chainConfig.getChain(selectedTokenOut.chainId)?.chainName || `Chain ${selectedTokenOut.chainId}`}
                                                    </Badge>
                                                )}
                                            </div>
                                            {formattedTokenOutBalance !== null && (
                                                <Form.Text className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '32px', marginTop: '2px' }}>
                                                    Balance: {formattedTokenOutBalance} {selectedTokenOut.symbol}
                                                </Form.Text>
                                            )}
                                        </>
                                    ) : (
                                        'Select Token Out'
                                    )}
                                </span>
                                <span>▼</span>
                            </Button>
                        </Form.Group>

                        <Form.Group className="mt-2">
                            <Form.Label htmlFor="amount-input">Amount</Form.Label>
                            <Form.Control
                                id="amount-input"
                                type="number"
                                placeholder="0.0"
                                value={amountIn}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setAmountIn(value);
                                    
                                    // Validate minimum amount for source chain
                                    if (value && sourceChainId) {
                                        const minimums = chainConfig.getMinimumAmounts(sourceChainId);
                                        if (minimums?.swap) {
                                            const amountNum = parseFloat(value);
                                            const minNum = parseFloat(minimums.swap);
                                            if (amountNum > 0 && amountNum < minNum) {
                                                // Show warning but don't prevent input
                                                console.warn(`Amount below minimum: ${minimums.swap}`);
                                            }
                                        }
                                    }
                                }}
                                disabled={swapLoading}
                                step="any"
                            />
                            {/* Minimum amount hint */}
                            {sourceChainId && (() => {
                                const minimums = chainConfig.getMinimumAmounts(sourceChainId);
                                const sourceChain = chainConfig.getChain(sourceChainId);
                                if (minimums?.swap) {
                                    return (
                                        <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            Minimum: {minimums.swap} {sourceChain?.nativeCurrency?.symbol || 'tokens'}
                                        </Form.Text>
                                    );
                                }
                                return null;
                            })()}
                        </Form.Group>
                    </div>

                    {/* Route Information */}
                    {routesLoading && (
                        <div className="text-center mt-3">
                            <Spinner size="sm" /> Loading routes...
                        </div>
                    )}

                    {routesError && (
                        <Alert variant="danger" className="mt-3">
                            {routesError}
                        </Alert>
                    )}

                    {estimateError && (
                        <Alert variant="danger" className="mt-3">
                            <strong>Estimate Error:</strong> {estimateError}
                        </Alert>
                    )}

                    {/* Optimized Routes Comparison */}
                    {loadingOptimizedRoutes && (
                        <div className="text-center mt-3">
                            <Spinner size="sm" /> Finding best routes...
                        </div>
                    )}

                    {optimizedRoutes && optimizedRoutes.length > 0 && routesComparison && (
                        <div className="routes-comparison mt-3">
                            <h6>Available Routes (Best First)</h6>
                            <div className="routes-list">
                                {optimizedRoutes.map((route, index) => {
                                    const isSelected = selectedRoute?.id === route.id;
                                    const isBest = index === 0;
                                    const totalCost = parseFloat(route.totalFee || 0) + parseFloat(route.gasCost || 0);
                                    
                                    return (
                                        <div 
                                            key={route.id} 
                                            className={`route-item ${isSelected ? 'route-selected' : ''} ${isBest ? 'route-best' : ''}`}
                                            onClick={() => setSelectedRoute(route)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="route-header">
                                                <div className="d-flex align-items-center gap-2">
                                                    {isBest && <Badge bg="success">Best</Badge>}
                                                    {isSelected && <Badge bg="primary">Selected</Badge>}
                                                    <Badge bg={route.type === 'layerswap' ? 'info' : 'secondary'}>
                                                        {route.bridge || route.type}
                                                    </Badge>
                                                    <span className="route-name">
                                                        {route.source} → {route.destination}
                                                    </span>
                                                </div>
                                                <div className="route-score">
                                                    Score: {route.score?.toFixed(1) || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="route-details">
                                                <div className="route-detail-item">
                                                    <span>Total Cost:</span>
                                                    <span className="route-value">{formatCostEstimate(totalCost)}</span>
                                                </div>
                                                <div className="route-detail-item">
                                                    <span><Clock size={14} /> Estimated Time:</span>
                                                    <span className="route-value">{formatTimeEstimate(route.estimatedTime)}</span>
                                                </div>
                                                <div className="route-detail-item">
                                                    <span>Reliability:</span>
                                                    <span className="route-value">{(route.reliability * 100).toFixed(1)}%</span>
                                                </div>
                                                {route.layerSwapFee && parseFloat(route.layerSwapFee) > 0 && (
                                                    <div className="route-detail-item">
                                                        <span>LayerSwap Fee:</span>
                                                        <span className="route-value">{formatCostEstimate(route.layerSwapFee)}</span>
                                                    </div>
                                                )}
                                                {route.mangoFee && parseFloat(route.mangoFee) > 0 && (
                                                    <div className="route-detail-item">
                                                        <span>Mango Fee:</span>
                                                        <span className="route-value">{formatCostEstimate(route.mangoFee)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Route Comparison Summary */}
                            {routesComparison && optimizedRoutes.length > 1 && (
                                <div className="route-comparison-summary mt-3">
                                    <h6>Route Comparison</h6>
                                    <div className="comparison-grid">
                                        <div className="comparison-item">
                                            <span className="comparison-label">Cheapest:</span>
                                            <span className="comparison-value">
                                                {routesComparison.cheapestRoute?.bridge || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="comparison-item">
                                            <span className="comparison-label">Fastest:</span>
                                            <span className="comparison-value">
                                                {routesComparison.fastestRoute?.bridge || 'N/A'} 
                                                ({formatTimeEstimate(routesComparison.fastestRoute?.estimatedTime)})
                                            </span>
                                        </div>
                                        <div className="comparison-item">
                                            <span className="comparison-label">Most Reliable:</span>
                                            <span className="comparison-value">
                                                {routesComparison.mostReliableRoute?.bridge || 'N/A'}
                                                ({(routesComparison.mostReliableRoute?.reliability * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fallback to basic routes if optimization fails */}
                    {(!optimizedRoutes || optimizedRoutes.length === 0) && basicRoutes && basicRoutes.length > 0 && (
                        <div className="routes-info mt-3">
                            <h6>Available Routes</h6>
                            {basicRoutes.map((route, index) => (
                                <div key={index} className="route-item">
                                    <div className="route-details">
                                        <Badge bg="info">{route.source} → {route.destination}</Badge>
                                        <span className="ms-2">Fee: {route.fee}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chain Warnings */}
                    {(sourceChainId != null || destChainId != null) && (
                        <div className="chain-warnings mt-3">
                            {sourceChainId && (() => {
                                const sourceChain = chainConfig.getChain(sourceChainId);
                                const sourceMin = chainConfig.getMinimumAmounts(sourceChainId);
                                const sourceDirectSwap = supportsDirectSwap(sourceChainId);
                                const sourceLayerSwap = requiresLayerSwap(sourceChainId);
                                
                                // Show LayerSwap requirement
                                if (sourceLayerSwap || sourceChain?.type === 'SOLANA' || sourceChain?.type === 'BITCOIN') {
                                    return (
                                        <Alert variant="info" className="mb-2">
                                            <Badge bg="info" className="me-2">LayerSwap</Badge>
                                            {sourceChain.chainName} swaps use LayerSwap integration
                                        </Alert>
                                    );
                                }
                                
                                // Show direct swap support
                                if (sourceDirectSwap) {
                                    return (
                                        <Alert variant="success" className="mb-2" style={{ fontSize: '0.875rem' }}>
                                            <Badge bg="success" className="me-2">Direct Swap</Badge>
                                            Direct swaps are supported on {sourceChain.chainName}
                                        </Alert>
                                    );
                                }
                                
                                // Show minimum amount warning
                                if (sourceMin?.swap) {
                                    // Check if current amount is below minimum
                                    const amountNum = parseFloat(amountIn || '0');
                                    const minNum = parseFloat(sourceMin.swap);
                                    const isBelowMinimum = amountNum > 0 && amountNum < minNum;
                                    
                                    return (
                                        <Alert variant={isBelowMinimum ? "danger" : "warning"} className="mb-2">
                                            <strong>Minimum swap amount:</strong> {sourceMin.swap} {sourceChain?.nativeCurrency?.symbol || 'tokens'}
                                            {isBelowMinimum && (
                                                <div className="mt-1" style={{ fontSize: '0.875rem' }}>
                                                    ⚠️ Your amount is below the minimum
                                                </div>
                                            )}
                                        </Alert>
                                    );
                                }
                                
                                return null;
                            })()}
                            
                            {destChainId != null && (() => {
                                const destChain = chainConfig.getChain(destChainId);
                                const destLayerSwap = requiresLayerSwap(destChainId);
                                
                                if (destLayerSwap || destChain?.type === 'SOLANA' || destChain?.type === 'BITCOIN') {
                                    return (
                                        <Alert variant="info" className="mb-2">
                                            <Badge bg="info" className="me-2">LayerSwap</Badge>
                                            {destChain.chainName} swaps use LayerSwap integration
                                        </Alert>
                                    );
                                }
                                
                                return null;
                            })()}
                        </div>
                    )}

                    {/* Gas and Slippage Settings */}
                    {(sourceChainId || destChainId) && (
                        <div className="gas-slippage-settings mt-3">
                            <h6>Transaction Settings</h6>
                            {sourceChainId && (() => {
                                const sourceGas = chainConfig.getGasSettings(sourceChainId);
                                const sourceSlippage = chainConfig.getSlippageTolerance(sourceChainId);
                                const sourceChain = chainConfig.getChain(sourceChainId);
                                
                                return (
                                    <div className="settings-group mb-2">
                                        <div className="settings-label">
                                            <strong>{sourceChain?.chainName || 'Source'} Chain:</strong>
                                        </div>
                                        <div className="settings-details">
                                            <div className="d-flex justify-content-between">
                                                <span>Gas Limit:</span>
                                                <span>{sourceGas.gasLimit?.toLocaleString() || 'Auto'}</span>
                                            </div>
                                            {sourceGas.gasPrice && (
                                                <div className="d-flex justify-content-between">
                                                    <span>Gas Price:</span>
                                                    <span>{sourceGas.gasPrice} gwei</span>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between">
                                                <span>Slippage:</span>
                                                <span>{sourceSlippage.default}% (min: {sourceSlippage.min}%, max: {sourceSlippage.max}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            {destChainId != null && (() => {
                                const destGas = chainConfig.getGasSettings(destChainId);
                                const destSlippage = chainConfig.getSlippageTolerance(destChainId);
                                const destChain = chainConfig.getChain(destChainId);
                                
                                return (
                                    <div className="settings-group">
                                        <div className="settings-label">
                                            <strong>{destChain?.chainName || 'Destination'} Chain:</strong>
                                        </div>
                                        <div className="settings-details">
                                            <div className="d-flex justify-content-between">
                                                <span>Gas Limit:</span>
                                                <span>{destGas.gasLimit?.toLocaleString() || 'Auto'}</span>
                                            </div>
                                            {destGas.gasPrice && (
                                                <div className="d-flex justify-content-between">
                                                    <span>Gas Price:</span>
                                                    <span>{destGas.gasPrice} gwei</span>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between">
                                                <span>Slippage:</span>
                                                <span>{destSlippage.default}% (min: {destSlippage.min}%, max: {destSlippage.max}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Fee Estimation */}
                    {estimate && (
                        <div className="fee-estimate mt-3">
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
                                {estimate.estimatedTime && (
                                    <div className="estimate-row">
                                        <span><Clock size={14} /> Estimated Time:</span>
                                        <span>{estimate.estimatedTime} seconds</span>
                                    </div>
                                )}
                                {sourceChainId && supportsWhitelist(sourceChainId) && (
                                    <WhitelistBadge className="mt-2" chainId={sourceChainId} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Swap Button */}
                    <Button
                        variant="primary"
                        className="w-100 mt-3"
                        onClick={handleSwap}
                        disabled={!canInitiateSwap || swapLoading}
                    >
                        {swapLoading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Processing...
                            </>
                        ) : (
                            'Initiate Swap'
                        )}
                    </Button>

                    {/* Swap Status/Progress */}
                    {swapStatus && (
                        <div className="mt-3">
                            <SwapProgress 
                                swapStatus={swapStatus} 
                                onCancel={cancelSwap}
                                onRequestRefund={swapStatus.status === 'failed' ? handleRequestRefund : null}
                            />
                        </div>
                    )}

                    {/* Errors */}
                    {swapError && (
                        <Alert 
                            variant="danger" 
                            className="mt-3"
                            data-testid="cross-chain-swap-error"
                            role="alert"
                        >
                            <strong>Swap Error:</strong>{' '}
                            {(() => {
                                const error = { message: swapError };
                                const formattedError = formatErrorForDisplay(error, sourceChainId || destChainId);
                                return formattedError.message;
                            })()}
                            <div className="mt-2">
                                <small>
                                    {(() => {
                                        const error = { message: swapError };
                                        const formattedError = formatErrorForDisplay(error, sourceChainId || destChainId);
                                        return formattedError.suggestion;
                                    })()}
                                </small>
                            </div>
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {/* Confirmation Modal */}
            <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Cross-Chain Swap</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="swap-details">
                        <div className="detail-row">
                            <span>From:</span>
                            <span>{chainConfig.getChain(sourceChainId)?.chainName || `Chain ${sourceChainId}`}</span>
                        </div>
                        <div className="detail-row">
                            <span>To:</span>
                            <span>{chainConfig.getChain(destChainId)?.chainName || `Chain ${destChainId}`}</span>
                        </div>
                        <div className="detail-row">
                            <span>Amount:</span>
                            <span>{amountIn}</span>
                        </div>
                        {estimate && (
                            <>
                                <div className="detail-row">
                                    <span>Estimated Fee:</span>
                                    <span>{estimate.totalFee || 'N/A'}</span>
                                </div>
                                {estimate.estimatedTime && (
                                    <div className="detail-row">
                                        <span>Estimated Time:</span>
                                        <span>{estimate.estimatedTime} seconds</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmation(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleInitiateSwap} disabled={swapLoading}>
                        {swapLoading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Processing...
                            </>
                        ) : (
                            'Confirm Swap'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Token Selection Modals */}
            <CallTokenList
                show={showTokenInModal}
                onHide={() => setShowTokenInModal(false)}
                onTokenSelect={handleTokenInSelect}
                chainInfo={chainInfo}
                filterByChainId={sourceChainId}
            />

            <CallTokenList
                show={showTokenOutModal}
                onHide={() => setShowTokenOutModal(false)}
                onTokenSelect={handleTokenOutSelect}
                chainInfo={chainInfo}
                filterByChainId={destChainId}
            />
        </div>
    );
};

export default CrossChainSwap;

