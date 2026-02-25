/**
 * Input validation utilities
 */

/**
 * Validate and sanitize amount input: numbers and decimal only, max decimals from token
 * @param {string} value - Raw input value
 * @param {number} [maxDecimals=18] - Max decimal places from token
 * @returns {string} Sanitized value safe for display/parsing
 */
export function sanitizeAmountInput(value, maxDecimals = 18) {
  if (value == null || typeof value !== 'string') return '';
  // Allow only digits and a single decimal point
  let sanitized = value.replace(/[^0-9.]/g, '');
  // Prevent multiple decimal points
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  // Enforce max decimals
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    sanitized = parts[0] + '.' + parts[1].slice(0, maxDecimals);
  }
  return sanitized;
}

/**
 * Basic EVM address format check (0x + 40 hex chars)
 * @param {string} addr
 * @returns {boolean}
 */
export function isValidEvmAddress(addr) {
  if (!addr || typeof addr !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}
