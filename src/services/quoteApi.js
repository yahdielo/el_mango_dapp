/**
 * Quote API using mangoServices (mangoContracts DEX routing)
 * Uses real amountOut from DEX via mangoServices GET /api/v1/swap/quote
 * No CoinGecko - mangoServices evmDEX calls getAmountsOut on chain-specific routers
 */

import { parseUnits, formatUnits } from 'viem';
import { ZERO_ADDRESS } from '../utils/chainConfig';
import { isNativeToken } from '../hooks/useTokenBalance';

const MANGO_SERVICES_URL = import.meta.env.VITE_MANGO_SERVICES_URL || '';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
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

  const baseUrl = (MANGO_SERVICES_URL || '').replace(/\/$/, '');
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

  const baseUrl = (MANGO_SERVICES_URL || '').replace(/\/$/, '');
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
  const usdcAddr = USDC_BY_CHAIN[chainId];
  if (!usdcAddr) return 0;

  const tokenAddr = toTokenAddress(token);
  if (tokenAddr === usdcAddr) return 1;

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
