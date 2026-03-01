/**
 * Cross-chain swap via mangoServices (POST /api/v1/swap/cross-chain)
 * Uses backend so referral sync and reward scheduling run; backend creates LayerSwap order.
 */

const BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

function headers() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
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
    estimatedCompletion: data.estimatedCompletion,
    sourceChainId: data.sourceChainId,
    destChainId: data.destChainId,
  };
}

export function isCrossChainViaBackendAvailable() {
  return Boolean(BASE && API_KEY && API_KEY.trim() !== '');
}
