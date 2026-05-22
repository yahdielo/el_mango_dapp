/**
 * Bridgers (AllchainBridge) verified cross-chain corridors.
 * All pairs tested live against https://api.bridgers.xyz/api/sswap/quote (resCode 100).
 * Last verified: 2026-05-22
 *
 * Bridgers acts as the backend fallback when LiFi returns a 404/no-route for a pair.
 * The frontend uses this config only for:
 *   1. Provider label display ("Auto" pre-swap on Bridgers corridors).
 *   2. Unlocking Mantle (5000) from LayerSwap-only mode.
 *
 * Fee: 0.3% flat | Estimated time: ~10 s | Min: ~$5 USDC/USDT, ~$15 BSC USDC source
 */

/**
 * Chain pairs where Bridgers provides unique coverage
 * (LiFi either 404s or Bridgers is the primary fallback).
 * [sourceChainId, destChainId]
 */
const BRIDGERS_PAIRS = [
  // Optimism as source — LiFi 404s for USDT; Bridgers handles all tokens
  [10, 1],      // OPT → ETH
  [10, 56],     // OPT → BSC
  [10, 137],    // OPT → Polygon
  [10, 8453],   // OPT → Base

  // Mantle as source — native MNT exit via Bridgers
  [5000, 1],    // MNT → ETH
  [5000, 56],   // MNT → BSC

  // Mantle as destination — native MNT entry via Bridgers
  [1, 5000],    // ETH → MNT
  [10, 5000],   // OPT → MNT

  // Polygon native (MATIC) — available via Bridgers; LiFi may also handle
  [137, 1],     // MATIC → ETH  (native)
  [137, 56],    // MATIC → BSC  (native)
];

/**
 * Returns true when this chain pair has a verified Bridgers route.
 * Use for pre-swap provider label ("Auto") and corridor hints.
 */
export function isBridgersPair(sourceChainId, destChainId) {
  const s = Number(sourceChainId);
  const d = Number(destChainId);
  return BRIDGERS_PAIRS.some(([a, b]) => a === s && b === d);
}

/**
 * Tokens Bridgers verifiably supports per chain.
 * address '0x00…00' = native currency.
 */
export const BRIDGERS_TOKENS = {
  1: [
    { symbol: 'ETH',  address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
    { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  ],
  56: [
    { symbol: 'BNB',  address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'USDT', address: '0x55d398326f99059ff775485246999027b3197955' },
    { symbol: 'USDC', address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d' },
  ],
  137: [
    { symbol: 'MATIC', address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'USDT',  address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' },
    { symbol: 'USDC',  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359' },
  ],
  8453: [
    { symbol: 'ETH',  address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'USDC', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },
  ],
  10: [
    { symbol: 'ETH',  address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'USDT', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' },
    { symbol: 'USDC', address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85' },
  ],
  5000: [
    { symbol: 'MNT', address: '0x0000000000000000000000000000000000000000' },
  ],
};
