/**
 * Agent API — wraps session key, credits, and swap-history endpoints.
 * Requires x-api-key header for authenticated calls.
 */
import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);

function headers(apiKey) {
  return { 'Content-Type': 'application/json', 'x-api-key': apiKey };
}

async function fetchJson(url, apiKey, opts = {}) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL is not configured');
  const res = await fetch(url, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(15000),
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}

/** GET /api/v1/account/credits — credit balance for the API key */
export async function getCredits(apiKey) {
  return fetchJson(`${BASE}/api/v1/account/credits`, apiKey);
}

/** GET /api/v1/session — list active session keys */
export async function listSessions(apiKey) {
  return fetchJson(`${BASE}/api/v1/session`, apiKey);
}

/** POST /api/v1/session/create — create a new session key */
export async function createSession(apiKey, params) {
  return fetchJson(`${BASE}/api/v1/session/create`, apiKey, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** POST /api/v1/session/revoke — revoke a session key */
export async function revokeSession(apiKey, sessionId) {
  return fetchJson(`${BASE}/api/v1/session/revoke`, apiKey, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

/** GET /api/v1/swap/routes — available routes for a pair */
export async function getRoutes(apiKey, { sourceChainId, destChainId, sourceToken, destToken, amount, userAddress }) {
  const params = new URLSearchParams({ sourceChainId, destChainId, sourceToken, destToken, amount });
  if (userAddress) params.set('userAddress', userAddress);
  return fetchJson(`${BASE}/api/v1/swap/routes?${params}`, apiKey);
}
