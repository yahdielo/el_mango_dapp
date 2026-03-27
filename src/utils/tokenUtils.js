import { ZERO_ADDRESS } from './chainConfig';

/**
 * Returns true if the token is the native gas token (ETH, BNB, MATIC, etc.)
 * rather than an ERC-20 / SPL / TRC-20 contract token.
 *
 * Kept as a pure utility (no wagmi / React imports) so both hooks AND
 * non-hook service files can import it without polluting the wagmi module
 * graph and triggering Rollup TDZ errors.
 */
export function isNativeToken(token) {
  if (!token) return false;
  const addr = token.address;
  if (!addr || addr === ZERO_ADDRESS) return true;
  if (typeof addr === 'string' && !addr.startsWith('0x')) return true;
  return !!token.native;
}
