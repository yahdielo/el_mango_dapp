/**
 * NetworkWarning Component
 * 
 * Displays network mismatch warnings and provides one-click network switching.
 * Handles network switching errors and maintains state during switch.
 */

import React, { useState, useEffect } from 'react';
import { Alert, Button, Spinner, Badge } from 'react-bootstrap';
import { ExclamationTriangle, CheckCircle, XCircle, ArrowRight } from 'react-bootstrap-icons';
import { useNetworkDetection } from '../hooks/useNetworkDetection';
import chainConfig from '../services/chainConfig';
import './css/NetworkWarning.css';

const NetworkWarning = ({ 
    requiredChainId, 
    onNetworkSwitch,
    className = '',
    showOnlyWhenMismatch = true,
    autoSwitch = false,
}) => {
    const {
        currentChainId,
        currentChain,
        requiredChain,
        isMismatch,
        isSupported,
        isConnected,
        isChecking,
        error,
        switchToRequiredNetwork,
    } = useNetworkDetection(requiredChainId);

    const [isAutoSwitching, setIsAutoSwitching] = useState(false);
    const [hasAttemptedAutoSwitch, setHasAttemptedAutoSwitch] = useState(false);

    // Auto-switch if enabled and mismatch detected
    useEffect(() => {
        if (autoSwitch && isMismatch && isSupported && isConnected && !hasAttemptedAutoSwitch && !isChecking) {
            setIsAutoSwitching(true);
            setHasAttemptedAutoSwitch(true);
            
            switchToRequiredNetwork().then((success) => {
                setIsAutoSwitching(false);
                if (success && onNetworkSwitch) {
                    onNetworkSwitch(requiredChainId);
                }
            }).catch(() => {
                setIsAutoSwitching(false);
            });
        }
    }, [autoSwitch, isMismatch, isSupported, isConnected, hasAttemptedAutoSwitch, isChecking, switchToRequiredNetwork, requiredChainId, onNetworkSwitch]);

    // Reset auto-switch attempt when chain changes
    useEffect(() => {
        if (!isMismatch) {
            setHasAttemptedAutoSwitch(false);
        }
    }, [isMismatch]);

    // Don't show if no mismatch and showOnlyWhenMismatch is true
    if (!isMismatch && showOnlyWhenMismatch) {
        return null;
    }

    // Don't show if wallet not connected
    if (!isConnected) {
        return null;
    }

    // Don't show if required chain not specified
    if (!requiredChainId) {
        return null;
    }

    // Show error if chain not supported
    if (!isSupported) {
        return (
            <Alert variant="danger" className={`network-warning ${className}`}>
                <XCircle className="me-2" />
                <strong>Unsupported Network</strong>
                <p className="mb-0 mt-2">
                    Chain ID {requiredChainId} is not supported.
                </p>
            </Alert>
        );
    }

    const handleSwitch = async () => {
        const success = await switchToRequiredNetwork();
        if (success && onNetworkSwitch) {
            onNetworkSwitch(requiredChainId);
        }
    };

    // Show success message when on correct network
    if (!isMismatch) {
        return (
            <Alert variant="success" className={`network-warning ${className}`}>
                <CheckCircle className="me-2" />
                <strong>Connected to {requiredChain?.chainName || `Chain ${requiredChainId}`}</strong>
            </Alert>
        );
    }

    return (
        <Alert variant="warning" className={`network-warning ${className}`}>
            <div className="d-flex align-items-start">
                <ExclamationTriangle className="me-2 mt-1" size={20} />
                <div className="flex-grow-1">
                    <strong>Wrong Network Detected</strong>
                    <div className="network-info mt-2">
                        <div className="network-row">
                            <span className="label">Current Network:</span>
                            <Badge bg="secondary" className="ms-2">
                                {currentChain?.chainName || `Chain ${currentChainId}`}
                            </Badge>
                        </div>
                        <div className="network-row mt-2">
                            <span className="label">Required Network:</span>
                            <Badge bg="primary" className="ms-2">
                                {requiredChain?.chainName || `Chain ${requiredChainId}`}
                            </Badge>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message mt-2">
                            <XCircle size={14} className="me-1" />
                            <small className="text-danger">{error}</small>
                        </div>
                    )}

                    <div className="mt-3">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSwitch}
                            disabled={isChecking || isAutoSwitching}
                        >
                            {isChecking || isAutoSwitching ? (
                                <>
                                    <Spinner size="sm" className="me-2" animation="border" />
                                    Switching Network...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="me-2" size={14} />
                                    Switch to {requiredChain?.chainName || `Chain ${requiredChainId}`}
                                </>
                            )}
                        </Button>
                    </div>

                    {requiredChain?.img && (
                        <div className="chain-icon mt-2">
                            <img 
                                src={requiredChain.img} 
                                alt={requiredChain.chainName}
                                className="chain-icon-img"
                            />
                        </div>
                    )}
                </div>
            </div>
        </Alert>
    );
};

export default NetworkWarning;

