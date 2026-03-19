import { ZERO_ADDRESS, getReferrerAddress } from './chainConfig';

const KEY_PREFIX = 'mango.referrer.';

export function isValidReferrerAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

function keyForUser(userAddress) {
  const u = (userAddress || '').trim();
  return `${KEY_PREFIX}${u.toLowerCase()}`;
}

/**
 * Get the stored referrer for a given user (wallet).
 * Returns ZERO_ADDRESS if none is stored/valid.
 */
export function getStoredReferrer(userAddress) {
  if (typeof window === 'undefined') return ZERO_ADDRESS;
  if (!isValidReferrerAddress(userAddress)) return ZERO_ADDRESS;
  try {
    const raw = window.localStorage.getItem(keyForUser(userAddress));
    if (!raw) return ZERO_ADDRESS;
    const s = String(raw).trim();
    return isValidReferrerAddress(s) ? s : ZERO_ADDRESS;
  } catch {
    return ZERO_ADDRESS;
  }
}

/**
 * Persist a referrer for a user. Returns the normalized value that was stored.
 * If referrer is invalid or equals user, stores ZERO_ADDRESS (clears).
 */
export function setStoredReferrer(userAddress, referrerAddress) {
  if (typeof window === 'undefined') return ZERO_ADDRESS;
  if (!isValidReferrerAddress(userAddress)) return ZERO_ADDRESS;
  const user = userAddress.trim();
  const ref = (referrerAddress || '').trim();
  const normalized =
    isValidReferrerAddress(ref) && ref.toLowerCase() !== user.toLowerCase() ? ref : ZERO_ADDRESS;
  try {
    const k = keyForUser(user);
    if (normalized === ZERO_ADDRESS) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, normalized);
  } catch {
    // ignore
  }
  return normalized;
}

export function clearStoredReferrer(userAddress) {
  return setStoredReferrer(userAddress, ZERO_ADDRESS);
}

/**
 * Resolve the effective referrer for a swap:
 * - URL ref (if valid) wins
 * - then per-user stored referrer
 * - then env default (VITE_REFERRER_ADDRESS via getReferrerAddress)
 * - else ZERO_ADDRESS
 */
export function resolveEffectiveReferrer({ userAddress, chainId, urlRef }) {
  if (isValidReferrerAddress(urlRef) && isValidReferrerAddress(userAddress) && urlRef.toLowerCase() !== userAddress.toLowerCase()) {
    return urlRef.trim();
  }
  const stored = getStoredReferrer(userAddress);
  if (stored !== ZERO_ADDRESS) return stored;
  const envDefault = getReferrerAddress(chainId);
  return envDefault || ZERO_ADDRESS;
}

