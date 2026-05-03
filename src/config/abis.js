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
 * MangoRouter ABI — 4-param swap (all 7 deployed chains as of 2026-05-03).
 * swap(address token0, address token1, uint256 amount, address referrer)
 *
 * NOTE: After running redeploy-audit-fixed.sh this becomes 6-param:
 * swap(token0, token1, amount, referrer, minAmountOut, deadline)
 * Update this ABI and useSwap.js finalArgs at that time.
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

// Alias — all chains now use the same 4-param ROUTER_ABI.
export const ROUTER_ABI_SECURE = ROUTER_ABI;

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
