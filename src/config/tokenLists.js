/**
 * Chain-Specific Token Lists Configuration
 * 
 * Default and popular tokens for each supported EVM chain.
 * Includes native wrapped tokens (WETH, WBNB, WMATIC, WAVAX), stablecoins (USDC, USDT, DAI),
 * and MANGO token if available.
 */

/**
 * Token metadata structure
 * @typedef {Object} Token
 * @property {string} symbol - Token symbol (e.g., 'WETH', 'USDC')
 * @property {string} name - Token name (e.g., 'Wrapped Ether')
 * @property {string} address - Token contract address
 * @property {number} decimals - Token decimals (typically 18 for native tokens, 6 or 18 for stablecoins)
 * @property {string} logoURI - Optional logo URI
 */

/**
 * Token lists per chain
 * Structure: { [chainId]: { default: Token[], popular: Token[] } }
 */
export const tokenLists = {
    // Base (Chain ID: 8453)
    8453: {
        default: [
            {
                symbol: 'MANGO',
                name: 'Mango DeFi Token',
                address: '0xC26171C7978D50fc0340D6F013C17e8693D7A4e4',
                decimals: 18,
                logoURI: '/logo192.png', // Use Mango logo as MANGO token icon
            },
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0x4200000000000000000000000000000000000006',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'MANGO',
                name: 'Mango DeFi Token',
                address: '0xC26171C7978D50fc0340D6F013C17e8693D7A4e4',
                decimals: 18,
                logoURI: '/logo192.png', // Use Mango logo as MANGO token icon
            },
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0x4200000000000000000000000000000000000006',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                decimals: 6,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0xfde4Cb96C467678c4D50C8B6E1773dA8B37B8054',
                decimals: 6,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0x50c5725949A6F0c72E6C4a641F24049A917E0CB3',
                decimals: 18,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x4Fb99590cA95fc3255D9fA66a1cA46c43C34b09a',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
                decimals: 18,
            },
            {
                symbol: 'UNI',
                name: 'Uniswap',
                address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
                decimals: 18,
            },
            {
                symbol: 'LINK',
                name: 'Chainlink',
                address: '0x88Fb150BDc53A65fe94Dea0c9BA0a3d4082B8Fa9',
                decimals: 18,
            },
            {
                symbol: 'AAVE',
                name: 'Aave Token',
                address: '0x4e8c5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
                decimals: 18,
            },
        ],
    },

    // Arbitrum (Chain ID: 42161)
    42161: {
        default: [
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                decimals: 6,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                decimals: 6,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
                decimals: 18,
            },
            {
                symbol: 'ARB',
                name: 'Arbitrum',
                address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
                decimals: 18,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x5033833c3514AE2F390d3E5b1b6B3b07C3b9a1F7',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0xfc506AaA1340b4dedFfd88bE278b1e0F41230525',
                decimals: 18,
            },
            {
                symbol: 'UNI',
                name: 'Uniswap',
                address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
                decimals: 18,
            },
            {
                symbol: 'LINK',
                name: 'Chainlink',
                address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
                decimals: 18,
            },
        ],
    },

    // BSC (Chain ID: 56)
    56: {
        default: [
            {
                symbol: 'WBNB',
                name: 'Wrapped BNB',
                address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png',
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0x55d398326f99059fF775485246999027B3197955',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'WBNB',
                name: 'Wrapped BNB',
                address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                decimals: 18,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0x55d398326f99059fF775485246999027B3197955',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                decimals: 18,
            },
            {
                symbol: 'BUSD',
                name: 'Binance USD',
                address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                decimals: 18,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
                decimals: 18,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x2859e4544C4bB03966803b044A93563Bd2D0DD4D',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00',
                decimals: 18,
            },
            {
                symbol: 'CAKE',
                name: 'PancakeSwap Token',
                address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
                decimals: 18,
            },
            {
                symbol: 'DOGE',
                name: 'Binance-Peg Dogecoin',
                address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
                decimals: 8,
            },
        ],
    },

    // Polygon (Chain ID: 137)
    137: {
        default: [
            {
                symbol: 'WMATIC',
                name: 'Wrapped MATIC',
                address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'WMATIC',
                name: 'Wrapped MATIC',
                address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                decimals: 6,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                decimals: 6,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
                decimals: 18,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a',
                decimals: 18,
            },
            {
                symbol: 'UNI',
                name: 'Uniswap',
                address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
                decimals: 18,
            },
            {
                symbol: 'LINK',
                name: 'Chainlink',
                address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
                decimals: 18,
            },
        ],
    },

    // Optimism (Chain ID: 10)
    10: {
        default: [
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0x4200000000000000000000000000000000000006',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0x4200000000000000000000000000000000000006',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
                decimals: 6,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
                decimals: 6,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
                decimals: 18,
            },
            {
                symbol: 'OP',
                name: 'Optimism',
                address: '0x4200000000000000000000000000000000000042',
                decimals: 18,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0xCc8a87C7803E4b7E5B1f9d717d6403b19Ba53F7C',
                decimals: 18,
            },
            {
                symbol: 'UNI',
                name: 'Uniswap',
                address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
                decimals: 18,
            },
        ],
    },

    // Avalanche (Chain ID: 43114)
    43114: {
        default: [
            {
                symbol: 'WAVAX',
                name: 'Wrapped AVAX',
                address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'WAVAX',
                name: 'Wrapped AVAX',
                address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
                decimals: 6,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
                decimals: 6,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
                decimals: 18,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x02D980A0D7AF3fb7Cf7Df8cB35d9eDBCF355f665',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0xfb66321D7C674995FfCc2F5a7626b5a10d7072b4',
                decimals: 18,
            },
        ],
    },

    // Ethereum (Chain ID: 1)
    1: {
        default: [
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                decimals: 18,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
            },
        ],
        popular: [
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                decimals: 18,
            },
            {
                symbol: 'USDC',
                name: 'USD Coin',
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6,
            },
            {
                symbol: 'USDT',
                name: 'Tether USD',
                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                decimals: 6,
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                decimals: 18,
            },
            {
                symbol: 'WBTC',
                name: 'Wrapped Bitcoin',
                address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                decimals: 8,
            },
            {
                symbol: 'SHIB',
                name: 'Shiba Inu',
                address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
                decimals: 18,
            },
            {
                symbol: 'PEPE',
                name: 'Pepe',
                address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
                decimals: 18,
            },
            {
                symbol: 'UNI',
                name: 'Uniswap',
                address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
                decimals: 18,
            },
            {
                symbol: 'LINK',
                name: 'Chainlink',
                address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                decimals: 18,
            },
            {
                symbol: 'AAVE',
                name: 'Aave Token',
                address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
                decimals: 18,
            },
            {
                symbol: 'MATIC',
                name: 'Polygon',
                address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
                decimals: 18,
            },
            {
                symbol: 'MKR',
                name: 'Maker',
                address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
                decimals: 18,
            },
        ],
    },
};

/**
 * Get default tokens for a chain
 * @param {number} chainId - Chain ID
 * @returns {Token[]} Array of default tokens
 */
export const getDefaultTokens = (chainId) => {
    return tokenLists[chainId]?.default || [];
};

/**
 * Get popular tokens for a chain
 * @param {number} chainId - Chain ID
 * @returns {Token[]} Array of popular tokens
 */
export const getPopularTokens = (chainId) => {
    return tokenLists[chainId]?.popular || [];
};

/**
 * Get all tokens for a chain (default + popular, deduplicated)
 * @param {number} chainId - Chain ID
 * @returns {Token[]} Array of all tokens
 */
export const getAllTokens = (chainId) => {
    const defaultTokens = getDefaultTokens(chainId);
    const popularTokens = getPopularTokens(chainId);
    
    // Combine and deduplicate by address
    const tokenMap = new Map();
    
    [...defaultTokens, ...popularTokens].forEach(token => {
        const address = token.address.toLowerCase();
        if (!tokenMap.has(address)) {
            tokenMap.set(address, token);
        }
    });
    
    return Array.from(tokenMap.values());
};

/**
 * Get all tokens from all chains (deduplicated by symbol)
 * @returns {Token[]} Array of unique tokens from all chains (deduplicated by symbol)
 */
export const getAllTokensFromAllChains = () => {
    const tokenMap = new Map(); // Use Map to deduplicate by symbol (case-insensitive)
    
    // Iterate through all chains in tokenLists
    Object.keys(tokenLists).forEach(chainIdStr => {
        const chainId = Number(chainIdStr);
        const chainTokens = getAllTokens(chainId);
        
        // Add tokens to map, using symbol (uppercase) as key to deduplicate
        chainTokens.forEach(token => {
            const symbolKey = token.symbol.toUpperCase();
            // Only add if we haven't seen this symbol before
            // (Prioritize first occurrence - could be changed to prioritize specific chains)
            if (!tokenMap.has(symbolKey)) {
                tokenMap.set(symbolKey, {
                    ...token,
                    chainId: chainId, // Add chainId to token for identification
                });
            }
        });
    });
    
    return Array.from(tokenMap.values());
};

/**
 * Find token by address
 * @param {number} chainId - Chain ID
 * @param {string} address - Token address
 * @returns {Token|null} Token object or null if not found
 */
export const findTokenByAddress = (chainId, address) => {
    if (!address) return null;
    
    const allTokens = getAllTokens(chainId);
    const normalizedAddress = address.toLowerCase();
    
    return allTokens.find(token => token.address.toLowerCase() === normalizedAddress) || null;
};

/**
 * Find token by symbol
 * @param {number} chainId - Chain ID
 * @param {string} symbol - Token symbol
 * @returns {Token|null} Token object or null if not found
 */
export const findTokenBySymbol = (chainId, symbol) => {
    if (!symbol) return null;
    
    const allTokens = getAllTokens(chainId);
    const normalizedSymbol = symbol.toUpperCase();
    
    return allTokens.find(token => token.symbol.toUpperCase() === normalizedSymbol) || null;
};

/**
 * Check if token is in default list
 * @param {number} chainId - Chain ID
 * @param {string} address - Token address
 * @returns {boolean} True if token is in default list
 */
export const isDefaultToken = (chainId, address) => {
    if (!address) return false;
    
    const defaultTokens = getDefaultTokens(chainId);
    const normalizedAddress = address.toLowerCase();
    
    return defaultTokens.some(token => token.address.toLowerCase() === normalizedAddress);
};

/**
 * Check if token is in popular list
 * @param {number} chainId - Chain ID
 * @param {string} address - Token address
 * @returns {boolean} True if token is in popular list
 */
export const isPopularToken = (chainId, address) => {
    if (!address) return false;
    
    const popularTokens = getPopularTokens(chainId);
    const normalizedAddress = address.toLowerCase();
    
    return popularTokens.some(token => token.address.toLowerCase() === normalizedAddress);
};

/**
 * Add MANGO token to token list if available
 * This function can be called to add MANGO token from ChainConfigService
 * @param {number} chainId - Chain ID
 * @param {Object} mangoToken - MANGO token object with symbol, name, address, decimals
 * @returns {void}
 */
export const addMangoToken = (chainId, mangoToken) => {
    if (!tokenLists[chainId]) {
        tokenLists[chainId] = { default: [], popular: [] };
    }
    
    // Check if MANGO token already exists
    const existingMango = tokenLists[chainId].popular.find(
        token => token.symbol.toUpperCase() === 'MANGO'
    );
    
    if (!existingMango && mangoToken) {
        // Add to both default and popular lists
        tokenLists[chainId].default.push(mangoToken);
        tokenLists[chainId].popular.push(mangoToken);
    }
};

export default {
    tokenLists,
    getDefaultTokens,
    getPopularTokens,
    getAllTokens,
    findTokenByAddress,
    findTokenBySymbol,
    isDefaultToken,
    isPopularToken,
    addMangoToken,
};

