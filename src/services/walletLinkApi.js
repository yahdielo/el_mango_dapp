/**
 * Wallet Link API — links non-EVM addresses (Solana, Tron, Bitcoin, XRP, Sui)
 * to the user's EVM address so cross-chain referral fees are properly attributed.
 *
 * Endpoints:
 *   GET  /api/v1/wallet-link/nonce/:evmAddress    → { evmAddress, nonce }
 *   GET  /api/v1/wallet-link/:evmAddress           → { solana, tron, xrp, sui, bitcoin }
 *   POST /api/v1/wallet-link                       → { success }
 */

import { resolveMangoServicesBaseUrl } from '../utils/mangoServicesBaseUrl';

const RAW_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || '').replace(/\/$/, '');
const BASE = resolveMangoServicesBaseUrl(RAW_BASE);
const API_KEY = import.meta.env.VITE_MANGO_SERVICES_API_KEY || '';

function headers() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

async function fetchOk(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `API error: ${res.status}`);
  return data;
}

/** Get a one-time nonce for signing the wallet link message. */
export async function getWalletLinkNonce(evmAddress) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  return fetchOk(`${BASE}/api/v1/wallet-link/nonce/${encodeURIComponent(evmAddress)}`, { method: 'GET' });
}

/**
 * Build the message the EVM wallet must sign — must match the server exactly.
 * @param {string} chainType  'solana' | 'tron' | 'bitcoin' | 'xrp' | 'sui'
 * @param {string} foreignAddress  The non-EVM address
 * @param {string} evmAddress  The EVM address (lowercased)
 * @param {string} nonce
 */
export function buildWalletLinkMessage({ chainType, foreignAddress, evmAddress, nonce }) {
  const evm = String(evmAddress || '').toLowerCase().trim();
  return [
    `MangoSwap: Link my ${chainType} wallet`,
    `${chainType} address: ${foreignAddress}`,
    `EVM address: ${evm}`,
    `Nonce: ${nonce}`,
    'By signing, you confirm both addresses belong to you.',
  ].join('\n');
}

/** Submit the signed wallet link request. */
export async function linkWallet({ evmAddress, foreignAddress, chainType, signature, nonce }) {
  if (!RAW_BASE) throw new Error('VITE_MANGO_SERVICES_URL not set');
  return fetchOk(`${BASE}/api/v1/wallet-link`, {
    method: 'POST',
    body: JSON.stringify({ evmAddress, foreignAddress, chainType, signature, nonce }),
  });
}

/** Get all linked non-EVM addresses for an EVM address. */
export async function getLinkedWallets(evmAddress) {
  if (!RAW_BASE) return null;
  try {
    return await fetchOk(`${BASE}/api/v1/wallet-link/${encodeURIComponent(evmAddress)}`, { method: 'GET' });
  } catch {
    return null;
  }
}
