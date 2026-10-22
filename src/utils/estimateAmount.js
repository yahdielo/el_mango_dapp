const HUMAN_UNIT_PROVIDERS = new Set(['layerswap', 'thorchain']);

/**
 * Convert the `amountOut` of GET /api/v1/swap/estimate to a human-readable string.
 *
 * Units depend on the provider that priced the route:
 * - LayerSwap and THORChain return human-readable amounts ("10" = 10 USDC).
 * - Rango (route.outputAmount) and LiFi (estimate.toAmount) return the token's
 *   smallest unit ("10000000" = 10 USDC).
 * A value with a decimal point is always human-readable.
 *
 * @param {string|number|null|undefined} amountOut
 * @param {string|null|undefined} provider - `provider` field of the estimate response
 * @param {number} decimals - destination token decimals
 * @returns {string|null}
 */
export function estimateAmountOutToHuman(amountOut, provider, decimals = 18) {
  if (amountOut == null || amountOut === '') return null;
  const value = String(amountOut).trim();

  if (HUMAN_UNIT_PROVIDERS.has(String(provider || '').toLowerCase()) || !/^\d+$/.test(value)) {
    return value;
  }

  const d = Number(decimals);
  const divisor = 10n ** BigInt(d);
  const raw = BigInt(value);
  const whole = raw / divisor;
  const remainder = raw % divisor;
  if (remainder === 0n) return whole.toString();
  const frac = remainder.toString().padStart(d, '0').replace(/0+$/, '');
  return `${whole}.${frac}`;
}
