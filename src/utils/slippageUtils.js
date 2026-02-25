/**
 * Slippage utilities for swap
 * Basis points: 10000 = 100%, 50 = 0.5%
 */

/**
 * Get slippage tolerance in basis points
 * @param {number} chainId
 * @param {Object} chainConfig - Must have getSlippage(chainId)
 * @param {number} [customPercent] - Optional override (e.g. 0.5 for 0.5%)
 * @returns {number} Basis points (e.g. 50 for 0.5%)
 */
export function getSlippageToleranceInBasisPoints(chainId, chainConfig, customPercent = null) {
  if (!chainId || !chainConfig?.getSlippage) return 50;
  const s = chainConfig.getSlippage(chainId);
  const percent = customPercent != null ? customPercent : (s?.default ?? 0.5);
  return Math.round(Number(percent) * 100);
}

/**
 * Calculate minimum amount out given slippage
 * amountOutMin = amountOut * (10000 - slippageBps) / 10000
 * @param {bigint|string|number} amountOut - Expected output amount
 * @param {number} slippageBps - Slippage in basis points (e.g. 50 for 0.5%)
 * @returns {bigint} Minimum amount out
 */
export function amountOutMin(amountOut, slippageBps) {
  const amt = typeof amountOut === 'bigint' ? amountOut : BigInt(String(Math.floor(Number(amountOut))));
  const bps = Number(slippageBps);
  const mult = Math.max(0, 10000 - bps);
  return (amt * BigInt(mult)) / 10000n;
}
