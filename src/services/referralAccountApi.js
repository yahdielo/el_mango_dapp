/**
 * Account-based referral API (mangoServices)
 * - GET /api/v1/referral/:address
 * - GET /api/v1/referral/nonce/:address
 * - POST /api/v1/referral/claim
 */

const BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

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
  if (res.status === 401) {
    throw new Error('Referral API requires authentication. Set VITE_MANGO_SERVICES_API_KEY or use mangoswap.io/test.mangoswap.io.');
  }
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

export function isReferralAccountApiAvailable() {
  return Boolean(BASE && BASE.trim() !== '');
}

export async function getAccountReferrer(userAddress) {
  if (!BASE) return null;
  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) return null;
  return fetchOk(`${BASE}/api/v1/referral/${encodeURIComponent(userAddress)}`, { method: 'GET' });
}

export async function getReferralClaimNonce(userAddress) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) throw new Error('Invalid user address');
  return fetchOk(`${BASE}/api/v1/referral/nonce/${encodeURIComponent(userAddress)}`, { method: 'GET' });
}

export function buildReferralClaimMessage({ userAddress, referrerAddress, nonce }) {
  // Must match mangoServices buildClaimMessage() exactly (lowercased).
  const u = String(userAddress || '').trim().toLowerCase();
  const r = String(referrerAddress || '').trim().toLowerCase();
  const n = String(nonce || '').trim();
  return [
    'MangoSwap Referral Claim',
    '',
    `User: ${u}`,
    `Referrer: ${r}`,
    `Nonce: ${n}`,
    '',
    'By signing, you confirm you want to set your referrer for MangoSwap.',
  ].join('\n');
}

export async function claimAccountReferrer({ userAddress, referrerAddress, nonce, signature, source }) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  return fetchOk(`${BASE}/api/v1/referral/claim`, {
    method: 'POST',
    body: JSON.stringify({ userAddress, referrerAddress, nonce, signature, source }),
  });
}

