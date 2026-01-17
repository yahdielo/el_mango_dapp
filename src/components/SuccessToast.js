/**
 * SuccessToast Component
 * 
 * Displays success messages as toast notifications for completed actions.
 */

import React, { useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { CheckCircle } from 'react-bootstrap-icons';

const SuccessToast = ({ message, onClose, autoClose = 3000, title = 'Success' }) => {
    useEffect(() => {
        if (message && autoClose > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, autoClose);
            return () => clearTimeout(timer);
        }
    }, [message, autoClose, onClose]);

    if (!message) return null;

    return (
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
            <Toast
                show={!!message}
                onClose={onClose}
                bg="success"
                delay={autoClose}
                autohide={autoClose > 0}
            >
                <Toast.Header className="bg-success text-white">
                    <CheckCircle size={20} className="text-white" />
                    <strong className="me-auto ms-2">{title}</strong>
                </Toast.Header>
                <Toast.Body className="text-white">
                    {message}
                </Toast.Body>
            </Toast>
        </ToastContainer>
    );
};

export default SuccessToast;

