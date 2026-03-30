/**
 * Whitelist API (mangoServices)
 * GET /api/v1/whitelist/status – get whitelist status for an address
 * POST /api/v1/whitelist/batch – batch add addresses with tier (Standard, VIP, Premium)
 */

import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

function headers() {
  const h = { Accept: 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    return { tier: 'None', isWhitelisted: false, tierLevel: 0 };
  }
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

const DEFAULT_WHITELIST = { tier: 'None', isWhitelisted: false, tierLevel: 0 };

/**
 * Get whitelist status for an address.
 * Returns default (not whitelisted) without calling the API so the app never triggers 401.
 * To enable live whitelist checks, backend must allow unauthenticated GET or accept x-api-key.
 * @param {string} address - Wallet address (0x...)
 * @param {number} [chainId] - Optional chain ID
 * @returns {Promise<{ tier: string, isWhitelisted: boolean, tierLevel?: number }>}
 */
export async function getWhitelistStatus(address, chainId) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return DEFAULT_WHITELIST;
  }
  return DEFAULT_WHITELIST;
}

/**
 * POST whitelist/batch with admin key in body to avoid CORS preflight (x-admin-key header is often not in Access-Control-Allow-Headers).
 * Backend should accept adminKey in the request body.
 */
async function fetchWithAdminKey(url, adminKey, payload) {
  const body = { ...payload, adminKey };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

/**
 * Batch add addresses to the whitelist.
 * @param {Array<{ address: string, tier: string }>} users - List of { address, tier } (tier: Standard, VIP, Premium)
 * @param {string} adminKey - Admin key (sent in body to avoid CORS)
 * @returns {Promise<{ added: number, failed: number, results?: Array }>}
 */
export async function batchAddWhitelist(users, adminKey) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!adminKey || typeof adminKey !== 'string') throw new Error('Admin key is required');
  const payload = { users: users.map((u) => ({ address: u.address, tier: u.tier || 'Standard' })) };
  const data = await fetchWithAdminKey(`${BASE}/api/v1/whitelist/batch-add`, adminKey, payload);
  return {
    added: data.added ?? data.addedCount ?? 0,
    failed: data.failed ?? data.failedCount ?? 0,
    ...(data.results && { results: data.results }),
  };
}
