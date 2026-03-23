/**
 * LayerSwap Bridge API client
 * Thin wrapper around LayerSwap public REST API
 */

const API_BASE = 'https://api.layerswap.io/api/v2';

const CHAIN_ID_TO_NETWORK = {
  // EVM
  1: 'ETHEREUM_MAINNET',
  10: 'OPTIMISM_MAINNET',
  56: 'BSC_MAINNET',
  137: 'POLYGON_MAINNET',
  8453: 'BASE_MAINNET',
  42161: 'ARBITRUM_MAINNET',
  43114: 'AVAX_MAINNET',
  34443: 'MODE_MAINNET',
  5000: 'MANTLE_MAINNET',
  80094: 'BERACHAIN_MAINNET',
  42220: 'CELO_MAINNET',
  252: 'FRAXTAL_MAINNET',
  167000: 'TAIKO_MAINNET',
  1329: 'SEI_MAINNET',
  480: 'WORLDCHAIN_MAINNET',
  143: 'MONAD_MAINNET',
  7000: 'ZETACHAIN_MAINNET',
  48900: 'ZIRCUIT_MAINNET',
  81457: 'BLAST_MAINNET',
  122: 'FUSE_MAINNET',
  1890: 'LIGHTLINK_MAINNET',
  59144: 'LINEA_MAINNET',
  911001: 'HYPERLIQUID_MAINNET',
  911002: 'TON_MAINNET',
  911003: 'PARADEX_MAINNET',
  911004: 'LOOPRING_MAINNET',
  // Non-EVM (LayerSwap - per CROSS_CHAIN_SWAP_IMPLEMENTATION_COMPLETE.md)
  0: 'BITCOIN_MAINNET',
  501111: 'SOLANA_MAINNET',
  728126428: 'TRON_MAINNET',
  144: 'XRP_MAINNET',
  101: 'SUI_MAINNET',
};

function getNetworkName(chainId) {
  const id = Number(chainId);
  return CHAIN_ID_TO_NETWORK[id] ?? null;
}

/** Keep in sync with `mangoServices/src/utils/layerswapOnlyChains.ts` */
export const LAYERSWAP_ONLY_CHAIN_IDS = new Set([
  34443, 5000, 80094, 42220, 252, 167000, 1329, 480, 143, 7000, 48900,
  81457, 122, 1890, 59144, 911001, 911002, 911003, 911004,
]);

function getTokenSymbol(token) {
  if (!token?.symbol) return null;
  const s = token.symbol.toUpperCase();
  if (s === 'WETH' || s === 'ETH') return 'ETH';
  // Keep WBTC as WBTC for LayerSwap source_token; destination uses BTC on Bitcoin.
  return s;
}

async function fetchApi(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `API error ${res.status}`;
    throw new Error(msg);
  }
  if (data?.error) {
    throw new Error(data.error.message || 'Bridge API error');
  }
  return data;
}

/**
 * Initiate a cross-chain swap
 * @param {Object} params
 * @param {number} params.sourceChainId
 * @param {number} params.destChainId
 * @param {Object} params.tokenIn
 * @param {Object} params.tokenOut
 * @param {string} params.amountIn
 * @param {string} params.recipient - Destination wallet address
 * @returns {Promise<{ swapId: string, depositActions?: Array, depositUrl?: string }>}
 */
export async function initiateSwap({ sourceChainId, destChainId, tokenIn, tokenOut, amountIn, recipient }) {
  const sourceNetwork = getNetworkName(sourceChainId);
  const destNetwork = getNetworkName(destChainId);
  const sourceToken = getTokenSymbol(tokenIn);
  const destToken = getTokenSymbol(tokenOut);

  if (!sourceNetwork || !destNetwork || !sourceToken || !destToken || !recipient) {
    throw new Error('Missing required parameters for bridge swap');
  }

  const amount = parseFloat(amountIn);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const body = {
    source_network: sourceNetwork,
    source_token: sourceToken,
    destination_network: destNetwork,
    destination_token: destToken,
    destination_address: recipient,
    amount,
    use_deposit_address: true,
  };

  const data = await fetchApi('/swaps', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const swap = data?.data?.swap;
  const depositActions = data?.data?.deposit_actions;

  if (!swap?.id) {
    throw new Error('No swap ID returned from bridge');
  }

  let depositUrl = null;
  if (depositActions?.length) {
    const action = depositActions[0];
    if (action?.to_address) {
      const network = action?.network;
      const txExplorer = network?.transaction_explorer_template;
      if (txExplorer) {
        depositUrl = txExplorer.replace('{tx_hash}', '');
      }
    }
  }

  return {
    swapId: swap.id,
    depositActions: depositActions || [],
    depositUrl,
    swap,
  };
}

/**
 * Get swap status
 * @param {string} swapId
 * @returns {Promise<{ status: string, swap?: Object, depositActions?: Array }>}
 */
export async function getStatus(swapId) {
  if (!swapId) throw new Error('swapId required');
  const data = await fetchApi(`/swaps/${swapId}`);
  const swap = data?.data?.swap;
  const depositActions = data?.data?.deposit_actions;

  const status = swap?.status ?? 'unknown';

  return {
    status,
    swap,
    depositActions,
  };
}

/**
 * Check if a route is supported by the bridge
 * @param {number} sourceChainId
 * @param {number} destChainId
 * @param {string} sourceToken - symbol
 * @param {string} destToken - symbol
 * @returns {Promise<boolean>}
 */
export async function isRouteSupported(sourceChainId, destChainId, sourceToken, destToken) {
  const destNetwork = getNetworkName(destChainId);
  if (!destNetwork) return false;

  try {
    // Query by destination network only.
    // Some LayerSwap native destination tokens (e.g. FRAX/MON/SEI/ZETA) can return
    // ROUTE_NOT_FOUND_ERROR when destination_token is provided, despite the network
    // itself being valid and routable for other assets.
    const data = await fetchApi(
      `/sources?destination_network=${encodeURIComponent(destNetwork)}`
    );
    const sources = data?.data ?? [];
    const sourceNetwork = getNetworkName(sourceChainId);
    const sourceSym = (sourceToken?.symbol || sourceToken || '').toUpperCase();
    let srcTk = sourceSym === 'WETH' || sourceSym === 'ETH' ? 'ETH' : sourceSym;
    if (srcTk === 'USDC.E' || srcTk === 'USDCE') srcTk = 'USDC';
    if (!sourceNetwork || !srcTk) return false;

    const match = sources.find(
      (s) => s?.name === sourceNetwork && s?.tokens?.some((t) => (t?.symbol || '').toUpperCase() === srcTk)
    );
    return !!match;
  } catch {
    return false;
  }
}

/** Chain IDs supported by LayerSwap (EVM networks) */
export const LAYERSWAP_CHAIN_IDS = Object.keys(CHAIN_ID_TO_NETWORK).map(Number);

export function isChainSupportedByLayerSwap(chainId) {
  return getNetworkName(chainId) != null;
}

export { getNetworkName, CHAIN_ID_TO_NETWORK };
