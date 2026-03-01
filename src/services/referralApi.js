/**
 * Referral chain API (mangoServices)
 * GET /api/v1/referral-chain/:address, POST /api/v1/referral-chain/sync
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
  if (res.status === 401) throw new Error('Referral API requires authentication. Set VITE_MANGO_SERVICES_API_KEY.');
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

export async function getReferralChain(address, opts = {}) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  // Don't call API so we never trigger 401; show empty state until backend allows unauthenticated or valid key is used
  return null;
}

export async function syncReferral(body) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  return fetchOk(`${BASE}/api/v1/referral-chain/sync`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
