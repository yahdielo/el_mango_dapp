/**
 * Must match mangoswap/mangoServices/src/services/symbiosisOnlyPairs.ts.
 * Group A — Solana ↔ EVM (10 pairs)
 * Group B — SEI ↔ Ethereum (USDC/USDT; no LayerSwap routes)
 * Group C — Monad ↔ Ethereum (USDC; no LayerSwap routes)
 */
const PAIRS = [
  // Group A: Solana ↔ EVM
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
  // Group B: SEI ↔ Ethereum
  [1, 1329],
  [1329, 1],
  // Group C: Monad ↔ Ethereum
  [1, 143],
  [143, 1],
];

export function isSymbiosisOnlyPair(sourceChainId, destChainId) {
  const s = Number(sourceChainId);
  const d = Number(destChainId);
  return PAIRS.some(([a, b]) => a === s && b === d);
}
