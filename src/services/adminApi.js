/**
 * Admin dashboard API – wraps the three internal monitoring endpoints.
 * All calls require the x-api-key header (the backend API key, not a JWT).
 */
import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);

function headers(apiKey) {
  return {
    Accept: 'application/json',
    'x-api-key': apiKey,
  };
}

async function fetchJson(url, apiKey) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL is not configured');
  const res = await fetch(url, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

/**
 * GET /api/v1/admin/referral-stats
 * Returns fee accumulation totals across all four buckets.
 */
export function getAdminReferralStats(apiKey, { chain, since } = {}) {
  const p = new URLSearchParams();
  if (chain) p.set('chain', String(chain));
  if (since) p.set('since', since);
  const qs = p.toString() ? `?${p}` : '';
  return fetchJson(`${BASE}/api/v1/admin/referral-stats${qs}`, apiKey);
}

/**
 * GET /api/v1/admin/referral-depth
 * Returns referral network depth metrics and saturation progress.
 */
export function getAdminReferralDepth(apiKey) {
  return fetchJson(`${BASE}/api/v1/admin/referral-depth`, apiKey);
}

/**
 * GET /api/v1/admin/sync-health
 * Returns per-chain event monitor cursor state with staleness flags.
 */
export function getAdminSyncHealth(apiKey) {
  return fetchJson(`${BASE}/api/v1/admin/sync-health`, apiKey);
}
