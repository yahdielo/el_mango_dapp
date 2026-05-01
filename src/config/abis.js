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
 * MangoRouter legacy ABI (4 params) — used by Base (8453) and BSC (56)
 * swap(address token0, address token1, uint256 amount, address referrer)
 */
export const ROUTER_ABI = [
  {
    inputs: [
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'referrer', type: 'address' },
    ],
    name: 'swap',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

/**
 * MangoRouterSecure ABI (5 params) — used by Ethereum (1), Polygon (137),
 * Optimism (10), Avalanche (43114), and Arbitrum (42161).
 * swap(address token0, address token1, uint256 amount, address referrer, uint256 slippageTolerance)
 * Pass slippageTolerance=0 to use contract default (200 bps = 2%).
 */
export const ROUTER_ABI_SECURE = [
  {
    inputs: [
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'referrer', type: 'address' },
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
