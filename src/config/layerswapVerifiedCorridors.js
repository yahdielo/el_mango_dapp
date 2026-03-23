/**
 * LayerSwap corridors verified via GET /api/v2/sources?destination_network=…
 * (see mangoswap/docs/LAYERSWAP_APP_TABLE_ROUTE_VERIFICATION.md).
 *
 * Used by the dapp to allow LayerSwap mode for these cross-asset pairs (not only same-symbol).
 * Keep in sync with that doc when LayerSwap coverage changes.
 */

/** @param {string|undefined} symbol */
function normSym(symbol) {
  const s = String(symbol || '')
    .toUpperCase()
    .trim();
  if (s === 'WETH' || s === 'ETH') return 'ETH';
  if (s === 'WMATIC' || s === 'MATIC' || s === 'POL') return 'POL';
  if (s === 'WBNB' || s === 'BNB') return 'BNB';
  if (s === 'WAVAX' || s === 'AVAX') return 'AVAX';
  if (s === 'USDC.E' || s === 'USDCE') return 'USDC';
  if (s === 'USDT') return 'USDT';
  if (s === 'USDC') return 'USDC';
  if (s === 'WBTC') return 'WBTC';
  if (s === 'BTC') return 'BTC';
  if (s === 'SOL') return 'SOL';
  if (s === 'TRX') return 'TRX';
  return s;
}

function key(sc, dc, a, b) {
  return `${Number(sc)}|${Number(dc)}|${a}|${b}`;
}

// Cross-asset only (same-symbol pairs use sameAssetCrossChainPair in the UI).
const CROSS_ASSET_KEYS = new Set([
  // 5.1 Base ETH → Polygon / BSC / Avalanche (native)
  key(8453, 137, 'ETH', 'POL'),
  key(8453, 56, 'ETH', 'BNB'),
  key(8453, 43114, 'ETH', 'AVAX'),
  // 5.2 Ethereum ETH → Polygon / BSC / Avalanche
  key(1, 137, 'ETH', 'POL'),
  key(1, 56, 'ETH', 'BNB'),
  key(1, 43114, 'ETH', 'AVAX'),
  // 5.3 Arbitrum ETH → Polygon / BSC
  key(42161, 137, 'ETH', 'POL'),
  key(42161, 56, 'ETH', 'BNB'),
  // 5.2 Ethereum WBTC → Bitcoin BTC
  key(1, 0, 'WBTC', 'BTC'),
]);

/**
 * True if this chain + token pair is a known LayerSwap cross-asset corridor (per docs).
 * @param {number|string} sourceChainId
 * @param {number|string} destChainId
 * @param {string|undefined} tokenInSymbol
 * @param {string|undefined} tokenOutSymbol
 */
export function isLayerSwapVerifiedCrossAssetCorridor(
  sourceChainId,
  destChainId,
  tokenInSymbol,
  tokenOutSymbol,
) {
  const sc = Number(sourceChainId);
  const dc = Number(destChainId);
  if (!Number.isFinite(sc) || !Number.isFinite(dc)) return false;
  const a = normSym(tokenInSymbol);
  const b = normSym(tokenOutSymbol);
  if (!a || !b) return false;
  return CROSS_ASSET_KEYS.has(key(sc, dc, a, b));
}

export { normSym as normalizeSymbolForLayerSwapCorridor };
