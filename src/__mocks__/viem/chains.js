/**
 * Mock for viem/chains
 * 
 * Provides mock chain definitions for testing
 */

export const base = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
};

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};

export const arbitrum = {
  id: 42161,
  name: 'Arbitrum One',
  network: 'arbitrum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://arb1.arbitrum.io/rpc'] },
    public: { http: ['https://arb1.arbitrum.io/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://arbiscan.io' },
  },
};

export const arbitrumSepolia = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  network: 'arbitrum-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
    public: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
  testnet: true,
};

export const polygon = {
  id: 137,
  name: 'Polygon',
  network: 'polygon',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://polygon-rpc.com'] },
    public: { http: ['https://polygon-rpc.com'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
  },
};

export const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
};

