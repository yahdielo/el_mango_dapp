/**
 * Quote API using mangoServices (mangoContracts DEX routing)
 * Uses real amountOut from DEX via mangoServices GET /api/v1/swap/quote
 * No CoinGecko - mangoServices evmDEX calls getAmountsOut on chain-specific routers
 */

import { parseUnits, formatUnits } from 'viem';
import { ZERO_ADDRESS } from '../utils/chainConfig';
import { isNativeToken } from '../hooks/useTokenBalance';

const MANGO_SERVICES_URL = import.meta.env.VITE_MANGO_SERVICES_URL || '';

/** When app is HTTPS, use HTTPS for API to avoid Mixed Content block. */
function getBaseUrl() {
  const raw = (MANGO_SERVICES_URL || '').replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && raw.startsWith('http://')) {
    return raw.replace(/^http:\/\//i, 'https://');
  }
  return raw;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `API error: ${res.status}`);
    }
    return res.json();
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

/**
 * Map token to address for API (native = 0x0)
 */
function toTokenAddress(token) {
  if (!token) return ZERO_ADDRESS;
  if (isNativeToken(token)) return ZERO_ADDRESS;
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

  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('VITE_MANGO_SERVICES_URL not configured');
  }

  const decimalsIn = tokenIn?.decimals ?? 18;
  const amountWei = parseUnits(String(amt), decimalsIn).toString();
  const sellToken = toTokenAddress(tokenIn);
  const buyToken = toTokenAddress(tokenOut);

  const params = new URLSearchParams({
    chainId: String(chainId),
    sellToken,
    buyToken,
    amountToSell: amountWei,
  });

  const url = `${baseUrl}/api/v1/swap/quote?${params}`;
  const data = await fetchJson(url);

  if (!data.amountOut) {
    throw new Error(data.error || 'No amountOut in quote response');
  }

  const decimalsOut = tokenOut?.decimals ?? 18;
  const amountOutWei = BigInt(data.amountOut);
  const amountOutFormatted = formatUnits(amountOutWei, decimalsOut);
  const amountOut = parseFloat(amountOutFormatted).toFixed(Math.min(decimalsOut, 8)).replace(/\.?0+$/, '') || '0';

  const price = amt > 0 ? parseFloat(amountOut) / amt : 0;
  const priceIn = amt > 0 ? 1 : 0;
  const priceOut = parseFloat(amountOut) > 0 ? amt / parseFloat(amountOut) : 0;

  return {
    amountOut,
    price,
    priceIn,
    priceOut,
    priceImpact: 0,
    estimated: false, // from DEX, not estimated
  };
}

/**
 * Get USD price for a token (for display)
 * Uses mangoServices quote with 1 unit vs USDC when available.
 * @param {{ chainId?: number, token: object }}
 * @returns {Promise<number>}
 */
export async function getTokenPriceUsd({ chainId, token }) {
  if (!token?.symbol || !chainId) return 0;

  const baseUrl = getBaseUrl();
  if (!baseUrl) return 0;

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
  const usdcAddr = USDC_BY_CHAIN[chainId];
  if (!usdcAddr) return 0;

  let tokenAddr = toTokenAddress(token);
  if (tokenAddr === usdcAddr) return 1;
  // For native token, try wrapped address so quote API can return price
  if (isNativeToken(token) && WRAPPED_NATIVE_BY_CHAIN[chainId]) {
    tokenAddr = WRAPPED_NATIVE_BY_CHAIN[chainId];
  }

  try {
    const decimals = token?.decimals ?? 18;
    const oneUnit = parseUnits('1', decimals).toString();
    const params = new URLSearchParams({
      chainId: String(chainId),
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
 * Optional: backend USD price (e.g. GET /api/v1/price?symbol=ETH).
 * Use when quote API returns 0 for cross-chain. Backend can proxy CoinGecko server-side to avoid CORS.
 * @param {string} symbol - Token symbol (ETH, USDC, etc.)
 * @returns {Promise<number>}
 */
export async function getTokenPriceUsdFromBackend(symbol) {
  if (!symbol) return 0;
  const baseUrl = getBaseUrl();
  if (!baseUrl) return 0;
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/price?symbol=${encodeURIComponent(symbol.toUpperCase())}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const price = data?.usd ?? data?.price;
    return typeof price === 'number' ? price : 0;
  } catch {
    return 0;
  }
}
