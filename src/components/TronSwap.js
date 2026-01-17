/**
 * TronSwap Component
 * 
 * Tron-specific swap component for handling swaps on the Tron network.
 * Supports TronLink wallet connection, transaction signing, and explorer links.
 */

import React, { useState, useCallback } from 'react';
import { Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { BoxArrowUpRight, Wallet, CheckCircle, XCircle } from 'react-bootstrap-icons';
import { mangoApi } from '../services/mangoApi';
import chainConfig from '../services/chainConfig';
import { formatErrorForDisplay } from '../utils/chainErrors';
import TronAddressInput from './TronAddressInput';
import './css/TronSwap.css';

const TRON_CHAIN_ID = 728126428;

/**
 * Check if TronLink is available
 */
const isTronLinkAvailable = () => {
    return typeof window !== 'undefined' && window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58;
};

/**
 * Get TronLink address
 */
const getTronLinkAddress = () => {
    if (isTronLinkAvailable()) {
        return window.tronWeb.defaultAddress.base58;
    }
    return null;
};

/**
 * Connect TronLink wallet
 */
const connectTronWallet = async () => {
    if (!window.tronWeb) {
        throw new Error('TronLink not installed. Please install TronLink extension.');
    }

    if (window.tronWeb.ready) {
        return window.tronWeb.defaultAddress.base58;
    }

    // Request connection
    try {
        await window.tronWeb.request({
            method: 'tron_requestAccounts',
        });
        return window.tronWeb.defaultAddress.base58;
    } catch (error) {
        throw new Error('Failed to connect TronLink wallet');
    }
};

const TronSwap = ({ className = '' }) => {
    const [tokenIn, setTokenIn] = useState('');
    const [tokenOut, setTokenOut] = useState('');
    const [amountIn, setAmountIn] = useState('');
    const [amountOutMin, setAmountOutMin] = useState('');
    const [recipient, setRecipient] = useState('');
    const [tronAddress, setTronAddress] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSwapping, setIsSwapping] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [recipientError, setRecipientError] = useState(null);

    // Check TronLink on mount
    React.useEffect(() => {
        const checkTronLink = () => {
            const available = isTronLinkAvailable();
            setIsConnected(available);
            if (available) {
                const addr = getTronLinkAddress();
                setTronAddress(addr);
                setRecipient(addr);
            }
        };

        checkTronLink();

        // Listen for TronLink account changes
        if (window.tronWeb) {
            window.addEventListener('message', (e) => {
                if (e.data && e.data.message && e.data.message.action === 'setAccount') {
                    checkTronLink();
                }
            });
        }

        // Check periodically
        const interval = setInterval(checkTronLink, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        try {
            const address = await connectTronWallet();
            setTronAddress(address);
            setRecipient(address);
            setIsConnected(true);
            setError(null);
        } catch (err) {
            // Use standardized error formatting
            const formattedError = formatErrorForDisplay(err, TRON_CHAIN_ID);
            setError(formattedError.message || 'Failed to connect TronLink');
        }
    };

    const handleSwap = async () => {
        if (!isConnected || !tronAddress) {
            setError('Please connect TronLink wallet first');
            return;
        }

        if (!tokenIn || !tokenOut || !amountIn || !amountOutMin || !recipient) {
            setError('Please fill in all fields');
            return;
        }

        // Validate recipient address
        if (!chainConfig.validateAddress(TRON_CHAIN_ID, recipient)) {
            // Use standardized error formatting
            const formattedError = formatErrorForDisplay(
                new Error('Invalid recipient address'), 
                TRON_CHAIN_ID
            );
            setError(formattedError.message);
            return;
        }

        setIsSwapping(true);
        setError(null);
        setSuccess(false);
        setTxHash(null);

        try {
            const result = await mangoApi.tron.signAndExecuteTronSwap({
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMin,
                recipient,
            });

            if (result.success && result.txHash) {
                setTxHash(result.txHash);
                setSuccess(true);
                setError(null);
            } else {
                throw new Error('Swap failed');
            }
        } catch (err) {
            // Use standardized error formatting
            const formattedError = formatErrorForDisplay(err, TRON_CHAIN_ID);
            setError(formattedError.message || 'Swap failed');
            setSuccess(false);
        } finally {
            setIsSwapping(false);
        }
    };

    const getExplorerUrl = (hash) => {
        return chainConfig.getExplorerUrl(TRON_CHAIN_ID, hash);
    };

    const chain = chainConfig.getChain(TRON_CHAIN_ID);

    return (
        <Card className={`tron-swap ${className}`}>
            <Card.Header>
                <div className="d-flex align-items-center justify-content-between">
                    <h5 className="mb-0">
                        <Badge bg="info" className="me-2">TRON</Badge>
                        Tron Swap
                    </h5>
                    {chain && (
                        <Badge bg="success">Chain ID: {chain.chainId}</Badge>
                    )}
                </div>
            </Card.Header>
            <Card.Body>
                {/* TronLink Connection */}
                {!isConnected ? (
                    <Alert 
                        variant="warning" 
                        className="mb-3"
                        data-testid="tron-swap-connection-prompt"
                        role="alert"
                    >
                        <Wallet className="me-2" />
                        <strong>TronLink Required</strong>
                        <p className="mb-0 mt-2">
                            Please install and connect TronLink to use Tron swaps.
                        </p>
                        <Button
                            variant="primary"
                            className="mt-2"
                            onClick={handleConnect}
                            disabled={!window.tronWeb}
                            data-testid="tron-swap-connect-button"
                        >
                            <Wallet className="me-2" />
                            Connect TronLink
                        </Button>
                    </Alert>
                ) : (
                    <Alert 
                        variant="success" 
                        className="mb-3"
                        data-testid="tron-swap-connected-status"
                        role="alert"
                    >
                        <CheckCircle className="me-2" />
                        <strong>Connected:</strong> {tronAddress}
                    </Alert>
                )}

                {/* Token Input */}
                <Form.Group className="mb-3">
                    <Form.Label>Token In Address</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="TRX or token contract address"
                        value={tokenIn}
                        onChange={(e) => setTokenIn(e.target.value)}
                        disabled={!isConnected || isSwapping}
                        data-testid="tron-swap-token-in-input"
                    />
                    <Form.Text className="text-muted">
                        Enter TRX (native) or token contract address
                    </Form.Text>
                </Form.Group>

                {/* Token Output */}
                <Form.Group className="mb-3">
                    <Form.Label>Token Out Address</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Token contract address"
                        value={tokenOut}
                        onChange={(e) => setTokenOut(e.target.value)}
                        disabled={!isConnected || isSwapping}
                        data-testid="tron-swap-token-out-input"
                    />
                    <Form.Text className="text-muted">
                        Enter token contract address to receive
                    </Form.Text>
                </Form.Group>

                {/* Amount Input */}
                <Form.Group className="mb-3">
                    <Form.Label>Amount In</Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="0.0"
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        disabled={!isConnected || isSwapping}
                        step="any"
                        min="0"
                        data-testid="tron-swap-amount-in-input"
                    />
                    <Form.Text className="text-muted">
                        Amount to swap (in smallest unit, e.g., sun for TRX)
                    </Form.Text>
                </Form.Group>

                {/* Minimum Amount Out */}
                <Form.Group className="mb-3">
                    <Form.Label>Minimum Amount Out (Slippage Protection)</Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="0.0"
                        value={amountOutMin}
                        onChange={(e) => setAmountOutMin(e.target.value)}
                        disabled={!isConnected || isSwapping}
                        step="any"
                        min="0"
                        data-testid="tron-swap-amount-out-min-input"
                    />
                    <Form.Text className="text-muted">
                        Minimum amount to receive (slippage protection)
                    </Form.Text>
                </Form.Group>

                {/* Recipient Address */}
                <TronAddressInput
                    label="Recipient Address"
                    value={recipient}
                    onChange={(value) => {
                        setRecipient(value);
                        setRecipientError(null);
                    }}
                    onBlur={() => {
                        if (recipient && !chainConfig.validateAddress(TRON_CHAIN_ID, recipient)) {
                            const errorMsg = chainConfig.getErrorMessage(TRON_CHAIN_ID, 'invalidAddress');
                            setRecipientError(errorMsg);
                        } else {
                            setRecipientError(null);
                        }
                    }}
                    placeholder="Enter Tron address (T...)"
                    className="mb-3"
                    error={recipientError}
                />

                {/* Error Display */}
                {error && (
                    <Alert 
                        variant="danger" 
                        className="mb-3"
                        data-testid="tron-swap-error"
                        role="alert"
                    >
                        <XCircle className="me-2" />
                        <strong>Error:</strong> {error}
                    </Alert>
                )}

                {/* Success Display */}
                {success && txHash && (
                    <Alert 
                        variant="success" 
                        className="mb-3"
                        data-testid="tron-swap-success"
                        role="alert"
                    >
                        <CheckCircle className="me-2" />
                        <strong>Swap Successful!</strong>
                        <div className="mt-2">
                            <a
                                href={getExplorerUrl(txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-decoration-underline"
                            >
                                View on TronScan <BoxArrowUpRight size={14} className="ms-1" />
                            </a>
                        </div>
                    </Alert>
                )}

                {/* Swap Button */}
                <Button
                    variant="primary"
                    className="w-100"
                    onClick={handleSwap}
                    disabled={!isConnected || isSwapping || !tokenIn || !tokenOut || !amountIn || !amountOutMin || !recipient || parseFloat(amountIn) <= 0 || parseFloat(amountOutMin) <= 0 || !!recipientError}
                    data-testid="tron-swap-execute-button"
                >
                    {isSwapping ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Processing Swap...
                        </>
                    ) : (
                        <>
                            <BoxArrowUpRight className="me-2" />
                            Execute Swap
                        </>
                    )}
                </Button>

                {/* Info */}
                <Alert variant="info" className="mt-3 mb-0">
                    <strong>Note:</strong> This swap uses TronLink for transaction signing.
                    Make sure TronLink is installed and connected before proceeding.
                </Alert>
            </Card.Body>
        </Card>
    );
};

export default TronSwap;

