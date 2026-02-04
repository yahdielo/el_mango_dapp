/**
 * Referral WebSocket Service
 * 
 * Provides real-time updates for referral events via WebSocket
 */

class ReferralWebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        this.listeners = new Map();
        this.isConnecting = false;
        this.address = null;
    }

    /**
     * Get WebSocket URL from environment or use default
     */
    getWebSocketUrl() {
        const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.mango-defi.com/ws';
        return wsUrl;
    }

    /**
     * Connect to WebSocket server
     * @param {string} address - User wallet address
     */
    connect(address) {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        if (!address) {
            console.warn('Cannot connect WebSocket: no address provided');
            return;
        }

        this.address = address;
        this.isConnecting = true;

        try {
            const wsUrl = `${this.getWebSocketUrl()}?address=${address}&channel=referrals`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Referral WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.notifyListeners('connected', { address });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
                this.notifyListeners('error', { error });
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed');
                this.isConnecting = false;
                this.ws = null;
                this.notifyListeners('disconnected', {});
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('Error connecting WebSocket:', error);
            this.isConnecting = false;
            this.notifyListeners('error', { error });
        }
    }

    /**
     * Attempt to reconnect to WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        setTimeout(() => {
            if (this.address) {
                console.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`);
                this.connect(this.address);
            }
        }, this.reconnectDelay);
    }

    /**
     * Handle incoming WebSocket messages
     * @param {Object} data - Message data
     */
    handleMessage(data) {
        const { type, payload } = data;

        switch (type) {
            case 'new_referral':
                this.notifyListeners('new_referral', payload);
                break;
            case 'referral_update':
                this.notifyListeners('referral_update', payload);
                break;
            case 'reward_earned':
                this.notifyListeners('reward_earned', payload);
                break;
            case 'ping':
                // Respond to ping with pong
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'pong' }));
                }
                break;
            default:
                console.warn('Unknown WebSocket message type:', type);
        }
    }

    /**
     * Subscribe to WebSocket events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Notify all listeners of an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    notifyListeners(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in WebSocket listener:', error);
                }
            });
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.address = null;
        this.reconnectAttempts = 0;
        this.isConnecting = false;
    }

    /**
     * Check if WebSocket is connected
     * @returns {boolean}
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
export const referralWebSocket = new ReferralWebSocketService();

export default referralWebSocket;

