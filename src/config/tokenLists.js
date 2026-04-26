/**
 * Chain-Specific Token Lists - replicated from el_mango_dapp (port 3002)
 * All tokens include logoURI for proper display in token selection.
 *
 * Note: Token list is static. Future enhancement: integrate dynamic token API
 * (e.g. 1inch, CoinGecko) for refresh-on-demand or periodic updates.
 */

import mangoTokenImage from '../assets/mango-token.jpg';

const MANGO_LOGO = mangoTokenImage;
const ETH_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png';
const USDC_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png';
const USDT_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png';
const DAI_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png';
const SHIB_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE/logo.png';
const PEPE_LOGO = 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg';
const UNI_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png';
const LINK_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png';
const ARB_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png';
const OP_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/assets/0x4200000000000000000000000000000000000042/logo.png';
const WBTC_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png';
const WBNB_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png';
const WMATIC_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270/logo.png';
const WAVAX_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png';
const CAKE_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82/logo.png';
const DOGE_LOGO = 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png';

/** Chain IDs that have token lists (supported for swap) */
// NOTE: Ethereum mainnet (1) is intentionally excluded — the deployed router at
// 0x1d84E8080231EF3316F9A831D389384fdC05a357 is misconfigured on ETH mainnet and
// causes swaps to succeed on-chain but return 0 tokens (user loses ETH).
// Re-enable only after deploying and verifying a correct Ethereum mainnet router.
export const SUPPORTED_SWAP_CHAINS = [8453, 42161, 56, 137, 10, 43114];

export function isChainSupportedForSwap(chainId) {
  if (chainId == null) return false;
  return SUPPORTED_SWAP_CHAINS.includes(Number(chainId));
}

export function getFirstSupportedChain() {
  return SUPPORTED_SWAP_CHAINS[0];
}

/** MANGO token (Avalanche list only; excluded from Polygon/Optimism swap UI) */
const MANGO_TOKEN_ADDRESS = '0x1dC5726C54791c18eA68C26428bef5c278007627';

export const tokenLists = {
  8453: {
    default: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x4200000000000000000000000000000000000006', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', logoURI: USDC_LOGO },
    ],
    popular: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x4200000000000000000000000000000000000006', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', logoURI: USDC_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0x50c5725949A6F0c72E6C4a641F24049A917E0CB3', logoURI: DAI_LOGO },
      { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, address: '0x4Fb99590cA95fc3255D9fA66a1cA46c43C34b09a', logoURI: SHIB_LOGO },
      { symbol: 'PEPE', name: 'Pepe', decimals: 18, address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', logoURI: PEPE_LOGO },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18, address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691', logoURI: UNI_LOGO },
      { symbol: 'LINK', name: 'Chainlink', decimals: 18, address: '0x88Fb150BDc53A65fe94Dea0c9BA0a3d4082B8Fa9', logoURI: LINK_LOGO },
    ],
  },
  42161: {
    default: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', logoURI: USDC_LOGO },
    ],
    popular: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', logoURI: USDT_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', logoURI: DAI_LOGO },
      { symbol: 'ARB', name: 'Arbitrum', decimals: 18, address: '0x912CE59144191C1204E64559FE8253a0e49E6548', logoURI: ARB_LOGO },
      { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, address: '0x5033833c3514AE2F390d3E5b1b6B3b07C3b9a1F7', logoURI: SHIB_LOGO },
      { symbol: 'PEPE', name: 'Pepe', decimals: 18, address: '0xfc506AaA1340b4dedFfd88bE278b1e0F41230525', logoURI: PEPE_LOGO },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18, address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', logoURI: UNI_LOGO },
      { symbol: 'LINK', name: 'Chainlink', decimals: 18, address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', logoURI: LINK_LOGO },
    ],
  },
  56: {
    default: [
      { symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18, address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 18, address: '0x55d398326f99059fF775485246999027B3197955', logoURI: USDT_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 18, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', logoURI: USDC_LOGO },
    ],
    popular: [
      { symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18, address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', logoURI: WBNB_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 18, address: '0x55d398326f99059fF775485246999027B3197955', logoURI: USDT_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 18, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', logoURI: USDC_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', logoURI: DAI_LOGO },
      { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, address: '0x2859e4544C4bB03966803b044A93563Bd2D0DD4D', logoURI: SHIB_LOGO },
      { symbol: 'PEPE', name: 'Pepe', decimals: 18, address: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00', logoURI: PEPE_LOGO },
      { symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18, address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', logoURI: CAKE_LOGO },
      { symbol: 'DOGE', name: 'Binance-Peg Dogecoin', decimals: 8, address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', logoURI: DOGE_LOGO },
    ],
  },
  137: {
    default: [
      { symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18, address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270/logo.png' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', logoURI: USDT_LOGO },
    ],
    popular: [
      { symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18, address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', logoURI: WMATIC_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', logoURI: USDT_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', logoURI: DAI_LOGO },
      { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, address: '0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec', logoURI: SHIB_LOGO },
      { symbol: 'PEPE', name: 'Pepe', decimals: 18, address: '0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a', logoURI: PEPE_LOGO },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18, address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', logoURI: UNI_LOGO },
      { symbol: 'LINK', name: 'Chainlink', decimals: 18, address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', logoURI: LINK_LOGO },
    ],
  },
  10: {
    default: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x4200000000000000000000000000000000000006', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', logoURI: USDC_LOGO },
    ],
    popular: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x4200000000000000000000000000000000000006', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', logoURI: USDT_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', logoURI: DAI_LOGO },
      { symbol: 'OP', name: 'Optimism', decimals: 18, address: '0x4200000000000000000000000000000000000042', logoURI: OP_LOGO },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18, address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691', logoURI: UNI_LOGO },
    ],
  },
  43114: {
    default: [
      { symbol: 'MANGO', name: 'Mango DeFi Token', decimals: 18, address: MANGO_TOKEN_ADDRESS, logoURI: MANGO_LOGO },
      { symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18, address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', logoURI: USDT_LOGO },
    ],
    popular: [
      { symbol: 'MANGO', name: 'Mango DeFi Token', decimals: 18, address: MANGO_TOKEN_ADDRESS, logoURI: MANGO_LOGO },
      { symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18, address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', logoURI: WAVAX_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', logoURI: USDT_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', logoURI: DAI_LOGO },
    ],
  },
  1: {
    default: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', logoURI: USDT_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png' },
    ],
    popular: [
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', logoURI: ETH_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', logoURI: USDT_LOGO },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', logoURI: DAI_LOGO },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', logoURI: WBTC_LOGO },
      { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', logoURI: SHIB_LOGO },
      { symbol: 'PEPE', name: 'Pepe', decimals: 18, address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', logoURI: PEPE_LOGO },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', logoURI: UNI_LOGO },
      { symbol: 'LINK', name: 'Chainlink', decimals: 18, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', logoURI: LINK_LOGO },
    ],
  },
  // Solana (501111) – native SOL + stables for cross-chain
  501111: {
    default: [
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', logoURI: USDT_LOGO },
    ],
    popular: [
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', logoURI: USDC_LOGO },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', logoURI: USDT_LOGO },
    ],
  },
  // Tron (728126428) – native TRX + stables for cross-chain
  728126428: {
    default: [
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', logoURI: USDT_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', logoURI: USDC_LOGO },
    ],
    popular: [
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', logoURI: USDT_LOGO },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', logoURI: USDC_LOGO },
    ],
  },
};

const ZERO = '0x0000000000000000000000000000000000000000';

const NATIVE_TOKENS = {
  0: { symbol: 'BTC', name: 'Bitcoin', decimals: 8, address: 'BTC', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png' },
  1: { symbol: 'ETH', name: 'Ether', decimals: 18, address: ZERO, native: true, logoURI: ETH_LOGO },
  8453: { symbol: 'ETH', name: 'Ether', decimals: 18, address: ZERO, native: true, logoURI: ETH_LOGO },
  42161: { symbol: 'ETH', name: 'Ether', decimals: 18, address: ZERO, native: true, logoURI: ETH_LOGO },
  10: { symbol: 'ETH', name: 'Ether', decimals: 18, address: ZERO, native: true, logoURI: ETH_LOGO },
  43114: { symbol: 'AVAX', name: 'Avalanche', decimals: 18, address: ZERO, native: true, logoURI: WAVAX_LOGO },
  137: { symbol: 'MATIC', name: 'Polygon', decimals: 18, address: ZERO, native: true, logoURI: WMATIC_LOGO },
  56: { symbol: 'BNB', name: 'BNB', decimals: 18, address: ZERO, native: true, logoURI: WBNB_LOGO },
  501111: { symbol: 'SOL', name: 'Solana', decimals: 9, address: 'SOL', logoURI: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  728126428: { symbol: 'TRX', name: 'Tron', decimals: 6, address: 'TRX', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png' },
  101: { symbol: 'SUI', name: 'Sui', decimals: 9, address: 'SUI', logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png' },
  144: { symbol: 'XRP', name: 'XRP', decimals: 6, address: 'XRP', logoURI: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
};


function getDefaultTokens(chainId) {
  return tokenLists[chainId]?.default || [];
}

function getPopularTokens(chainId) {
  return tokenLists[chainId]?.popular || [];
}

export function getAllTokens(chainId) {
  const defaultTokens = getDefaultTokens(chainId);
  const popularTokens = getPopularTokens(chainId);
  const tokenMap = new Map();
  [...defaultTokens, ...popularTokens].forEach((t) => {
    const addr = t.address?.toLowerCase?.() || t.address;
    if (!tokenMap.has(addr)) tokenMap.set(addr, t);
  });
  return Array.from(tokenMap.values());
}

export function getAllTokensFromAllChains() {
  const tokenMap = new Map();
  Object.keys(tokenLists).forEach((chainIdStr) => {
    const chainId = Number(chainIdStr);
    getAllTokens(chainId).forEach((token) => {
      const key = token.symbol.toUpperCase();
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { ...token, chainId });
      }
    });
  });
  return Array.from(tokenMap.values());
}

export function getTokensForChain(chainId) {
  const id = chainId === 0 ? 0 : parseInt(chainId);
  const native = NATIVE_TOKENS[id];
  const evm = getAllTokens(id);
  if (native) {
    return [{ ...native, chainId: id }, ...evm.map((t) => ({ ...t, chainId: id }))];
  }
  return evm.map((t) => ({ ...t, chainId: id }));
}
