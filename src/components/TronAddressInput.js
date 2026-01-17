/**
 * TronAddressInput Component
 * 
 * Allows users to input and validate a Tron address (Base58 format).
 * Provides real-time validation (client-side regex + server-side),
 * validation feedback, and loading states.
 * Uses ChainConfigService for validation and error messages.
 */

import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { CheckCircle, XCircle, Copy } from 'react-bootstrap-icons';
import { mangoApi } from '../services/mangoApi';
import chainConfig from '../services/chainConfig';
import './css/ReferralInput.css'; // Reuse styles

// Tron chain ID
const TRON_CHAIN_ID = 728126428;

const TronAddressInput = ({ 
    value = '', 
    onChange, 
    onBlur,
    onValidate,
    error,
    className = '',
    placeholder = 'Enter Tron address (T...)',
    label = 'Tron Address'
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [isValid, setIsValid] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    /**
     * Basic client-side validation using ChainConfigService
     */
    const validateFormat = (address) => {
        if (!address) return false;
        return chainConfig.validateAddress(TRON_CHAIN_ID, address);
    };

    /**
     * Server-side validation
     */
    const validateWithServer = async (address) => {
        try {
            setIsValidating(true);
            const result = await mangoApi.tron.validateTronAddress(address);
            
            if (result.isValid) {
                setIsValid(true);
                setValidationMessage('Valid Tron address');
                if (onValidate) {
                    onValidate(address, true);
                }
                return true;
            } else {
                setIsValid(false);
                setValidationMessage('Invalid Tron address');
                if (onValidate) {
                    onValidate(address, false);
                }
                return false;
            }
        } catch (error) {
            console.error('Error validating Tron address:', error);
            setIsValid(false);
            const errorMsg = chainConfig.getErrorMessage(TRON_CHAIN_ID, 'invalidAddress');
            setValidationMessage(errorMsg || 'Error validating address. Please try again.');
            if (onValidate) {
                onValidate(address, false);
            }
            return false;
        } finally {
            setIsValidating(false);
        }
    };

    const handleInputChange = async (e) => {
        const newValue = e.target.value.trim();
        setInputValue(newValue);
        
        if (onChange) {
            onChange(newValue);
        }
        
        // Clear validation state if input is empty
        if (newValue.length === 0) {
            setIsValid(null);
            setValidationMessage('');
            if (onValidate) {
                onValidate(newValue, null);
            }
            return;
        }

        // Quick format check
        const formatValid = validateFormat(newValue);
        
        if (!formatValid) {
            setIsValid(false);
            const errorMsg = chainConfig.getErrorMessage(TRON_CHAIN_ID, 'invalidAddress');
            setValidationMessage(errorMsg || 'Invalid Tron address format (must start with T and be 34 characters)');
            if (onValidate) {
                onValidate(newValue, false);
            }
            return;
        }

        // Server-side validation for complete addresses
        if (newValue.length === 34) {
            await validateWithServer(newValue);
        } else {
            // Still typing, only format check
            setIsValid(null);
            setValidationMessage('');
        }
    };

    const handlePaste = async (e) => {
        try {
            const pastedText = await navigator.clipboard.readText();
            const trimmedText = pastedText.trim();
            
            if (trimmedText && validateFormat(trimmedText)) {
                setInputValue(trimmedText);
                if (onChange) {
                    onChange(trimmedText);
                }
                if (trimmedText.length === 34) {
                    await validateWithServer(trimmedText);
                }
            } else {
                setIsValid(false);
                setValidationMessage('Invalid Tron address format');
            }
        } catch (error) {
            console.error('Error pasting address:', error);
        }
    };

    return (
        <div className={`tron-address-input ${className}`}>
            <Form.Label>
                {label}
            </Form.Label>
            
            <InputGroup>
                <Form.Control
                    type="text"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                        if (onBlur) {
                            onBlur();
                        }
                        if (inputValue && !validateFormat(inputValue)) {
                            setIsValid(false);
                            const errorMsg = chainConfig.getErrorMessage(TRON_CHAIN_ID, 'invalidAddress');
                            setValidationMessage(errorMsg || 'Invalid Tron address format');
                        }
                    }}
                    maxLength={34}
                    isValid={isValid === true && !error}
                    isInvalid={isValid === false || !!error}
                    disabled={isValidating}
                    style={{ fontFamily: 'monospace' }}
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
                {isValid === true && !isValidating && (
                    <InputGroup.Text className="text-success">
                        <CheckCircle size={16} />
                    </InputGroup.Text>
                )}
                {isValid === false && !isValidating && (
                    <InputGroup.Text className="text-danger">
                        <XCircle size={16} />
                    </InputGroup.Text>
                )}
            </InputGroup>

            {error && (
                <Form.Text className="text-danger">
                    {error}
                </Form.Text>
            )}
            {!error && validationMessage && (
                <Form.Text className={isValid ? 'text-success' : 'text-danger'}>
                    {validationMessage}
                </Form.Text>
            )}

            {isValid && (
                <Alert variant="success" className="mt-2 mb-0">
                    <CheckCircle size={16} className="me-2" />
                    Valid Tron address
                </Alert>
            )}

            <Form.Text className="text-muted d-block mt-1">
                Tron addresses start with 'T' and are 34 characters long (Base58 format)
            </Form.Text>
        </div>
    );
};

export default TronAddressInput;

