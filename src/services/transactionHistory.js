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
 * Save transaction to history (supports swaps, liquidity, staking, etc.)
 * @param {Object} transaction - Transaction object
 * @param {string} transaction.txHash - Transaction hash
 * @param {string} transaction.userAddress - User address
 * @param {number} transaction.chainId - Chain ID
 * @param {string} transaction.type - Transaction type ('swap', 'addLiquidity', 'removeLiquidity', 'stake', etc.)
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
 * Export swap history as CSV
 * @param {string} address - Optional: export only for specific address
 * @returns {string} CSV string
 */
export const exportSwapHistoryCSV = (address = null) => {
    const history = getSwapHistory(address);
    
    if (history.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'txHash',
        'userAddress',
        'chainId',
        'type',
        'tokenInSymbol',
        'tokenInAddress',
        'amountIn',
        'tokenOutSymbol',
        'tokenOutAddress',
        'amountOut',
        'status',
        'timestamp',
        'createdAt',
        'updatedAt',
        'confirmedAt'
    ];

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    // Build CSV rows
    const csvRows = [
        headers.join(','), // Header row
        ...history.map(tx => 
            headers.map(header => escapeCSV(tx[header] || '')).join(',')
        )
    ];

    return csvRows.join('\n');
};

/**
 * Import swap history from JSON
 * @param {string} jsonString - JSON string
 * @param {boolean} merge - If true, merge with existing history
 * @returns {Object} { success: boolean, message: string, count: number }
 */
export const importSwapHistory = (jsonString, merge = false) => {
    try {
        const imported = JSON.parse(jsonString);
        if (!Array.isArray(imported)) {
            return { success: false, message: 'Invalid history format: Expected an array', count: 0 };
        }
        
        // Validate transaction structure
        const validTransactions = imported.filter(tx => {
            return tx && typeof tx === 'object' && tx.txHash;
        });

        if (validTransactions.length === 0) {
            return { success: false, message: 'No valid transactions found in import', count: 0 };
        }

        if (validTransactions.length < imported.length) {
            console.warn(`Filtered out ${imported.length - validTransactions.length} invalid transactions`);
        }
        
        if (merge) {
            const existing = getSwapHistory();
            const combined = [...validTransactions, ...existing];
            // Remove duplicates by txHash
            const unique = combined.filter((tx, index, self) =>
                index === self.findIndex(t => t.txHash === tx.txHash)
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
            return { success: true, message: `Imported ${validTransactions.length} transactions (${unique.length} total)`, count: validTransactions.length };
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validTransactions));
            return { success: true, message: `Imported ${validTransactions.length} transactions`, count: validTransactions.length };
        }
    } catch (error) {
        console.error('Error importing swap history:', error);
        return { success: false, message: `Import failed: ${error.message}`, count: 0 };
    }
};

/**
 * Import swap history from CSV
 * @param {string} csvString - CSV string
 * @param {boolean} merge - If true, merge with existing history
 * @returns {Object} { success: boolean, message: string, count: number }
 */
export const importSwapHistoryCSV = (csvString, merge = false) => {
    try {
        if (!csvString || csvString.trim() === '') {
            return { success: false, message: 'Empty CSV file', count: 0 };
        }

        const lines = csvString.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            return { success: false, message: 'CSV file must contain at least a header and one data row', count: 0 };
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Required fields
        const requiredFields = ['txHash', 'userAddress', 'chainId'];
        const missingFields = requiredFields.filter(field => !headers.includes(field));
        if (missingFields.length > 0) {
            return { success: false, message: `Missing required fields: ${missingFields.join(', ')}`, count: 0 };
        }

        // Parse data rows
        const transactions = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const line = lines[i];
                const values = parseCSVLine(line);
                
                if (values.length !== headers.length) {
                    errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
                    continue;
                }

                const tx = {};
                headers.forEach((header, index) => {
                    let value = values[index] || '';
                    // Remove quotes if present
                    value = value.replace(/^"|"$/g, '').replace(/""/g, '"');
                    
                    // Convert numeric fields
                    if (header === 'chainId' || header === 'amountIn' || header === 'amountOut') {
                        const numValue = parseFloat(value);
                        tx[header] = isNaN(numValue) ? (header === 'chainId' ? null : value) : numValue;
                    } else {
                        tx[header] = value || null;
                    }
                });

                // Validate required fields
                if (!tx.txHash || !tx.userAddress || tx.chainId === null || tx.chainId === undefined) {
                    errors.push(`Row ${i + 1}: Missing required fields`);
                    continue;
                }

                // Set defaults
                tx.type = tx.type || 'swap';
                tx.status = tx.status || 'pending';
                tx.timestamp = tx.timestamp || Date.now();
                if (!tx.createdAt) {
                    tx.createdAt = new Date().toISOString();
                }

                transactions.push(tx);
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        if (transactions.length === 0) {
            return { 
                success: false, 
                message: `No valid transactions found. Errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`, 
                count: 0 
            };
        }

        if (errors.length > 0) {
            console.warn('CSV import errors:', errors);
        }

        // Merge or replace
        if (merge) {
            const existing = getSwapHistory();
            const combined = [...transactions, ...existing];
            // Remove duplicates by txHash
            const unique = combined.filter((tx, index, self) =>
                index === self.findIndex(t => t.txHash === tx.txHash)
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
            return { 
                success: true, 
                message: `Imported ${transactions.length} transactions (${unique.length} total)${errors.length > 0 ? `. ${errors.length} rows had errors` : ''}`, 
                count: transactions.length 
            };
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
            return { 
                success: true, 
                message: `Imported ${transactions.length} transactions${errors.length > 0 ? `. ${errors.length} rows had errors` : ''}`, 
                count: transactions.length 
            };
        }
    } catch (error) {
        console.error('Error importing CSV:', error);
        return { success: false, message: `Import failed: ${error.message}`, count: 0 };
    }
};

/**
 * Parse a CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of value
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add last value
    values.push(current);
    return values;
};

export default {
    getSwapHistory,
    saveSwapTransaction,
    updateSwapTransaction,
    clearSwapHistory,
    exportSwapHistory,
    exportSwapHistoryCSV,
    importSwapHistory,
    importSwapHistoryCSV,
};

