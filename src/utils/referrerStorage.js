import { ZERO_ADDRESS, getReferrerAddress } from './chainConfig';

const KEY_PREFIX = 'mango.referrer.';
const PENDING_KEY = 'mango.pendingReferrer';

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
 * Persist a referrer for a user (SET-ONCE — immutable after first valid set).
 * If the user already has a valid referrer stored, the call is a no-op and the
 * existing referrer is returned unchanged. This matches the backend behaviour of
 * `createAccountReferralIfMissing` and prevents re-attribution after first use.
 *
 * Returns the referrer that is now active (existing or newly stored).
 */
export function setStoredReferrer(userAddress, referrerAddress) {
  if (typeof window === 'undefined') return ZERO_ADDRESS;
  if (!isValidReferrerAddress(userAddress)) return ZERO_ADDRESS;
  const user = userAddress.trim();

  // Lock: if a valid referrer is already stored, never overwrite it.
  const existing = getStoredReferrer(user);
  if (existing !== ZERO_ADDRESS) return existing;

  const ref = (referrerAddress || '').trim();
  const normalized =
    isValidReferrerAddress(ref) && ref.toLowerCase() !== user.toLowerCase() ? ref : ZERO_ADDRESS;
  try {
    const k = keyForUser(user);
    if (normalized !== ZERO_ADDRESS) window.localStorage.setItem(k, normalized);
  } catch {
    // ignore
  }
  return normalized;
}

/** @deprecated Referrals are now immutable. This is intentionally a no-op. */
export function clearStoredReferrer(_userAddress) {
  return ZERO_ADDRESS;
}

/**
 * Resolve the effective referrer for a swap:
 * - If user already has a locked stored referrer, always use it (immutable).
 * - Otherwise URL ref (if valid) → env default → ZERO_ADDRESS.
 *
 * The URL ref can only win when no referrer has been set yet, preventing
 * a malicious link from re-attributing an already-locked user.
 */
export function resolveEffectiveReferrer({ userAddress, chainId, urlRef }) {
  // Locked referrer always wins — never allow URL or env to override it.
  const stored = getStoredReferrer(userAddress);
  if (stored !== ZERO_ADDRESS) return stored;

  // No referrer locked yet — use URL ref if valid and not self-referral.
  if (isValidReferrerAddress(urlRef) && isValidReferrerAddress(userAddress) && urlRef.toLowerCase() !== userAddress.toLowerCase()) {
    return urlRef.trim();
  }

  const envDefault = getReferrerAddress(chainId);
  return envDefault || ZERO_ADDRESS;
}

/**
 * Store a pending URL referrer (when user isn't connected yet).
 */
export function setPendingReferrer(referrerAddress) {
  if (typeof window === 'undefined') return ZERO_ADDRESS;
  const ref = (referrerAddress || '').trim();
  const normalized = isValidReferrerAddress(ref) ? ref : ZERO_ADDRESS;
  try {
    if (normalized === ZERO_ADDRESS) window.localStorage.removeItem(PENDING_KEY);
    else window.localStorage.setItem(PENDING_KEY, normalized);
  } catch {
    // ignore
  }
  return normalized;
}

export function getPendingReferrer() {
  if (typeof window === 'undefined') return ZERO_ADDRESS;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return ZERO_ADDRESS;
    const s = String(raw).trim();
    return isValidReferrerAddress(s) ? s : ZERO_ADDRESS;
  } catch {
    return ZERO_ADDRESS;
  }
}

export function clearPendingReferrer() {
  return setPendingReferrer(ZERO_ADDRESS);
}

