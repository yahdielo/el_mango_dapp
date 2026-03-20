import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

function headers() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

export function buildAuthSessionMessage({ userAddress, nonce }) {
  return [
    'MangoSwap Session Authentication',
    '',
    `User: ${String(userAddress || '').trim().toLowerCase()}`,
    `Nonce: ${String(nonce || '').trim()}`,
    '',
    'By signing, you authorize a short-lived session token for protected API actions.',
  ].join('\n');
}

export async function getAuthSessionNonce(userAddress) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!API_KEY) throw new Error('VITE_MANGO_SERVICES_API_KEY not set');
  const res = await fetch(`${BASE}/api/v1/auth/nonce/${encodeURIComponent(userAddress)}`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Failed to get auth nonce (${res.status})`);
  return data;
}

export async function createAuthSessionToken({ userAddress, nonce, signature }) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!API_KEY) throw new Error('VITE_MANGO_SERVICES_API_KEY not set');
  const res = await fetch(`${BASE}/api/v1/auth/token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ userAddress, nonce, signature }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Failed to create auth token (${res.status})`);
  return data;
}

