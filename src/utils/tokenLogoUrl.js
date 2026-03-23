/**
 * Resolve token logo URL by chain and contract address.
 * Used for "Add by contract address" and any token without logoURI.
 */

import { getAddress } from 'viem';

/** Trust Wallet assets chain folder names by chainId */
const TRUSTWALLET_CHAIN = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  56: 'smartchain',
  137: 'polygon',
  10: 'optimism',
  43114: 'avalanchec',
  34443: 'mode',
  5000: 'mantle',
  80094: 'berachain',
  42220: 'celo',
  252: 'fraxtal',
  167000: 'taiko',
  1329: 'sei',
  480: 'world',
  143: 'monad',
  7000: 'zetachain',
  48900: 'zircuit',
  81457: 'blast',
  59144: 'linea',
};

const TRUSTWALLET_BASE = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';

/**
 * Get a candidate logo URL for a token (Trust Wallet assets).
 * Returns null if chain not mapped. The image may 404; TokenLogo handles fallback.
 * @param {number} chainId
 * @param {string} tokenAddress - checksummed or lowercase
 * @returns {string|null}
 */
export function getTrustWalletLogoUrl(chainId, tokenAddress) {
  const folder = TRUSTWALLET_CHAIN[chainId];
  if (!folder || !tokenAddress) return null;
  const raw = String(tokenAddress).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    try {
      return `${TRUSTWALLET_BASE}/${folder}/assets/${getAddress(raw)}/logo.png`;
    } catch {
      /* fall through */
    }
  }
  return `${TRUSTWALLET_BASE}/${folder}/assets/${raw.toLowerCase()}/logo.png`;
}

/**
 * Return multiple Trust Wallet URL candidates because address casing in upstream
 * metadata can vary while repository paths can be case-sensitive.
 */
export function getTrustWalletLogoCandidates(chainId, tokenAddress) {
  const folder = TRUSTWALLET_CHAIN[chainId];
  if (!folder || !tokenAddress) return [];
  const raw = String(tokenAddress).trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const set = new Set([
    `${TRUSTWALLET_BASE}/${folder}/assets/${raw}/logo.png`,
    `${TRUSTWALLET_BASE}/${folder}/assets/${lower}/logo.png`,
  ]);
  // Trust Wallet repos use checksummed paths; lowercase-only URLs often 404 (Base/Arbitrum USDC, etc.).
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    try {
      const checksummed = getAddress(raw);
      set.add(`${TRUSTWALLET_BASE}/${folder}/assets/${checksummed}/logo.png`);
    } catch {
      /* non-checksummable hex */
    }
  }
  return Array.from(set);
}

/**
 * Try to fetch token image from CoinGecko (public, no key) by contract.
 * Uses /coins/list with platform to resolve id, then /coins/{id} for image. Heavy.
 * Alternatively we could use a simple fetch to a known endpoint. Skip for now to avoid rate limits.
 * @param {number} chainId
 * @param {string} tokenAddress
 * @returns {Promise<string|null>}
 */
export async function fetchTokenLogoFromCoinGecko(chainId, tokenAddress) {
  const platformMap = { 1: 'ethereum', 8453: 'base', 42161: 'arbitrum-one', 56: 'binance-smart-chain', 137: 'polygon-pos', 10: 'optimistic-ethereum', 43114: 'avalanche' };
  const platform = platformMap[chainId];
  if (!platform) return null;
  try {
    const key = import.meta.env.VITE_COINGECKO_API_KEY;
    const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${tokenAddress.toLowerCase()}${key ? `?x_cg_demo_api_key=${encodeURIComponent(key)}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const img = data?.image?.large || data?.image?.small || data?.image?.thumb;
    return img || null;
  } catch {
    return null;
  }
}

/**
 * Best-effort logo URL for a token: Trust Wallet URL (instant) or try CoinGecko.
 * @param {number} chainId
 * @param {string} tokenAddress
 * @param {boolean} tryCoinGecko - if true, try CoinGecko when Trust Wallet URL is used (still use TW URL first; CoinGecko can be used to verify or as fallback in UI)
 * @returns {Promise<string|null>}
 */
export async function getTokenLogoUrl(chainId, tokenAddress) {
  const tw = getTrustWalletLogoUrl(chainId, tokenAddress);
  const cg = await fetchTokenLogoFromCoinGecko(chainId, tokenAddress);
  return cg || tw || null;
}
