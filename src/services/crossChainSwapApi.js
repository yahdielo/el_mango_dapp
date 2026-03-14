/**
 * Cross-chain swap via mangoServices (POST /api/v1/swap/cross-chain)
 * Uses backend so referral sync and reward scheduling run; backend creates LayerSwap order.
 */

const BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';
const BRIDGE_PROVIDER = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

const ZERO = '0x0000000000000000000000000000000000000000';
const WETH_BY_CHAIN = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  8453: '0x4200000000000000000000000000000000000006',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
};
function toBridgeTokenAddress(addr, chainId) {
  if (!addr || (typeof addr === 'string' && addr.toLowerCase() === ZERO.toLowerCase())) {
    return (chainId != null && WETH_BY_CHAIN[Number(chainId)]) || addr;
  }
  return addr;
}

function headers() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  if (BRIDGE_PROVIDER) h['x-bridge-provider'] = BRIDGE_PROVIDER;
  return h;
}

/**
 * Initiate cross-chain swap via mangoServices. Backend creates LayerSwap order and runs referral sync / reward scheduling.
 * @param {Object} params
 * @param {number} params.sourceChainId
 * @param {number} params.destChainId
 * @param {Object} params.tokenIn - { address, symbol, ... }
 * @param {Object} params.tokenOut - { address, symbol, ... }
 * @param {string} params.amountIn
 * @param {string} params.recipient
 * @param {string} [params.referrer]
 * @returns {Promise<{ swapId: string, layerswapOrderId: string, status: string, depositAddress?: string, estimatedCompletion?: string, sourceChainId: number, destChainId: number }>}
 */
export async function initiateCrossChainViaBackend({
  sourceChainId,
  destChainId,
  tokenIn,
  tokenOut,
  amountIn,
  recipient,
  referrer,
}) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const tokenInAddr = toBridgeTokenAddress(tokenIn?.address ?? tokenIn, sourceChainId);
  const tokenOutAddr = toBridgeTokenAddress(tokenOut?.address ?? tokenOut, destChainId);
  if (!tokenInAddr || !tokenOutAddr || !recipient || !amountIn) {
    throw new Error('Missing required fields: tokenIn, tokenOut, amountIn, recipient');
  }
  const body = {
    sourceChainId: Number(sourceChainId),
    destChainId: Number(destChainId),
    tokenIn: tokenInAddr,
    tokenOut: tokenOutAddr,
    amountIn: String(amountIn),
    recipient,
  };
  if (referrer && typeof referrer === 'string') body.referrer = referrer;

  const res = await fetch(`${BASE}/api/v1/swap/cross-chain`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new Error('Cross-chain API requires authentication. Set VITE_MANGO_SERVICES_API_KEY in your build environment.');
  }
  if (!res.ok) {
    // Log full response so DevTools shows the real reason for 400/5xx
    console.error('[Cross-chain API]', res.status, res.statusText, data);
    const msg = data?.message || data?.error || (data?.suggestion ? `${data.error || 'Error'}. ${data.suggestion}` : null) || `API error: ${res.status}`;
    throw new Error(msg);
  }
  return {
    swapId: data.swapId,
    layerswapOrderId: data.layerswapOrderId,
    status: data.status,
    depositAddress: data.depositAddress,
    amountToDeposit: data.amountToDeposit,
    estimatedCompletion: data.estimatedCompletion,
    sourceChainId: data.sourceChainId,
    destChainId: data.destChainId,
    provider: data.provider,
    providerSwapId: data.providerSwapId,
    rangoTx: data.rangoTx,
    rangoRequestId: data.rangoRequestId,
  };
}

/**
 * Get swap status from backend (used when BRIDGE_PROVIDER=rango)
 * @param {string} swapId - Our internal swap UUID
 * @returns {Promise<{ status: string, depositActions?: Array }>}
 */
export async function getSwapStatusFromBackend(swapId) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const res = await fetch(`${BASE}/api/v1/swap/${encodeURIComponent(swapId)}/status`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Status ${res.status}`);
  return {
    status: data.status ?? 'unknown',
    depositActions: data.depositActions ?? [],
    rangoTx: data.rangoTx ?? null,
    sourceTxHash: data.sourceTxHash,
    destTxHash: data.destTxHash,
    completedAt: data.completedAt,
  };
}

/**
 * Notify backend about the source-chain transaction hash for a swap.
 * This is used by Rango (and other bridge providers) to poll status.
 * @param {string} swapId
 * @param {string} txHash
 */
export async function notifySourceTxHash(swapId, txHash) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!swapId) throw new Error('swapId required');
  if (!txHash) throw new Error('txHash required');

  const res = await fetch(
    `${BASE}/api/v1/swap/${encodeURIComponent(swapId)}/source-tx`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ txHash }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Status ${res.status}`);
  }
  return data;
}

/** Backend is used for cross-chain when BASE is set. API key is optional (backend allows test.mangoswap.io / mangoswap.io without key). */
export function isCrossChainViaBackendAvailable() {
  return Boolean(BASE && BASE.trim() !== '');
}

/**
 * Fetch merged bridge metadata (chains + tokens + providers) from backend.
 * @returns {Promise<{ chains: Array, tokens: Array }>}
 */
export async function getBridgeMeta() {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const res = await fetch(`${BASE}/api/v1/bridge/meta`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to load bridge meta (${res.status})`);
  }
  return data;
}

/**
 * Get cross-chain routes from backend (used when BRIDGE_PROVIDER=rango)
 * @param {number} sourceChainId
 * @param {number} destChainId
 * @param {Object} tokenIn - { address, symbol }
 * @param {Object} tokenOut - { address, symbol }
 * @returns {Promise<{ routes: Array, provider?: string }>}
 */
export async function getRoutesFromBackend(sourceChainId, destChainId, tokenIn, tokenOut) {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const tokenInAddr = toBridgeTokenAddress(tokenIn?.address ?? tokenIn ?? ZERO, sourceChainId);
  const tokenOutAddr = toBridgeTokenAddress(tokenOut?.address ?? tokenOut ?? ZERO, destChainId);
  const params = new URLSearchParams({
    sourceChainId: String(sourceChainId),
    destChainId: String(destChainId),
    tokenIn: tokenInAddr,
    tokenOut: tokenOutAddr,
  });
  const res = await fetch(`${BASE}/api/v1/swap/routes?${params}`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { routes: [], error: data?.error };
  return { routes: data.routes ?? [], provider: data.provider };
}

/**
 * Check if route is supported via backend (used when Rango is bridge provider)
 */
export async function isRouteSupportedViaBackend(sourceChainId, destChainId, tokenIn, tokenOut) {
  try {
    const { routes } = await getRoutesFromBackend(sourceChainId, destChainId, tokenIn, tokenOut);
    return Array.isArray(routes) && routes.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get Rango support matrix (enabled chains + tokens) from backend.
 * Backend proxies Rango's /basic/meta so API key stays server-side.
 */
export async function getRangoSupportMatrix() {
  if (!BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const res = await fetch(`${BASE}/api/v1/swap/rango/meta`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to load Rango support matrix (${res.status})`);
  }
  return data;
}
