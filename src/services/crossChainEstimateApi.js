import { ZERO_ADDRESS } from '../utils/chainConfig';

function isNativeToken(token) {
  if (!token) return false;
  const addr = token.address;
  if (!addr || addr === ZERO_ADDRESS) return true;
  if (typeof addr === 'string' && !addr.startsWith('0x')) return true;
  return !!token.native;
}

import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';
const BRIDGE_PROVIDER = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

function getBaseUrl() {
  const raw = BASE;
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && raw.startsWith('http://')) {
    return raw.replace(/^http:\/\//i, 'https://');
  }
  return raw;
}

function headers() {
  const h = { Accept: 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  if (BRIDGE_PROVIDER) h['x-bridge-provider'] = BRIDGE_PROVIDER;
  return h;
}

function toTokenAddress(token, chainId) {
  if (!token) return ZERO_ADDRESS;
  if (isNativeToken(token)) {
    return ZERO_ADDRESS;
  }
  return token.address || ZERO_ADDRESS;
}

/**
 * Get cross-chain estimate (min/max, fees) via mangoServices.
 * This is only used when a backend bridge provider is configured (e.g. Rango).
 * @param {{ sourceChainId: number, destChainId: number, tokenIn: any, tokenOut: any, amountInWei: string, recipient?: string, userAddress?: string }} params
 */
export async function getCrossChainEstimate({
  sourceChainId,
  destChainId,
  tokenIn,
  tokenOut,
  amountIn,
  amountInWei,
  recipient,
  userAddress,
}) {
  const baseUrl = getBaseUrl();
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not configured');

  const tokenInAddr = toTokenAddress(tokenIn, sourceChainId);
  const tokenOutAddr = toTokenAddress(tokenOut, destChainId);

  // Prefer human-readable amount (e.g. "0.0002" BTC) so the backend can normalize correctly.
  // Fall back to wei/satoshi value for callers that only provide amountInWei.
  const amountForApi = amountIn != null ? String(amountIn) : String(amountInWei);

  const params = new URLSearchParams({
    sourceChainId: String(sourceChainId),
    destChainId: String(destChainId),
    tokenIn: tokenInAddr,
    tokenOut: tokenOutAddr,
    amountIn: amountForApi,
  });

  if (recipient) {
    params.set('recipient', recipient);
  }
  if (userAddress && String(userAddress).trim()) {
    params.set('userAddress', String(userAddress).trim());
  }

  const url = `${baseUrl}/api/v1/swap/estimate?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Failed to get cross-chain estimate (${res.status})`);
  }

  return data;
}

