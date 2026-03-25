/**
 * Must match mangoswap/mangoServices/src/services/lifiOnlyPairs.ts.
 * Used so LayerSwap UI rules do not block LiFi corridors.
 * NOTE: Some of these corridors still have LayerSwap exclusive token pairs
 *       (e.g. BSC→ETH USDT/USDC stay LayerSwap). Check isLayerSwapVerifiedCrossAssetCorridor
 *       before assuming LiFi handles a given token combo.
 */
const LIFI_PAIRS = [
  // BSC → * (6 pairs)
  [56, 1],
  [56, 10],
  [56, 137],
  [56, 8453],
  [56, 42161],
  [56, 43114],
  // Arbitrum → * (2 pairs)
  [42161, 8453],
  [42161, 43114],
  // Avalanche → * (5 pairs)
  [43114, 10],
  [43114, 56],
  [43114, 137],
  [43114, 8453],
  [43114, 42161],
  // Ethereum → * (6 pairs)
  [1, 56],
  [1, 10],
  [1, 137],
  [1, 8453],
  [1, 42161],
  [1, 43114],
  // Monad
  [1, 143],
  [143, 1],
];

export function isLifiOnlyPair(sourceChainId, destChainId) {
  const s = Number(sourceChainId);
  const d = Number(destChainId);
  return LIFI_PAIRS.some(([a, b]) => a === s && b === d);
}
