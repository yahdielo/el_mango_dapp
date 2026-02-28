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
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

export async function getReferralChain(address, opts = {}) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid address');
  const params = new URLSearchParams();
  if (opts.chainId != null) params.set('chainId', String(opts.chainId));
  if (opts.allChains === true) params.set('allChains', 'true');
  const qs = params.toString();
  const url = `${BASE}/api/v1/referral-chain/${encodeURIComponent(address)}${qs ? `?${qs}` : ''}`;
  return fetchOk(url);
}

export async function syncReferral(body) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  return fetchOk(`${BASE}/api/v1/referral-chain/sync`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
