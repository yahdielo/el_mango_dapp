/**
 * Must match mangoswap/mangoServices/src/services/symbiosisOnlyPairs.ts (10 Solana↔EVM pairs).
 * Used so LayerSwap-only UI rules do not block Symbiosis corridors when VITE_BRIDGE_PROVIDER=layerswap.
 */
const PAIRS = [
  [56, 501111],
  [42161, 501111],
  [43114, 501111],
  [501111, 1],
  [501111, 10],
  [501111, 56],
  [501111, 137],
  [501111, 8453],
  [501111, 42161],
  [501111, 43114],
];

export function isSymbiosisOnlyPair(sourceChainId, destChainId) {
  const s = Number(sourceChainId);
  const d = Number(destChainId);
  return PAIRS.some(([a, b]) => a === s && b === d);
}
