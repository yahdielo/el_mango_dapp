/**
 * Format raw token balance for display
 * @param {bigint|string|number} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatBalance(value, decimals = 18) {
  if (value == null || value === 0n || value === '0') return '0';
  const v = typeof value === 'bigint' ? value : BigInt(String(Math.floor(Number(value))));
  const d = Number(decimals);
  const str = v.toString();
  if (str === '0') return '0';
  const len = str.length;
  if (len <= d) {
    const frac = str.padStart(d, '0').slice(0, d).replace(/0+$/, '');
    return frac ? `0.${frac}` : '0';
  }
  const intPart = str.slice(0, len - d).replace(/^0+/, '') || '0';
  const fracPart = str.slice(len - d).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

/**
 * Format for display with thousands separator (e.g. "1,234.56")
 */
export function formatBalanceDisplay(value, decimals = 18, maxDecimals = 6) {
  const raw = formatBalance(value, decimals);
  if (raw === '0') return '0';
  const [int, frac] = raw.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!frac) return intFormatted;
  const fracTrimmed = frac.slice(0, maxDecimals).replace(/0+$/, '');
  return fracTrimmed ? `${intFormatted}.${fracTrimmed}` : intFormatted;
}
