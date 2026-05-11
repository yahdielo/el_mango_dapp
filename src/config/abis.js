/**
 * Contract ABIs for swap integration
 */

export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
];

/**
 * MangoRouter ABI — 4-param swap.
 * Used by: Base (8453), BSC (56) — old deployed contracts.
 */
export const ROUTER_ABI = [
  {
    inputs: [
      { name: 'token0',   type: 'address' },
      { name: 'token1',   type: 'address' },
      { name: 'amount',   type: 'uint256' },
      { name: 'referrer', type: 'address' },
    ],
    name: 'swap',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

/**
 * MangoRouter ABI — 6-param swap (audit-fixed contracts).
 * Used by: Ethereum (1), Arbitrum (42161), Optimism (10), Polygon (137), Avalanche (43114).
 * swap(token0, token1, amount, referrer, minAmountOut, deadline)
 */
export const ROUTER_ABI_SECURE = [
  {
    inputs: [
      { name: 'token0',        type: 'address' },
      { name: 'token1',        type: 'address' },
      { name: 'amount',        type: 'uint256' },
      { name: 'referrer',      type: 'address' },
      { name: 'minAmountOut',  type: 'uint256' },
      { name: 'deadline',      type: 'uint256' },
    ],
    name: 'swap',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

/**
 * MangoRouterSecure ABI — 5-param swap (Base deployed 2026-05-11).
 * swap(token0, token1, amount, referrer, slippageTolerance)
 * Contract computes minAmountOut internally via QuoterV2.
 * slippageTolerance is in basis points (e.g. 50 = 0.5%).
 */
export const ROUTER_ABI_BASE = [
  {
    inputs: [
      { name: 'token0',            type: 'address' },
      { name: 'token1',            type: 'address' },
      { name: 'amount',            type: 'uint256' },
      { name: 'referrer',          type: 'address' },
      { name: 'slippageTolerance', type: 'uint256' },
    ],
    name: 'swap',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

/**
 * MangoReferral minimal ABI (used for preflight safety checks).
 */
export const MANGO_REFERRAL_ABI = [
  {
    inputs: [{ name: 'router', type: 'address' }],
    name: 'whiteListed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'chainPaused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mangoToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];
