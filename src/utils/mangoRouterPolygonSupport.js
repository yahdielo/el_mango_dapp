/**
 * MangoRouter on Polygon uses WMATIC as wrapped native (see mangoRouter001.sol _getExpectedWETH).
 * Bridged WETH (0x7ceb…) often has no compatible V2/V3 pool on the router’s factories, so quotes
 * can look fine while MetaMask simulates swap() → revert (“likely to fail”).
 */
export const POLYGON_BRIDGED_WETH = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';

export function isPolygonBridgedWethToken(token) {
  if (!token?.address) return false;
  return String(token.address).toLowerCase() === POLYGON_BRIDGED_WETH.toLowerCase();
}

/** True if this same-chain Mango swap on Polygon would use bridged WETH (unsupported). */
export function isPolygonBridgedWethSwap(chainId, tokenIn, tokenOut) {
  if (Number(chainId) !== 137) return false;
  return isPolygonBridgedWethToken(tokenIn) || isPolygonBridgedWethToken(tokenOut);
}

export const POLYGON_USE_WMATIC_MESSAGE =
  'Bridged WETH cannot be swapped same-chain on Polygon. Use the Cross-Chain tab to bridge your WETH to Ethereum, Base, or Arbitrum — or swap WMATIC / USDC instead.';
