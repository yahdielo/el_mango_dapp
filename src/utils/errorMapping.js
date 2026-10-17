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

// Bitcoin sender address has 0 BTC — show full message so user gets actionable guidance
const BTC_EMPTY_ADDRESS_PATTERNS = [
  /no btc found at/i,
  /0 btc found at/i,
  /bitcoin address has 0 btc/i,
  /empty bitcoin address/i,
  /btc.*balance.*0/i,
];

// Bridge / LayerSwap / Rango / Symbiosis
const BRIDGE_PATTERNS = [
  /missing required parameters for bridge/i,
  /no swap id returned/i,
  /bridge api error/i,
  /route not available/i,
  /route not found/i,
  /no routes available/i,
  /no cross-chain route/i,
  /cross-chain route.*available/i,
  /rate limit/i,
  /circuit breaker/i,
  /429/i,
  /layerswap.*unavailable/i,
  /bridge temporarily unavailable/i,
  /503/i,
  /provider.*rejected/i,
];

// Amount-limit errors from bridge providers (show first sentence of raw message — it's short and actionable)
const AMOUNT_LIMIT_PATTERNS = [
  /amount.*below.*minimum/i,
  /amount outside provider limits/i,
  /below minimum.*layerswap/i,
  /below minimum.*via/i,
  /amount.*provider.*limit/i,
];

// Config / validation
const CONFIG_PATTERNS = [
  /router not configured/i,
  /tokens required/i,
  /invalid amount/i,
];

/**
 * Pull a readable string out of API / wallet errors.
 * Axios and bridge responses sometimes set `error` or `message` to an object,
 * and `String(that)` is the literal "[object Object]".
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {string}
 */
export function errorText(value, depth = 0) {
  if (value == null || depth > 4) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    return text === '[object Object]' ? '' : text;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = errorText(item, depth + 1);
      if (text) return text;
    }
    return '';
  }
  if (typeof value === 'object') {
    const nested =
      value.message ??
      value.shortMessage ??
      value.error ??
      value.reason ??
      value.detail ??
      value.msg ??
      value.description;
    return errorText(nested, depth + 1);
  }
  return '';
}

/**
 * Map raw error to user-friendly message
 * @param {Error|{ message?: string, shortMessage?: string }|string} err
 * @returns {string}
 */
export function mapErrorToUserMessage(err) {
  if (err != null && typeof err !== 'object' && typeof err !== 'string') return 'Transaction failed';
  // Parentheses required: mixing nullish coalescing `??` with `||` without grouping breaks parsing in some bundlers.
  const msg = (errorText(err) || '').toLowerCase();

  if (REJECT_PATTERNS.some((p) => p.test(msg))) return 'Transaction rejected';
  // Amount-limit errors: show the first sentence of the raw message (short, actionable, already includes the minimum)
  if (AMOUNT_LIMIT_PATTERNS.some((p) => p.test(msg))) {
    const raw = errorText(err);
    // Return up to the first sentence break so the minimum value is visible
    const firstDot = raw.search(/\.\s/);
    return firstDot > 0 ? raw.slice(0, firstDot + 1) : raw.slice(0, 160) || 'Amount below bridge minimum.';
  }
  if (SLIPPAGE_PATTERNS.some((p) => p.test(msg))) return 'Slippage exceeded';
  // BTC empty address — return up to the first sentence of the original message so the address is visible
  if (BTC_EMPTY_ADDRESS_PATTERNS.some((p) => p.test(msg))) {
    const raw = errorText(err);
    const firstSentence = raw.split(/\. /)[0];
    return firstSentence.length > 0 ? firstSentence + '.' : raw.slice(0, 120);
  }
  if (INSUFFICIENT_BALANCE_PATTERNS.some((p) => p.test(msg))) return 'Insufficient balance';
  if (GAS_PATTERNS.some((p) => p.test(msg))) return 'Insufficient gas';
  if (ALLOWANCE_PATTERNS.some((p) => p.test(msg))) return 'Allowance too low';
  if (LIQUIDITY_PATTERNS.some((p) => p.test(msg))) return 'Insufficient liquidity';
  if (ROUTER_PATTERNS.some((p) => p.test(msg))) return 'Swap failed: no route or pool';
  if (QUOTE_PATTERNS.some((p) => p.test(msg))) return 'Quote unavailable. Check network and mangoServices.';
  if (BRIDGE_PATTERNS.some((p) => p.test(msg)) || err?.code === 'NO_ROUTE' || err?.code === 'AMOUNT_TOO_LOW') {
    if (msg.includes('rate limit') || msg.includes('429')) return 'Bridge rate limited. Try again later.';
    if (msg.includes('temporarily unavailable') || msg.includes('503')) return 'Bridge temporarily unavailable. Try again in a minute.';
    const raw = errorText(err);
    // Always show the actual bridge message — it contains the minimum amount and actionable guidance.
    // Only suppress if it looks like a raw HTTP status code string (no real content).
    if (raw.length > 0 && !/^\s*(api error:\s*)?\d+\s*$/i.test(raw)) {
      // Truncate very long messages (>240) to first sentence
      if (raw.length > 240) {
        const firstSentence = raw.split(/\.\s/)[0];
        return firstSentence.length > 10 ? firstSentence + '.' : raw.slice(0, 200) + '…';
      }
      return raw;
    }
    return 'Route not available. Try a different amount or chain pair.';
  }
  if (CONFIG_PATTERNS.some((p) => p.test(msg))) return msg; // keep config messages as-is (short)
  if (NETWORK_PATTERNS.some((p) => p.test(msg))) return 'Network error. Try again.';

  // Quote server unreachable (wrong URL, local IP from HTTPS app, CORS, or server down)
  if (/failed to fetch|cors|net::err|aborted|unreachable|quote server unreachable|VITE_MANGO_SERVICES_URL/i.test(msg)) {
    return 'Quote server unreachable. Set VITE_MANGO_SERVICES_URL to a public HTTPS URL (not a local IP when the app is on HTTPS).';
  }

  // RPC/viem decoding: "y is not an Object (evaluating 'data' in y)" when contract result shape is unexpected
  const errStr = errorText(err);
  if (/is not an object.*evaluating.*data.*in/i.test(errStr) || /evaluating\s*['"]data['"]\s*in/i.test(errStr)) {
    return 'Quote or contract read failed. Try again or check your network.';
  }

  // Fallback: show raw message if it's concise, otherwise generic.
  // Never return an object or the string "[object Object]" — React prints that literally.
  const raw = errorText(err);
  if (!raw) return 'Could not load the bridge quote. Try again.';
  // Bridge/API errors (code attached) always show the message
  if (err?.code && raw.length > 0) {
    return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
  }
  if (raw.length > 80) return 'Transaction failed';
  return raw;
}
