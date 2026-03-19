/**
 * Chain Configuration Service
 * Provides centralized access to chain configurations from chains.json
 * and env-based contract addresses (VITE_*).
 */
import chainsData from '../chains.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Static references for Vite env replacement
const ENV_ROUTERS = {
  1: import.meta.env.VITE_ETHEREUM_ROUTER,
  10: import.meta.env.VITE_OPTIMISM_ROUTER,
  56: import.meta.env.VITE_BSC_ROUTER,
  137: import.meta.env.VITE_POLYGON_ROUTER,
  8453: import.meta.env.VITE_BASE_ROUTER,
  42161: import.meta.env.VITE_ARBITRUM_ROUTER,
  43114: import.meta.env.VITE_AVALANCHE_ROUTER,
};

/**
 * Get all chains
 */
export function getAllChains() {
  return chainsData;
}

/**
 * Get chain by ID
 * @param {number|string} chainId
 * @returns {Object|null} Chain config or null
 */
export function getChain(chainId) {
  if (chainId == null) return null;
  const id = chainId === 0 ? '0' : String(chainId);
  return chainsData.find((c) => String(c.chainId) === id) || null;
}

/**
 * Get referrer address for swap.
 *
 * IMPORTANT:
 * `chains.json` stores `contracts.referral` as the deployed `MangoReferral` contract address.
 * The router `swap(..., referrer)` parameter expects the referrer *address* (e.g. an
 * evangelist/affiliate wallet), not the referral contract.
 *
 * To avoid blocking swaps when referral is not configured/funded, default to ZERO_ADDRESS
 * unless the app explicitly provides `VITE_REFERRER_ADDRESS`.
 * @param {number} chainId
 * @returns {string} Referrer address or ZERO_ADDRESS if not configured
 */
export function getReferrerAddress(chainId) {
  const envAddr = import.meta.env.VITE_REFERRER_ADDRESS;
  if (envAddr && typeof envAddr === 'string' && envAddr.startsWith('0x')) return envAddr;
  // Default: no referral.
  return ZERO_ADDRESS;
}

/**
 * Get router address for chain
 * Checks VITE_* env vars first, then chains.json contracts.router
 * @param {number} chainId
 * @returns {string|null}
 */
export function getRouterAddress(chainId) {
  const addr = ENV_ROUTERS[chainId];
  if (addr && typeof addr === 'string') return addr;
  const chain = getChain(chainId);
  return chain?.contracts?.router || null;
}

/**
 * Get slippage settings for chain
 * @param {number} chainId
 * @returns {{ default: number, min: number, max: number }}
 */
export function getSlippage(chainId) {
  const chain = getChain(chainId);
  if (!chain?.slippage) {
    return { default: 0.5, min: 0.1, max: 5.0 };
  }
  return {
    default: chain.slippage.default ?? 0.5,
    min: chain.slippage.min ?? 0.1,
    max: chain.slippage.max ?? 5.0,
  };
}

/**
 * Get gas settings for chain
 * @param {number} chainId
 * @returns {{ gasLimit: number, maxFeePerGas: number|null, maxPriorityFeePerGas: number|null, gasPrice: number|null }}
 */
export function getGasSettings(chainId) {
  const chain = getChain(chainId);
  if (!chain?.gasSettings) {
    return {
      gasLimit: 500000,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: null,
    };
  }
  return {
    gasLimit: chain.gasSettings.gasLimit ?? 500000,
    maxFeePerGas: chain.gasSettings.maxFeePerGas ?? null,
    maxPriorityFeePerGas: chain.gasSettings.maxPriorityFeePerGas ?? null,
    gasPrice: chain.gasSettings.gasPrice ?? null,
  };
}

/**
 * Get native currency for chain (symbol, decimals)
 * @param {number} chainId
 * @returns {{ symbol: string, decimals: number }}
 */
export function getNativeCurrency(chainId) {
  const chain = getChain(chainId);
  const native = chain?.nativeCurrency;
  if (!native) return { symbol: 'ETH', decimals: 18 };
  return {
    symbol: native.symbol ?? 'ETH',
    decimals: native.decimals ?? 18,
  };
}

/**
 * Get block explorer URL for a transaction
 * @param {number} chainId
 * @param {string} txHash
 * @returns {string}
 */
export function getExplorerUrl(chainId, txHash) {
  const chain = getChain(chainId);
  const base = chain?.blockExplorers?.[0]?.url;
  if (!base) return `https://etherscan.io/tx/${txHash}`;
  const sep = base.endsWith('/') ? '' : '/';
  return `${base}${sep}tx/${txHash}`;
}
