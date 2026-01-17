/**
 * ErrorToast Component
 * 
 * Displays error messages as toast notifications with user-friendly messages
 * and recovery suggestions.
 * Uses ChainConfigService for chain-specific error messages.
 */

import React, { useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { XCircle, ExclamationTriangle } from 'react-bootstrap-icons';
import chainConfig from '../services/chainConfig';
import { formatErrorForDisplay } from '../utils/chainErrors';

const ErrorToast = ({ error, onClose, autoClose = 5000, chainId = null }) => {
    useEffect(() => {
        if (error && autoClose > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, autoClose);
            return () => clearTimeout(timer);
        }
    }, [error, autoClose, onClose]);

    if (!error) return null;

    // Format error message using chainErrors utility and ChainConfigService
    const formattedError = formatErrorForDisplay(error, chainId);
    const errorMessage = formattedError.message || error.message || 'An error occurred';
    const errorTitle = formattedError.title || error.title || 'Error';
    const errorSuggestion = formattedError.suggestion || error.suggestion || formattedError.recoverySuggestion;

    const getErrorIcon = () => {
        if (error.severity === 'critical') {
            return <XCircle size={20} className="text-danger" />;
        }
        return <ExclamationTriangle size={20} className="text-warning" />;
    };

    const getErrorVariant = () => {
        if (error.severity === 'critical') return 'danger';
        if (error.severity === 'warning') return 'warning';
        return 'danger';
    };

    return (
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
            <Toast
                show={!!error}
                onClose={onClose}
                bg={getErrorVariant()}
                delay={autoClose}
                autohide={autoClose > 0}
            >
                <Toast.Header className={`bg-${getErrorVariant()} text-white`}>
                    {getErrorIcon()}
                    <strong className="me-auto ms-2">Error</strong>
                </Toast.Header>
                <Toast.Body className="text-white">
                    <div>
                        <strong>{errorTitle}</strong>
                        <p className="mb-0 mt-1">{errorMessage}</p>
                        {errorSuggestion && (
                            <small className="d-block mt-2 opacity-75">
                                <strong>Tip:</strong> {errorSuggestion}
                            </small>
                        )}
                        {chainId && (
                            <small className="d-block mt-1 opacity-75" style={{ fontSize: '0.75rem' }}>
                                Chain: {chainConfig.getChain(chainId)?.chainName || `Chain ${chainId}`}
                            </small>
                        )}
                    </div>
                </Toast.Body>
            </Toast>
        </ToastContainer>
    );
};

export default ErrorToast;

