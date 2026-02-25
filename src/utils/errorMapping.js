/**
 * Maps wallet/contract/RPC/API errors to short, actionable user messages.
 * Covers: mangoContracts (MangoRouter, MangoReferral), mangoServices (quote/cross-chain),
 * LayerSwap bridge, viem/wagmi, and validation errors.
 */

const REJECT_PATTERNS = [
  /user rejected/i,
  /user denied/i,
  /rejected/i,
  /user cancelled/i,
  /cancel/i,
  /4001/i, // MetaMask user rejected
];

const SLIPPAGE_PATTERNS = [
  /slippage/i,
  /amount.*exceeds/i,
  /amountout.*less/i,
  /execution reverted.*amount/i,
  /insufficientoutputamount/i, // mangoContracts IMangoErrors
];

const INSUFFICIENT_BALANCE_PATTERNS = [
  /insufficient.*balance/i,
  /balance.*low/i,
  /exceeds balance/i,
];

const GAS_PATTERNS = [
  /insufficient.*funds.*for gas/i,
  /gas required exceeds/i,
  /out of gas/i,
  /execution reverted.*gas/i,
];

const ALLOWANCE_PATTERNS = [
  /allowance/i,
  /allowance too low/i,
];

const LIQUIDITY_PATTERNS = [
  /insufficient.*liquidity/i,
  /liquidity/i,
  /no liquidity/i,
  /zero liquidity/i,
];

const NETWORK_PATTERNS = [
  /network/i,
  /rpc/i,
  /fetch failed/i,
  /timeout/i,
  /ethereum\.request/i,
  /could not detect/i,
  /nonce too low/i,
  /econnrefused/i,
  /enotfound/i,
  /econnaborted/i,
  /etimedout/i,
];

// mangoServices quote API
const QUOTE_PATTERNS = [
  /vite_mango_services_url not configured/i,
  /no amountout/i,
  /unsupported chain id/i,
  /no dex config for chain/i,
  /mangorouter not deployed/i,
  /failed to get quote/i,
  /missing required parameters/i,
];

// mangoContracts MangoRouter / IMangoErrors
const ROUTER_PATTERNS = [
  /nopathfound/i,
  /bothcantbezero|both.*zero/i,
  /valueiszero/i,
  /transferfailed/i,
  /ethunwrapfailed/i,
  /calldistributefailed/i,
  /swapfailed/i,
  /uncharted terrain/i,
  /no.*pool.*found/i,
  /invalid pair|invalid pool/i,
];

// Bridge / LayerSwap
const BRIDGE_PATTERNS = [
  /missing required parameters for bridge/i,
  /no swap id returned/i,
  /bridge api error/i,
  /route not available/i,
  /route not found/i,
  /no routes available/i,
  /rate limit/i,
  /circuit breaker/i,
  /429/i,
  /layerswap.*unavailable/i,
];

// Config / validation
const CONFIG_PATTERNS = [
  /router not configured/i,
  /tokens required/i,
  /invalid amount/i,
];

/**
 * Map raw error to user-friendly message
 * @param {Error|{ message?: string, shortMessage?: string }|string} err
 * @returns {string}
 */
export function mapErrorToUserMessage(err) {
  const msg = String(err?.message || err?.shortMessage || err || '').toLowerCase();

  if (REJECT_PATTERNS.some((p) => p.test(msg))) return 'Transaction rejected';
  if (SLIPPAGE_PATTERNS.some((p) => p.test(msg))) return 'Slippage exceeded';
  if (INSUFFICIENT_BALANCE_PATTERNS.some((p) => p.test(msg))) return 'Insufficient balance';
  if (GAS_PATTERNS.some((p) => p.test(msg))) return 'Insufficient gas';
  if (ALLOWANCE_PATTERNS.some((p) => p.test(msg))) return 'Allowance too low';
  if (LIQUIDITY_PATTERNS.some((p) => p.test(msg))) return 'Insufficient liquidity';
  if (ROUTER_PATTERNS.some((p) => p.test(msg))) return 'Swap failed: no route or pool';
  if (QUOTE_PATTERNS.some((p) => p.test(msg))) return 'Quote unavailable. Check network and mangoServices.';
  if (BRIDGE_PATTERNS.some((p) => p.test(msg))) return msg.includes('rate limit') || msg.includes('429') ? 'Bridge rate limited. Try again later.' : 'Bridge error. Route may be unavailable.';
  if (CONFIG_PATTERNS.some((p) => p.test(msg))) return msg; // keep config messages as-is (short)
  if (NETWORK_PATTERNS.some((p) => p.test(msg))) return 'Network error. Try again.';

  // CORS / fetch (common when mangoServices URL wrong or CORS not set)
  if (/failed to fetch|cors|net::err|aborted/i.test(msg)) return 'Cannot reach server. Check mangoServices URL and CORS.';

  // Fallback: shorten raw message
  const raw = err?.shortMessage || err?.message || String(err);
  if (raw.length > 80) return 'Transaction failed';
  return raw || 'Transaction failed';
}
