/**
 * SwapProgress Component
 * 
 * Displays the progress of a cross-chain swap with status indicators,
 * estimated time remaining, transaction links, and cancel functionality.
 */

import React from 'react';
import { Card, ProgressBar, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { CheckCircle, XCircle, Clock, ArrowRight, BoxArrowUpRight } from 'react-bootstrap-icons';
import chainConfig from '../services/chainConfig';
import { trackConfirmations, formatEstimatedTime } from '../utils/confirmationTracking';
import { formatErrorForDisplay } from '../utils/chainErrors';
import './css/SwapProgress.css';

const STAGE_CONFIG = {
    pending: {
        label: 'Pending',
        variant: 'secondary',
        icon: <Clock size={16} />,
        progress: 0,
    },
    initiated: {
        label: 'Initiated',
        variant: 'info',
        icon: <Clock size={16} />,
        progress: 25,
    },
    deposited: {
        label: 'Deposited',
        variant: 'primary',
        icon: <ArrowRight size={16} />,
        progress: 50,
    },
    processing: {
        label: 'Processing',
        variant: 'warning',
        icon: <Spinner size="sm" />,
        progress: 75,
    },
    completed: {
        label: 'Completed',
        variant: 'success',
        icon: <CheckCircle size={16} />,
        progress: 100,
    },
    failed: {
        label: 'Failed',
        variant: 'danger',
        icon: <XCircle size={16} />,
        progress: 0,
    },
    cancelled: {
        label: 'Cancelled',
        variant: 'secondary',
        icon: <XCircle size={16} />,
        progress: 0,
    },
};

const SwapProgress = ({ swapStatus, onCancel, onRequestRefund, className = '' }) => {
    if (!swapStatus) {
        return null;
    }

    const status = swapStatus.status?.toLowerCase() || 'pending';
    const config = STAGE_CONFIG[status] || STAGE_CONFIG.pending;
    
    // Get confirmation tracking for source and destination chains
    const sourceConfirmations = swapStatus.sourceConfirmations || 0;
    const destConfirmations = swapStatus.destConfirmations || 0;
    const sourceChainId = swapStatus.sourceChainId;
    const destChainId = swapStatus.destChainId;
    
    const sourceTracking = sourceChainId ? trackConfirmations(sourceChainId, sourceConfirmations) : null;
    const destTracking = destChainId ? trackConfirmations(destChainId, destConfirmations) : null;

    const formatTime = (seconds) => {
        if (!seconds) return 'N/A';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    const getExplorerUrl = (chainId, txHash) => {
        if (!chainId || !txHash) return '#';
        try {
            return chainConfig.getExplorerUrl(chainId, txHash);
        } catch (error) {
            console.error('Error getting explorer URL:', error);
            return '#';
        }
    };

    return (
        <Card className={`swap-progress ${className}`}>
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        <span className="status-icon me-2">{config.icon}</span>
                        Swap Status: <Badge bg={config.variant}>{config.label}</Badge>
                    </h6>
                    {swapStatus.swapId && (
                        <small className="text-muted">ID: {swapStatus.swapId.slice(0, 8)}...</small>
                    )}
                </div>
            </Card.Header>
            <Card.Body>
                {/* Progress Bar */}
                {status !== 'failed' && status !== 'cancelled' && (
                    <div className="progress-section">
                        <ProgressBar 
                            now={config.progress} 
                            variant={config.variant}
                            animated={status === 'processing'}
                            className="mb-2"
                        />
                        <div className="progress-labels">
                            <span>Initiated</span>
                            <span>Deposited</span>
                            <span>Processing</span>
                            <span>Completed</span>
                        </div>
                    </div>
                )}

                {/* Confirmation Progress */}
                {(sourceTracking || destTracking) && (
                    <div className="confirmation-progress mt-3">
                        <h6>Transaction Confirmations</h6>
                        {sourceTracking && (
                            <div className="confirmation-item mb-2">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span>Source Chain ({chainConfig.getChain(sourceChainId)?.chainName || 'Unknown'})</span>
                                    <Badge bg={sourceTracking.status.variant}>
                                        {sourceTracking.current}/{sourceTracking.required}
                                    </Badge>
                                </div>
                                <ProgressBar 
                                    now={sourceTracking.progress} 
                                    variant={sourceTracking.status.variant}
                                    className="mb-1"
                                />
                                <small className="text-muted">
                                    {sourceTracking.status.message}
                                    {sourceTracking.estimatedTime > 0 && (
                                        <span className="ms-2">(~{sourceTracking.formattedEstimatedTime})</span>
                                    )}
                                </small>
                            </div>
                        )}
                        {destTracking && (
                            <div className="confirmation-item">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span>Destination Chain ({chainConfig.getChain(destChainId)?.chainName || 'Unknown'})</span>
                                    <Badge bg={destTracking.status.variant}>
                                        {destTracking.current}/{destTracking.required}
                                    </Badge>
                                </div>
                                <ProgressBar 
                                    now={destTracking.progress} 
                                    variant={destTracking.status.variant}
                                    className="mb-1"
                                />
                                <small className="text-muted">
                                    {destTracking.status.message}
                                    {destTracking.estimatedTime > 0 && (
                                        <span className="ms-2">(~{destTracking.formattedEstimatedTime})</span>
                                    )}
                                </small>
                            </div>
                        )}
                    </div>
                )}

                {/* Swap Details */}
                <div className="swap-details mt-3">
                    {swapStatus.sourceChainId && swapStatus.destChainId && (
                        <div className="detail-row">
                            <span>Route:</span>
                            <span>
                                Chain {swapStatus.sourceChainId} → Chain {swapStatus.destChainId}
                            </span>
                        </div>
                    )}

                    {swapStatus.amountIn && (
                        <div className="detail-row">
                            <span>Amount:</span>
                            <span>{swapStatus.amountIn}</span>
                        </div>
                    )}

                    {swapStatus.estimatedCompletion && (
                        <div className="detail-row">
                            <span>Estimated Completion:</span>
                            <span>
                                {new Date(swapStatus.estimatedCompletion).toLocaleTimeString()}
                            </span>
                        </div>
                    )}

                    {swapStatus.depositAddress && status === 'initiated' && (
                        <div className="detail-row">
                            <span>Deposit Address:</span>
                            <code className="deposit-address">{swapStatus.depositAddress.slice(0, 10)}...{swapStatus.depositAddress.slice(-8)}</code>
                        </div>
                    )}
                </div>

                {/* Transaction Links */}
                {(swapStatus.sourceTxHash || swapStatus.destTxHash) && (
                    <div className="tx-links mt-3">
                        <h6>Transaction Links</h6>
                        {swapStatus.sourceTxHash && swapStatus.sourceChainId && (
                            <div className="tx-link">
                                <span>Source:</span>
                                <a
                                    href={getExplorerUrl(swapStatus.sourceChainId, swapStatus.sourceTxHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ms-2"
                                >
                                    View on Explorer <BoxArrowUpRight size={12} />
                                </a>
                            </div>
                        )}
                        {swapStatus.destTxHash && swapStatus.destChainId && (
                            <div className="tx-link">
                                <span>Destination:</span>
                                <a
                                    href={getExplorerUrl(swapStatus.destChainId, swapStatus.destTxHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ms-2"
                                >
                                    View on Explorer <BoxArrowUpRight size={12} />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {status === 'failed' && swapStatus.errorMessage && (
                    <div className="error-message mt-3" data-testid="swap-progress-error">
                        <Alert variant="danger" role="alert">
                            <strong>Swap Failed:</strong>{' '}
                            {(() => {
                                // Format error using ChainConfigService
                                const error = { message: swapStatus.errorMessage };
                                const formattedError = formatErrorForDisplay(
                                    error, 
                                    swapStatus.sourceChainId || swapStatus.destChainId
                                );
                                return formattedError.message;
                            })()}
                            {swapStatus.errorMessage && (
                                <div className="mt-2">
                                    <small>
                                        {(() => {
                                            const error = { message: swapStatus.errorMessage };
                                            const formattedError = formatErrorForDisplay(
                                                error,
                                                swapStatus.sourceChainId || swapStatus.destChainId
                                            );
                                            return formattedError.suggestion;
                                        })()}
                                    </small>
                                </div>
                            )}
                            {swapStatus.refundStatus && (
                                <div className="mt-2">
                                    <Badge bg={swapStatus.refundStatus === 'approved' ? 'success' : swapStatus.refundStatus === 'pending' ? 'warning' : 'secondary'}>
                                        Refund: {swapStatus.refundStatus}
                                    </Badge>
                                    {swapStatus.refundTxHash && (
                                        <div className="mt-1">
                                            <small>
                                                Refund TX: {swapStatus.refundTxHash.slice(0, 10)}...{swapStatus.refundTxHash.slice(-8)}
                                            </small>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Alert>
                    </div>
                )}

                {/* Refund Request Button */}
                {status === 'failed' && onRequestRefund && !swapStatus.refundStatus && (
                    <Button
                        variant="outline-warning"
                        size="sm"
                        className="mt-3"
                        onClick={onRequestRefund}
                    >
                        Request Refund
                    </Button>
                )}

                {/* Cancel Button */}
                {(status === 'initiated' || status === 'pending') && onCancel && (
                    <Button
                        variant="outline-danger"
                        size="sm"
                        className="mt-3"
                        onClick={() => onCancel(swapStatus.swapId)}
                    >
                        <XCircle size={16} className="me-1" />
                        Cancel Swap
                    </Button>
                )}

                {/* Success Message */}
                {status === 'completed' && (
                    <div className="success-message mt-3">
                        <Alert variant="success">
                            <CheckCircle size={20} className="me-2" />
                            Swap completed successfully!
                        </Alert>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default SwapProgress;

