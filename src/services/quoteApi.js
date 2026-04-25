/**
 * Quote API using mangoServices (mangoContracts DEX routing)
 * Uses real amountOut from DEX via mangoServices GET /api/v1/swap/quote
 * No CoinGecko - mangoServices evmDEX calls getAmountsOut on chain-specific routers
 */

import { parseUnits, formatUnits } from 'viem';
import { ZERO_ADDRESS } from '../utils/chainConfig';
import { fetchWithRetry } from '../utils/fetchWithRetry';
// Inline to avoid importing from a hook file (would pull wagmi into the service graph → TDZ)
function isNativeToken(token) {
  if (!token) return false;
  const addr = token.address;
  if (!addr || addr === ZERO_ADDRESS) return true;
  if (typeof addr === 'string' && !addr.startsWith('0x')) return true;
  return !!token.native;
}
import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';
import { isPolygonBridgedWethSwap, POLYGON_USE_WMATIC_MESSAGE } from '../utils/mangoRouterPolygonSupport';

const MANGO_SERVICES_URL = import.meta.env.VITE_MANGO_SERVICES_URL || '';
const RAW_MANGO_SERVICES_URL = String(MANGO_SERVICES_URL || '').replace(/\/$/, '');

/** When app is HTTPS, use HTTPS for API to avoid Mixed Content block. */
function getBaseUrl() {
  const raw = RAW_MANGO_SERVICES_URL;
  const resolved = resolveMangoServicesBaseUrl(raw);
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && resolved.startsWith('http://')) {
    return resolved.replace(/^http:\/\//i, 'https://');
  }
  return resolved;
}

async function fetchJson(url) {
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    }, { retries: 2, baseDelayMs: 1000 });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `API error: ${res.status}`);
    }
    const body = await res.json().catch(() => null);
    // Ensure we always return an object so callers never see a primitive (avoids "y is not an Object (evaluating 'data' in y)" in deps)
    return body != null && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch (e) {
    const baseUrl = getBaseUrl();
    const hint = baseUrl
      ? `Quote server unreachable (${baseUrl}). Use a public HTTPS URL for VITE_MANGO_SERVICES_URL.`
      : 'Set VITE_MANGO_SERVICES_URL to your mangoServices base URL.';
    if (e?.message && (e.message === 'Failed to fetch' || /net::err|unreachable|cors/i.test(e.message))) {
      throw new Error(hint);
    }
    throw e;
  }
}

/** WETH address per chain so quote API gets a valid token (backend may 500 on sellToken=0x0) */
const WETH_BY_CHAIN = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  8453: '0x4200000000000000000000000000000000000006',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
};

/**
 * Map token to address for API. Use WETH address for native ETH so backend does not 500.
 */
function toTokenAddress(token, chainId) {
  if (!token) return ZERO_ADDRESS;
  if (isNativeToken(token)) {
    const weth = chainId != null && WETH_BY_CHAIN[chainId];
    return weth || ZERO_ADDRESS;
  }
  return token.address || ZERO_ADDRESS;
}

/**
 * Get quote from mangoServices (mangoContracts DEX routing)
 * @param {{ chainId: number, tokenIn: object, tokenOut: object, amountIn: string }}
 * @returns {Promise<{ amountOut: string, price: number, priceIn: number, priceOut: number, priceImpact?: number, estimated: boolean }>}
 */
export async function getQuote({ chainId, tokenIn, tokenOut, amountIn }) {
  const amt = parseFloat(amountIn);
  if (!amountIn || Number.isNaN(amt) || amt <= 0) {
    throw new Error('Invalid amount');
  }
  if (!tokenIn || !tokenOut) {
    throw new Error('Tokens required');
  }

  if (isPolygonBridgedWethSwap(chainId, tokenIn, tokenOut)) {
    throw new Error(POLYGON_USE_WMATIC_MESSAGE);
  }

  const baseUrl = getBaseUrl();
  if (!RAW_MANGO_SERVICES_URL) throw new Error('VITE_MANGO_SERVICES_URL not configured');

  const decimalsIn = tokenIn?.decimals ?? 18;
  const amountWei = parseUnits(String(amt), decimalsIn).toString();
  const sellToken = toTokenAddress(tokenIn, chainId);
  const buyToken = toTokenAddress(tokenOut, chainId);

  const params = new URLSearchParams({
    chainId: String(chainId),
    sellToken,
    buyToken,
    amountToSell: amountWei,
  });

  const url = `${baseUrl}/api/v1/swap/quote?${params}`;
  const data = await fetchJson(url);

  if (!data || typeof data !== 'object' || !data.amountOut) {
    throw new Error(data.error || 'No amountOut in quote response');
  }

  const decimalsOut = tokenOut?.decimals ?? 18;
  const amountOutWei = BigInt(data.amountOut);
  const amountOutFormatted = formatUnits(amountOutWei, decimalsOut);
  const amountOut = parseFloat(amountOutFormatted).toFixed(Math.min(decimalsOut, 8)).replace(/\.?0+$/, '') || '0';

  // Exchange rate: how many tokenOut per 1 tokenIn
  const exchangeRate = amt > 0 ? parseFloat(amountOut) / amt : 0;

  // USD prices per token unit.
  // Derive from whichever side is a known stablecoin ($1), then back-calculate the other.
  const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD', 'SUSD', 'USDP']);
  const outIsStable = STABLECOINS.has((tokenOut?.symbol ?? '').toUpperCase());
  const inIsStable  = STABLECOINS.has((tokenIn?.symbol  ?? '').toUpperCase());

  let usdPerTokenOut = 0;
  let usdPerTokenIn  = 0;

  if (outIsStable) {
    usdPerTokenOut = 1;
    usdPerTokenIn  = exchangeRate > 0 ? exchangeRate : 0;
  } else if (inIsStable) {
    usdPerTokenIn  = 1;
    usdPerTokenOut = exchangeRate > 0 ? 1 / exchangeRate : 0;
  }

  // Protocol fee: 3% (300 BPS) is already deducted from amountOut by the backend.
  const routerFeeBps = Number(data.routerFeeBps ?? 300);
  const routerFeePct = routerFeeBps / 100;
  const referralBucketPct = routerFeePct / 3;
  const l1ReferralPct = referralBucketPct * 0.40;

  return {
    amountOut,
    price: exchangeRate,
    priceIn:  usdPerTokenIn,
    priceOut: usdPerTokenOut,
    priceImpact: 0,
    estimated: false,
    routerFeePct,
    l1ReferralPct,
  };
}

/**
 * Get USD price for a token (for display)
 * Uses mangoServices quote with 1 unit vs USDC when available.
 * @param {{ chainId?: number, token: object }}
 * @returns {Promise<number>}
 */
export async function getTokenPriceUsd({ chainId, token }) {
  if (!token?.symbol) return 0;
  const cid = chainId === '' || chainId == null ? NaN : Number(chainId);
  if (!Number.isFinite(cid)) return 0;
  // Chain 0 = Bitcoin (and other non-EVM ids without USDC quote path) — price from backend / public CG only
  if (cid === 0) return 0;

  const baseUrl = getBaseUrl();
  if (!RAW_MANGO_SERVICES_URL) return 0;

  // USDC addresses per chain (aligned with tokenLists.js)
  const USDC_BY_CHAIN = {
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon native USDC
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  };
  // Use wrapped token for native assets so quote API can return a price (many routers expect WETH, not 0x0)
  const WRAPPED_NATIVE_BY_CHAIN = {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // WETH
    8453: '0x4200000000000000000000000000000000000006', // WETH Base
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH Arbitrum
    10: '0x4200000000000000000000000000000000000006',  // WETH Optimism
    137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',  // WMATIC
    43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',   // WBNB
  };
  const usdcAddr = USDC_BY_CHAIN[cid];
  if (!usdcAddr) return 0;

  let tokenAddr = toTokenAddress(token, cid);
  if (tokenAddr === usdcAddr) return 1;

  try {
    const decimals = token?.decimals ?? 18;
    const oneUnit = parseUnits('1', decimals).toString();
    const params = new URLSearchParams({
      chainId: String(cid),
      sellToken: tokenAddr,
      buyToken: usdcAddr,
      amountToSell: oneUnit,
    });
    const data = await fetchJson(`${baseUrl}/api/v1/swap/quote?${params}`);
    if (data.amountOut) {
      const usdcDecimals = 6;
      return Number(formatUnits(BigInt(data.amountOut), usdcDecimals));
    }
  } catch {
    // ignore
  }
  return 0;
}

/**
 * Known stablecoin prices — always $1.00. Short-circuits any API call and avoids
 * browser-side CoinGecko requests (which are CORS-blocked in production).
 */
const STABLECOIN_PRICE_USD = {
  USDC: 1, USDT: 1, DAI: 1, BUSD: 1, TUSD: 1, USDP: 1, FRAX: 1, LUSD: 1,
  SUSD: 1, CUSD: 1, CEUR: 1, USDD: 1, GUSD: 1, USDX: 1, XUSD: 1,
};

/**
 * Backend USD price (GET /api/v1/price?symbol=).
 * Use when quote API returns 0 (e.g. Bitcoin chain, or no DEX path).
 * @param {string} symbol - Token symbol (ETH, USDC, BTC, etc.)
 * @returns {Promise<number>}
 */
export async function getTokenPriceUsdFromBackend(symbol) {
  if (!symbol) return 0;
  const upper = String(symbol).toUpperCase();

  // Stablecoins are always $1 — skip any network call.
  if (STABLECOIN_PRICE_USD[upper] !== undefined) return STABLECOIN_PRICE_USD[upper];

  if (RAW_MANGO_SERVICES_URL) {
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(
        `${baseUrl}/api/v1/price?symbol=${encodeURIComponent(upper)}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        const price = data?.usd ?? data?.price;
        if (typeof price === 'number' && price > 0) return price;
      }
    } catch {
      // fall through — return 0 rather than making a CORS-blocked browser request
    }
  }

  // No browser-side CoinGecko fallback: the public API blocks cross-origin requests
  // in production (CORS + 429). Prices come from the backend proxy only.
  return 0;
}
