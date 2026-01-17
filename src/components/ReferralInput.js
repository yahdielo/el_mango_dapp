/**
 * ReferralInput Component
 * 
 * Allows users to input and validate a referrer address for swaps.
 * Provides address validation, verification, and referral status display.
 */

import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { CheckCircle, XCircle, Copy, Person } from 'react-bootstrap-icons';
import { isAddress } from 'viem';
import { supportsReferralSystem, getFeatureMessage, FEATURE_FLAGS } from '../utils/featureFlags';
import chainConfig from '../services/chainConfig';
import './css/ReferralInput.css';

const ReferralInput = ({ 
    value = '', 
    onChange, 
    onValidate,
    chainId,
    className = '' 
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [isValid, setIsValid] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [canUseReferrer, setCanUseReferrer] = useState(false);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const validateAddress = async (address) => {
        if (!address) {
            setIsValid(null);
            setValidationMessage('');
            return;
        }

        // Basic address format validation
        if (!isAddress(address)) {
            setIsValid(false);
            setValidationMessage('Invalid address format');
            return;
        }

        // Check if address is zero address
        if (address === '0x0000000000000000000000000000000000000000') {
            setIsValid(false);
            setValidationMessage('Cannot use zero address as referrer');
            return;
        }

        setIsValidating(true);
        
        try {
            // Here you could add additional validation like checking if referrer exists
            // For now, we'll just validate format
            setIsValid(true);
            setValidationMessage('Valid referrer address');
            setCanUseReferrer(true);
            
            if (onValidate) {
                onValidate(address, true);
            }
        } catch (error) {
            setIsValid(false);
            setValidationMessage('Error validating address');
            setCanUseReferrer(false);
            
            if (onValidate) {
                onValidate(address, false);
            }
        } finally {
            setIsValidating(false);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        
        if (onChange) {
            onChange(newValue);
        }
        
        // Validate as user types (with debounce could be better)
        if (newValue.length === 42) {
            validateAddress(newValue);
        } else {
            setIsValid(null);
            setValidationMessage('');
        }
    };

    const handleUseMyAddress = () => {
        // This would get the connected wallet address
        // For now, placeholder - would need to be passed as prop or from wagmi hook
        if (onChange) {
            // Would set to connected address
            // onChange(connectedAddress);
        }
    };

    const handlePaste = async (e) => {
        const pastedText = await navigator.clipboard.readText();
        if (pastedText && isAddress(pastedText)) {
            setInputValue(pastedText);
            if (onChange) {
                onChange(pastedText);
            }
            validateAddress(pastedText);
        }
    };

    // Check if referral system is supported for this chain
    const isReferralSupported = chainId ? supportsReferralSystem(chainId) : true;
    const chain = chainId ? chainConfig.getChain(chainId) : null;
    const chainName = chain?.chainName || 'this chain';
    const isReferralContractDeployed = chainId ? chainConfig.isReferralContractDeployed(chainId) : false;

    // If referral system is not supported, show message and disable input
    if (chainId && !isReferralSupported) {
        return (
            <div className={`referral-input ${className}`} data-testid="referral-input">
                <Alert variant="info" style={{ fontSize: '0.875rem' }}>
                    <Person className="me-2" />
                    {getFeatureMessage(chainId, FEATURE_FLAGS.REFERRAL_SYSTEM)}
                </Alert>
            </div>
        );
    }

    // If referral system is supported but contract not deployed, show info message
    if (chainId && isReferralSupported && !isReferralContractDeployed) {
        return (
            <div className={`referral-input ${className}`} data-testid="referral-input">
                <Alert variant="warning" style={{ fontSize: '0.875rem' }}>
                    <Person className="me-2" />
                    Referral system is supported on {chainName}, but the referral contract is not yet deployed. 
                    Referral input will be available once the contract is deployed.
                </Alert>
            </div>
        );
    }

    return (
        <div className={`referral-input ${className}`} data-testid="referral-input">
            <Form.Label>
                <Person className="me-2" />
                Referrer Address (Optional)
            </Form.Label>
            
            <InputGroup>
                <Form.Control
                    type="text"
                    placeholder="0x..."
                    value={inputValue}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
                    isValid={isValid === true}
                    isInvalid={isValid === false}
                    disabled={isValidating || !isReferralSupported}
                />
                <Button 
                    variant="outline-secondary" 
                    onClick={handlePaste}
                    title="Paste from clipboard"
                >
                    <Copy size={14} />
                </Button>
                {isValidating && (
                    <InputGroup.Text>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </InputGroup.Text>
                )}
                {isValid === true && (
                    <InputGroup.Text className="text-success">
                        <CheckCircle size={16} />
                    </InputGroup.Text>
                )}
                {isValid === false && (
                    <InputGroup.Text className="text-danger">
                        <XCircle size={16} />
                    </InputGroup.Text>
                )}
            </InputGroup>

            {validationMessage && (
                <Form.Text className={isValid ? 'text-success' : 'text-danger'}>
                    {validationMessage}
                </Form.Text>
            )}

            {isValid && canUseReferrer && (
                <Alert variant="success" className="mt-2 mb-0">
                    <CheckCircle size={16} className="me-2" />
                    Valid referrer address. You'll earn rewards when your referrer makes swaps!
                </Alert>
            )}

            {chainId && isReferralSupported && (
                <Form.Text className="text-muted d-block mt-1">
                    Referral will be synced across all supported chains
                </Form.Text>
            )}
        </div>
    );
};

export default ReferralInput;


