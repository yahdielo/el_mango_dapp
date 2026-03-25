/**
 * Must match mangoswap/mangoServices/src/services/squidOnlyPairs.ts.
 * Used so LayerSwap-only UI rules do not block Squid corridors.
 */
const SQUID_PAIRS = [
  [43114, 1], // Avalanche → Ethereum
];

export function isSquidOnlyPair(sourceChainId, destChainId) {
  const s = Number(sourceChainId);
  const d = Number(destChainId);
  return SQUID_PAIRS.some(([a, b]) => a === s && b === d);
}
