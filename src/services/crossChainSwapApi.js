/**
 * Cross-chain swap via mangoServices (POST /api/v1/swap/cross-chain)
 * Uses backend so referral sync and reward scheduling run; backend creates LayerSwap order.
 */

import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);
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

/**
 * Token from UI may be `{ symbol, address?, native? }`. Never pass the whole object when `address` is missing
 * (that produced "[object Object]" / invalid route params and "route not supported").
 * @param {string|{address?: string}|null|undefined} token
 * @param {number} chainId
 * @returns {string}
 */
function resolveTokenAddressForBridgeApi(token, chainId) {
  let addr;
  if (token == null) {
    addr = undefined;
  } else if (typeof token === 'string') {
    addr = token;
  } else if (typeof token === 'object' && typeof token.address === 'string') {
    addr = token.address;
  } else {
    addr = undefined;
  }
  return toBridgeTokenAddress(addr ?? ZERO, chainId);
}

/** Normalize CAIP-10 (eip155:chainId:0x...) to raw 0x... - prevents "value too long for varchar(42)" */
function toRawAddress(addr) {
  if (!addr || typeof addr !== 'string') return addr;
  const s = addr.trim();
  const m = s.match(/^eip155:\d+:(0x[a-fA-F0-9]{40})$/);
  return m ? m[1] : s;
}

function headers(userToken) {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  if (BRIDGE_PROVIDER) h['x-bridge-provider'] = BRIDGE_PROVIDER;
  if (userToken) h['x-user-token'] = userToken;
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
  userAddress,
  referrer,
  userToken,
}) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const tokenInAddr = resolveTokenAddressForBridgeApi(tokenIn, sourceChainId);
  const tokenOutAddr = resolveTokenAddressForBridgeApi(tokenOut, destChainId);
  if (!tokenInAddr || !tokenOutAddr || !recipient || !amountIn) {
    throw new Error('Missing required fields: tokenIn, tokenOut, amountIn, recipient');
  }
  const body = {
    sourceChainId: Number(sourceChainId),
    destChainId: Number(destChainId),
    tokenIn: typeof tokenInAddr === 'string' ? toRawAddress(tokenInAddr) || tokenInAddr : tokenInAddr,
    tokenOut: typeof tokenOutAddr === 'string' ? toRawAddress(tokenOutAddr) || tokenOutAddr : tokenOutAddr,
    amountIn: String(amountIn),
    recipient: toRawAddress(recipient) || recipient,
  };
  // Never run EVM CAIP normalization on Bitcoin/Solana/etc. sender addresses (only eip155:… or bare 0x…).
  if (userAddress != null && String(userAddress).trim()) {
    const u = String(userAddress).trim();
    body.userAddress =
      /^eip155:\d+:0x/i.test(u) || /^0x[a-fA-F0-9]{40}$/i.test(u) ? toRawAddress(u) || u : u;
  }
  if (referrer && typeof referrer === 'string') body.referrer = toRawAddress(referrer) || referrer;

  const res = await fetch(`${BASE}/api/v1/swap/cross-chain`, {
    method: 'POST',
    headers: headers(userToken),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const hint = data?.message || data?.error;
    if (typeof hint === 'string' && hint.includes('user session token')) {
      throw new Error(
        `${hint} If you use a browser wallet on a different domain than the API, ensure the API CORS policy allows the x-user-token header (redeploy mangoServices).`
      );
    }
    if (typeof hint === 'string' && hint.toLowerCase().includes('api key')) {
      throw new Error(
        `${hint} Set VITE_MANGO_SERVICES_API_KEY on your frontend build (Vercel) to match the backend API_KEY.`
      );
    }
    throw new Error(
      typeof hint === 'string'
        ? hint
        : 'Cross-chain API returned 401. Check VITE_MANGO_SERVICES_API_KEY and wallet session signing (x-user-token).'
    );
  }
  if (res.status === 429) {
    const hint = data?.retryHint || data?.message || data?.error;
    throw new Error(
      typeof hint === 'string'
        ? hint
        : 'Bridge rate limit — please wait a moment and try again.'
    );
  }
  if (!res.ok) {
    // Log full response so DevTools shows the real reason for 400/5xx
    console.error('[Cross-chain API]', res.status, res.statusText, data);
    // Retryable backend errors (e.g. Rango BTC backend temporarily down) — show a clear retry message
    if (data?.retryable) {
      const retryMsg = data?.message || data?.error || 'Bridge temporarily unavailable. Please try again in a few minutes.';
      throw new Error(retryMsg);
    }
    const rawMsg = data?.message ?? data?.error;
    let msg = typeof rawMsg === 'string' ? rawMsg : (data?.suggestion ? `${data.error || 'Error'}. ${data.suggestion}` : null) || `API error: ${res.status}`;
    // For BTC empty-address errors, keep message short — the frontend renders a dedicated banner
    const isBtcEmptyAddr = data?.error === 'Empty Bitcoin address' || /no btc found at|0 btc found at/i.test(msg);
    // For amount-limit errors the message already states the minimum; don't append the long suggestion
    const isAmountLimitError = data?.error === 'Amount outside provider limits' ||
      /below minimum|provider limit/i.test(msg);
    if (!isBtcEmptyAddr && !isAmountLimitError && data?.suggestion && msg && !msg.includes(data.suggestion)) {
      msg = `${msg} ${data.suggestion}`;
    }
    // Include requested route when present (e.g. 400 Route not available) — skip for BTC empty address / amount errors
    const route = data?.route;
    if (!isBtcEmptyAddr && !isAmountLimitError && route && (route.sourceChainId != null || route.destChainId != null)) {
      const src = route.sourceChainId != null ? route.sourceChainId : '?';
      const dst = route.destChainId != null ? route.destChainId : '?';
      msg = `${msg} Requested route: chain ${src} → chain ${dst}.`;
    }
    const err = new Error(msg);
    // Attach structured data so the UI can offer a "Use minimum" action
    if (data?.minAmount != null) err.minAmount = String(data.minAmount);
    if (data?.maxAmount != null) err.maxAmount = String(data.maxAmount);
    throw err;
  }
  return {
    swapId: data.swapId,
    layerswapOrderId: data.layerswapOrderId,
    status: data.status,
    depositAddress: data.depositAddress,
    amountToDeposit: data.amountToDeposit,
    depositActions: data.depositActions,
    estimatedCompletion: data.estimatedCompletion,
    sourceChainId: data.sourceChainId,
    destChainId: data.destChainId,
    provider: data.provider,
    providerSwapId: data.providerSwapId,
    rangoTx: data.rangoTx,
    rangoRequestId: data.rangoRequestId,
    symbiosisSolana: data.symbiosisSolana,
  };
}

/**
 * Get swap status from backend (used when BRIDGE_PROVIDER=rango)
 * @param {string} swapId - Our internal swap UUID
 * @returns {Promise<{ status: string, depositActions?: Array }>}
 */
export async function getSwapStatusFromBackend(swapId, userToken) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const res = await fetch(`${BASE}/api/v1/swap/${encodeURIComponent(swapId)}/status`, {
    method: 'GET',
    headers: headers(userToken),
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
 * Fetch deposit instructions (to_address, amount) for a swap. Use when status didn't include depositActions.
 */
export async function getDepositFromBackend(swapId, userToken) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const res = await fetch(`${BASE}/api/v1/swap/${encodeURIComponent(swapId)}/deposit`, {
    method: 'GET',
    headers: headers(userToken),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Deposit ${res.status}`);
  return {
    depositActions: data.depositActions ?? [],
    rangoTx: data.rangoTx ?? null,
  };
}

/**
 * Notify backend about the source-chain transaction hash for a swap.
 * This is used by Rango (and other bridge providers) to poll status.
 * @param {string} swapId
 * @param {string} txHash
 */
export async function notifySourceTxHash(swapId, txHash, userToken) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  if (!swapId) throw new Error('swapId required');
  if (!txHash) throw new Error('txHash required');

  const res = await fetch(
    `${BASE}/api/v1/swap/${encodeURIComponent(swapId)}/source-tx`,
    {
      method: 'POST',
      headers: headers(userToken),
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
  // IMPORTANT:
  // - On mangoswap domains we intentionally resolve api.mangoswap.io -> '' so requests go through /api proxy.
  // - In that case BASE is empty string by design, but backend is still available.
  // Therefore availability must be based on RAW_BASE (env intent), not resolved BASE.
  return Boolean(RAW_BASE && RAW_BASE.trim() !== '');
}

/**
 * Fetch merged bridge metadata (chains + tokens + providers) from backend.
 * @returns {Promise<{ chains: Array, tokens: Array }>}
 */
export async function getBridgeMeta() {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
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
 * @param {string} [amountIn] - optional human-readable amount for quote
 * @returns {Promise<{ routes: Array, provider?: string, amountOut?: string }>}
 */
export async function getRoutesFromBackend(sourceChainId, destChainId, tokenIn, tokenOut, amountIn) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  const tokenInAddr = resolveTokenAddressForBridgeApi(tokenIn, sourceChainId);
  const tokenOutAddr = resolveTokenAddressForBridgeApi(tokenOut, destChainId);
  const paramObj = {
    sourceChainId: String(sourceChainId),
    destChainId: String(destChainId),
    tokenIn: tokenInAddr,
    tokenOut: tokenOutAddr,
  };
  if (amountIn && parseFloat(amountIn) > 0) paramObj.amountIn = String(amountIn);
  const params = new URLSearchParams(paramObj);
  const res = await fetch(`${BASE}/api/v1/swap/routes?${params}`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { routes: [], error: data?.error };
  const amountOut = data.amountOut ?? data.routes?.[0]?.amountOut ?? null;
  return { routes: data.routes ?? [], provider: data.provider, amountOut };
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
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
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
