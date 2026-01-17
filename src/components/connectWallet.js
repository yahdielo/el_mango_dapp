import { Button } from 'react-bootstrap';
import { useAppKit } from '@reown/appkit/react';
import { useState, useEffect } from 'react';

/**
 * Check if TronLink wallet is available
 * @returns {boolean} True if TronLink is installed and ready
 */
export const isTronLinkAvailable = () => {
    if (typeof window === 'undefined') return false;
    return !!(window.tronWeb && window.tronWeb.ready);
};

/**
 * Get TronLink wallet address
 * @returns {string|null} Tron address or null
 */
export const getTronLinkAddress = () => {
    if (!isTronLinkAvailable()) return null;
    try {
        return window.tronWeb.defaultAddress.base58 || null;
    } catch (error) {
        console.error('Error getting TronLink address:', error);
        return null;
    }
};

/**
 * Connect TronLink wallet
 * @returns {Promise<string>} Tron address
 */
export const connectTronWallet = async () => {
    if (typeof window === 'undefined' || !window.tronWeb) {
        throw new Error('TronLink extension not found. Please install TronLink.');
    }

    try {
        // Request account access
        const accounts = await window.tronWeb.request({
            method: 'tron_requestAccounts'
        });

        if (accounts && accounts.length > 0) {
            return accounts[0];
        } else {
            throw new Error('No accounts returned from TronLink');
        }
    } catch (error) {
        console.error('Error connecting TronLink:', error);
        if (error.message) {
            throw error;
        }
        throw new Error('Failed to connect TronLink wallet');
    }
};

const ConnectWallet = ({ chain }) => {
    const { open } = useAppKit();
    const [hasTronLink, setHasTronLink] = useState(false);
    const [tronAddress, setTronAddress] = useState(null);

    // Check for TronLink on mount
    useEffect(() => {
        const checkTronLink = () => {
            const available = isTronLinkAvailable();
            setHasTronLink(available);
            if (available) {
                const addr = getTronLinkAddress();
                setTronAddress(addr);
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

        // Check periodically (TronLink might load after page load)
        const interval = setInterval(checkTronLink, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleConnectTron = async () => {
        try {
            const address = await connectTronWallet();
            setTronAddress(address);
            // You could emit an event or call a callback here
            console.log('TronLink connected:', address);
        } catch (error) {
            console.error('Failed to connect TronLink:', error);
            alert(error.message || 'Failed to connect TronLink wallet');
        }
    };

    return (
        <div>
            <Button
                className="w-100 mb-2"
                onClick={open}
                style={{
                    padding: '1rem',
                    fontSize: '1.5rem',
                    backgroundColor: '#F26E01', // Mango orange
                    borderColor: '#FFA500', // Match the border color
                    color: '#FFFFFF', // White text for contrast
                }}
            >
                Connect EVM Wallet
            </Button>
            
            {hasTronLink && (
                <Button
                    className="w-100"
                    onClick={handleConnectTron}
                    variant="outline-primary"
                    style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                    }}
                >
                    {tronAddress ? `Tron: ${tronAddress.slice(0, 6)}...${tronAddress.slice(-4)}` : 'Connect TronLink'}
                </Button>
            )}
        </div>
    );
};

export default ConnectWallet;
