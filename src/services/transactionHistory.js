/**
 * Transaction History Service
 * Manages swap transaction history in localStorage
 */

const STORAGE_KEY = 'swapHistory';
const MAX_HISTORY_ITEMS = 1000; // Keep last 1000 transactions

/**
 * Get swap history from localStorage
 * @param {string} address - Optional: filter by address
 * @param {number} chainId - Optional: filter by chain
 * @returns {Array} Array of swap transactions
 */
export const getSwapHistory = (address = null, chainId = null) => {
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) return [];

        const history = JSON.parse(historyJson);
        
        let filtered = history;
        
        if (address) {
            filtered = filtered.filter(tx => 
                tx.userAddress?.toLowerCase() === address.toLowerCase()
            );
        }
        
        if (chainId) {
            filtered = filtered.filter(tx => tx.chainId === chainId);
        }
        
        // Sort by date (newest first)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.createdAt || 0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('Error reading swap history:', error);
        return [];
    }
};

/**
 * Save swap transaction to history
 * @param {Object} transaction - Transaction object
 * @param {string} transaction.txHash - Transaction hash
 * @param {string} transaction.userAddress - User address
 * @param {number} transaction.chainId - Chain ID
 * @param {string} transaction.tokenIn - Input token symbol
 * @param {string} transaction.tokenOut - Output token symbol
 * @param {string} transaction.amountIn - Input amount
 * @param {string} transaction.amountOut - Output amount
 * @param {string} transaction.status - Transaction status
 * @param {number} transaction.timestamp - Transaction timestamp
 * @returns {boolean} Success status
 */
export const saveSwapTransaction = (transaction) => {
    try {
        const history = getSwapHistory();
        
        // Check if transaction already exists
        const exists = history.some(tx => tx.txHash === transaction.txHash);
        if (exists) {
            // Update existing transaction
            const index = history.findIndex(tx => tx.txHash === transaction.txHash);
            history[index] = {
                ...history[index],
                ...transaction,
                updatedAt: new Date().toISOString(),
            };
        } else {
            // Add new transaction
            history.unshift({
                ...transaction,
                timestamp: transaction.timestamp || Date.now(),
                createdAt: transaction.createdAt || new Date().toISOString(),
            });
        }
        
        // Keep only last MAX_HISTORY_ITEMS
        if (history.length > MAX_HISTORY_ITEMS) {
            history.splice(MAX_HISTORY_ITEMS);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        return true;
    } catch (error) {
        console.error('Error saving swap transaction:', error);
        return false;
    }
};

/**
 * Update transaction status
 * @param {string} txHash - Transaction hash
 * @param {string} status - New status
 * @param {Object} updates - Additional fields to update
 * @returns {boolean} Success status
 */
export const updateSwapTransaction = (txHash, status, updates = {}) => {
    try {
        const history = getSwapHistory();
        const index = history.findIndex(tx => tx.txHash === txHash);
        
        if (index === -1) return false;
        
        history[index] = {
            ...history[index],
            status,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        return true;
    } catch (error) {
        console.error('Error updating swap transaction:', error);
        return false;
    }
};

/**
 * Clear swap history
 * @param {string} address - Optional: clear only for specific address
 * @returns {boolean} Success status
 */
export const clearSwapHistory = (address = null) => {
    try {
        if (address) {
            const history = getSwapHistory();
            const filtered = history.filter(tx => 
                tx.userAddress?.toLowerCase() !== address.toLowerCase()
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        return true;
    } catch (error) {
        console.error('Error clearing swap history:', error);
        return false;
    }
};

/**
 * Export swap history as JSON
 * @param {string} address - Optional: export only for specific address
 * @returns {string} JSON string
 */
export const exportSwapHistory = (address = null) => {
    const history = getSwapHistory(address);
    return JSON.stringify(history, null, 2);
};

/**
 * Import swap history from JSON
 * @param {string} jsonString - JSON string
 * @param {boolean} merge - If true, merge with existing history
 * @returns {boolean} Success status
 */
export const importSwapHistory = (jsonString, merge = false) => {
    try {
        const imported = JSON.parse(jsonString);
        if (!Array.isArray(imported)) {
            throw new Error('Invalid history format');
        }
        
        if (merge) {
            const existing = getSwapHistory();
            const combined = [...imported, ...existing];
            // Remove duplicates by txHash
            const unique = combined.filter((tx, index, self) =>
                index === self.findIndex(t => t.txHash === tx.txHash)
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        }
        
        return true;
    } catch (error) {
        console.error('Error importing swap history:', error);
        return false;
    }
};

export default {
    getSwapHistory,
    saveSwapTransaction,
    updateSwapTransaction,
    clearSwapHistory,
    exportSwapHistory,
    importSwapHistory,
};

