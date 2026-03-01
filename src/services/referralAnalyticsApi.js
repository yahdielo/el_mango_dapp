/**
 * Referral analytics API (mangoServices)
 * GET tree, performance, insights, top-referrers
 * Requires API key when backend enforces auth; set VITE_MANGO_SERVICES_API_KEY.
 */

const BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

function headers() {
  const h = { Accept: 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

async function fetchOk(url) {
  const res = await fetch(url, {
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Analytics requires API key. Set VITE_MANGO_SERVICES_API_KEY.');
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

/** GET /api/v1/referral-analytics/tree/:address?maxDepth=5 */
export async function getReferralTree(address, maxDepth = 5) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  return null;
}

/** GET /api/v1/referral-analytics/performance/:address */
export async function getReferralPerformance(address) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  return null;
}

/** GET /api/v1/referral-analytics/insights?address=0x... */
export async function getReferralInsights(address) {
  return [];
}

/** GET /api/v1/referral-analytics/top-referrers?limit=10 */
export async function getTopReferrers(limit = 10) {
  return [];
}
