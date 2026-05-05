import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

function headers(userToken) {
  const h = { Accept: 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  if (userToken) h['x-user-token'] = userToken;
  return h;
}

/**
 * Fetch paginated swap history for an EVM address.
 * @param {string} address
 * @param {{ limit?: number, offset?: number, userToken?: string }} opts
 */
export async function getSwapHistory(address, { limit = 20, offset = 0, userToken } = {}) {
  if (!address) throw new Error('address required');
  const params = new URLSearchParams({
    address: address.toLowerCase(),
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${BASE}/api/v1/swap/history?${params}`, {
    headers: headers(userToken),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `History ${res.status}`);
  return data; // { address, total, limit, offset, swaps: [...] }
}
