/**
 * Account-based referral API (mangoServices)
 *
 * - GET  /api/v1/referral/:address        -> { referrer }
 * - GET  /api/v1/referral/nonce/:address  -> { nonce }
 * - POST /api/v1/referral/claim           -> stores mapping (one-time)
 */

const BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

/** When app is HTTPS, use HTTPS for API to avoid Mixed Content block. */
function getBaseUrl() {
  const raw = (BASE || '').replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && raw.startsWith('http://')) {
    return raw.replace(/^http:\/\//i, 'https://');
  }
  return raw;
}

function headers() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

async function fetchOk(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  }
  return data;
}

export function isAccountReferralBackendAvailable() {
  return Boolean(getBaseUrl());
}

export async function getAccountReferrer(userAddress) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;
  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) return null;
  return fetchOk(`${baseUrl}/api/v1/referral/${encodeURIComponent(userAddress)}`, { method: 'GET' });
}

export async function getReferralClaimNonce(userAddress) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error('VITE_MANGO_SERVICES_URL not configured');
  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) throw new Error('Invalid user address');
  return fetchOk(`${baseUrl}/api/v1/referral/nonce/${encodeURIComponent(userAddress)}`, { method: 'GET' });
}

export async function claimAccountReferrer({ userAddress, referrerAddress, nonce, signature, source }) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error('VITE_MANGO_SERVICES_URL not configured');
  return fetchOk(`${baseUrl}/api/v1/referral/claim`, {
    method: 'POST',
    body: JSON.stringify({ userAddress, referrerAddress, nonce, signature, source }),
  });
}

