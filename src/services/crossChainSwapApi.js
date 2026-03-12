/**
 * Cross-chain swap via mangoServices (POST /api/v1/swap/cross-chain)
 * Uses backend so referral sync and reward scheduling run; backend creates LayerSwap order.
 */

const BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';
const BRIDGE_PROVIDER = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

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
  const tokenInAddr = tokenIn?.address ?? tokenIn;
  const tokenOutAddr = tokenOut?.address ?? tokenOut;
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
    throw new Error(data?.error || data?.message || `API error: ${res.status}`);
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

export function isCrossChainViaBackendAvailable() {
  return Boolean(BASE && API_KEY && API_KEY.trim() !== '');
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
  const tokenInAddr = tokenIn?.address ?? tokenIn ?? '0x0000000000000000000000000000000000000000';
  const tokenOutAddr = tokenOut?.address ?? tokenOut ?? '0x0000000000000000000000000000000000000000';
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
