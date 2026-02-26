/**
 * Resolve token logo URL by chain and contract address.
 * Used for "Add by contract address" and any token without logoURI.
 */

/** Trust Wallet assets chain folder names by chainId */
const TRUSTWALLET_CHAIN = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum_one',
  56: 'smartchain',
  137: 'polygon',
  10: 'optimism',
  43114: 'avalanchec',
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
  const addr = tokenAddress.toLowerCase();
  return `${TRUSTWALLET_BASE}/${folder}/assets/${addr}/logo.png`;
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
    const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${tokenAddress.toLowerCase()}`;
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
