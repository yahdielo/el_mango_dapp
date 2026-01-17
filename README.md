# Mango DeFi - Multi-Chain DEX

Mango DeFi is a Telegram mini app designed to facilitate token swaps via Telegram chat. This is the next generation of Telegram bots for swapping cryptocurrencies in a non-custodial manner, where users control their funds at all times.

## 🚀 Features

- **Multi-Chain Support**: Swap tokens across 10 different blockchains
- **Non-Custodial**: Users maintain full control of their funds
- **Telegram Integration**: Seamless swapping experience within Telegram
- **Cross-Chain Swaps**: Bridge tokens between different blockchains
- **Referral System**: Earn rewards through multi-level referral program
- **LayerSwap Integration**: Support for Solana and Bitcoin via LayerSwap bridge

## 📋 Supported Chains

### EVM Chains
1. **Ethereum** (Chain ID: 1)
   - Native Token: ETH
   - Explorer: [Etherscan](https://etherscan.io)
   - DEXes: Uniswap V2/V3, SushiSwap

2. **Base** (Chain ID: 8453)
   - Native Token: ETH
   - Explorer: [BaseScan](https://basescan.org)
   - DEXes: Uniswap V3, Aerodrome

3. **Arbitrum** (Chain ID: 42161)
   - Native Token: ETH
   - Explorer: [Arbiscan](https://arbiscan.io)
   - DEXes: Uniswap V3, Camelot

4. **BSC** (Chain ID: 56)
   - Native Token: BNB
   - Explorer: [BSCScan](https://bscscan.com)
   - DEXes: PancakeSwap, Uniswap V2

5. **Polygon** (Chain ID: 137)
   - Native Token: MATIC
   - Explorer: [PolygonScan](https://polygonscan.com)
   - DEXes: QuickSwap, Uniswap V3

6. **Optimism** (Chain ID: 10)
   - Native Token: ETH
   - Explorer: [Optimistic Etherscan](https://optimistic.etherscan.io)
   - DEXes: Uniswap V3, Velodrome

7. **Avalanche** (Chain ID: 43114)
   - Native Token: AVAX
   - Explorer: [Snowtrace](https://snowtrace.io)
   - DEXes: Trader Joe, Uniswap V3

### Non-EVM Chains
8. **Tron** (Chain ID: 728126428)
   - Native Token: TRX
   - Explorer: [Tronscan](https://tronscan.org)
   - Wallet: TronLink

9. **Solana** (Chain ID: 501111)
   - Native Token: SOL
   - Explorer: [Solscan](https://solscan.io)
   - Bridge: LayerSwap

10. **Bitcoin** (Chain ID: 0)
    - Native Token: BTC
    - Explorer: [Blockstream](https://blockstream.info)
    - Bridge: LayerSwap

## 🛠️ Tech Stack

- **Frontend Framework**: React 18.3.1
- **Blockchain Library**: Wagmi 2.19.5, Viem 2.43.3
- **Wallet Integration**: Reown AppKit (formerly WalletConnect)
- **UI Framework**: React Bootstrap 2.10.10
- **HTTP Client**: Axios 1.13.2
- **State Management**: TanStack Query 5.90.14
- **Build Tool**: React Scripts 5.0.1

## 📦 Installation

### Prerequisites

- Node.js 24.x
- npm >= 10.x

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mangoDapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration (see [Environment Variables](#environment-variables) section)

4. **Start development server**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## 🔧 Environment Variables

### API Configuration

```env
# Mango DeFi API
REACT_APP_MANGO_API_URL=http://localhost:3000
REACT_APP_MANGO_API_KEY=your_api_key_here

# LayerSwap API (for Solana/Bitcoin)
REACT_APP_LAYERSWAP_API_KEY=your_layerswap_api_key
REACT_APP_LAYERSWAP_API_URL=https://api.layerswap.io
```

### Contract Addresses

#### Ethereum (Chain ID: 1)
```env
REACT_APP_ETHEREUM_ROUTER=0x...
REACT_APP_ETHEREUM_REFERRAL=0x...
REACT_APP_ETHEREUM_TOKEN=0x...
REACT_APP_ETHEREUM_MANAGER=0x...
REACT_APP_ETHEREUM_WHITELIST=0x...
```

#### Base (Chain ID: 8453)
```env
REACT_APP_BASE_ROUTER=0x...
REACT_APP_BASE_REFERRAL=0x...
REACT_APP_BASE_TOKEN=0x...
REACT_APP_BASE_MANAGER=0x...
REACT_APP_BASE_WHITELIST=0x...
```

#### Arbitrum (Chain ID: 42161)
```env
REACT_APP_ARBITRUM_ROUTER=0x...
REACT_APP_ARBITRUM_REFERRAL=0x...
REACT_APP_ARBITRUM_TOKEN=0x...
REACT_APP_ARBITRUM_MANAGER=0x...
REACT_APP_ARBITRUM_WHITELIST=0x...
```

#### BSC (Chain ID: 56)
```env
REACT_APP_BSC_ROUTER=0x...
REACT_APP_BSC_REFERRAL=0x...
REACT_APP_BSC_TOKEN=0x...
REACT_APP_BSC_MANAGER=0x...
REACT_APP_BSC_WHITELIST=0x...
```

#### Polygon (Chain ID: 137)
```env
REACT_APP_POLYGON_ROUTER=0x...
REACT_APP_POLYGON_REFERRAL=0x...
REACT_APP_POLYGON_TOKEN=0x...
REACT_APP_POLYGON_MANAGER=0x...
REACT_APP_POLYGON_WHITELIST=0x...
```

#### Optimism (Chain ID: 10)
```env
REACT_APP_OPTIMISM_ROUTER=0x...
REACT_APP_OPTIMISM_REFERRAL=0x...
REACT_APP_OPTIMISM_TOKEN=0x...
REACT_APP_OPTIMISM_MANAGER=0x...
REACT_APP_OPTIMISM_WHITELIST=0x...
```

#### Avalanche (Chain ID: 43114)
```env
REACT_APP_AVALANCHE_ROUTER=0x...
REACT_APP_AVALANCHE_REFERRAL=0x...
REACT_APP_AVALANCHE_TOKEN=0x...
REACT_APP_AVALANCHE_MANAGER=0x...
REACT_APP_AVALANCHE_WHITELIST=0x...
```

#### Tron (Chain ID: 728126428)
```env
REACT_APP_TRON_ROUTER=0x...
REACT_APP_TRON_REFERRAL=0x...
REACT_APP_TRON_TOKEN=0x...
REACT_APP_TRON_MANAGER=0x...
REACT_APP_TRON_WHITELIST=0x...
```

#### Solana (Chain ID: 501111)
```env
REACT_APP_SOLANA_ROUTER=...
REACT_APP_SOLANA_REFERRAL=...
REACT_APP_SOLANA_TOKEN=...
REACT_APP_SOLANA_MANAGER=...
REACT_APP_SOLANA_WHITELIST=...
```

#### Bitcoin (Chain ID: 0)
```env
REACT_APP_BITCOIN_ROUTER=...
REACT_APP_BITCOIN_REFERRAL=...
REACT_APP_BITCOIN_TOKEN=...
REACT_APP_BITCOIN_MANAGER=...
REACT_APP_BITCOIN_WHITELIST=...
```

### RPC Endpoints (Optional)

You can override default RPC URLs by setting:
```env
REACT_APP_ETHEREUM_RPC=https://eth.llamarpc.com
REACT_APP_BASE_RPC=https://mainnet.base.org
# ... etc for other chains
```

For complete documentation, see [docs/CHAIN_CONFIGURATION.md](./docs/CHAIN_CONFIGURATION.md)

## 📚 Documentation

- [Chain Configuration Guide](./docs/CHAIN_CONFIGURATION.md) - Detailed chain setup and configuration
- [User Guide](./docs/USER_GUIDE.md) - How to use the application
- [Developer Guide](./docs/DEVELOPER_GUIDE.md) - Development and contribution guide
- [Integration Guide](./INTEGRATION_GUIDE.md) - API integration documentation

## 🏗️ Project Structure

```
mangoDapp/
├── src/
│   ├── components/          # React components
│   │   ├── swapBox.js      # Main swap interface
│   │   ├── CrossChainSwap.js # Cross-chain swap component
│   │   ├── TronSwap.js     # Tron-specific swap
│   │   └── ...
│   ├── services/            # API and service modules
│   │   ├── chainConfig.js  # Chain configuration service
│   │   ├── mangoApi.js     # Mango DeFi API client
│   │   └── rpcProvider.js  # RPC fallback mechanism
│   ├── hooks/              # Custom React hooks
│   │   ├── useCrossChainSwap.js
│   │   ├── useLayerSwap.js
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── chainErrors.js  # Chain-specific error handling
│   │   └── chainValidation.js
│   └── __tests__/          # Test files
├── chains.json             # Chain configuration
├── .env.example           # Environment variables template
└── docs/                  # Documentation
```

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run E2E tests:
```bash
npm run test:e2e
```

## 🚀 Building for Production

```bash
npm run build
```

The production build will be in the `build/` directory.

## 🔍 Troubleshooting

### Common Issues

#### Wallet Connection Issues

**Problem**: Wallet won't connect
- **Solution**: Ensure you're using a supported wallet (MetaMask, WalletConnect, etc.)
- **Solution**: Check browser console for errors
- **Solution**: Verify network is supported

#### Network Switching Issues

**Problem**: Can't switch to required network
- **Solution**: Ensure network is added to your wallet
- **Solution**: Check if network RPC is accessible
- **Solution**: Try manual network addition

#### Transaction Failures

**Problem**: Transactions failing
- **Solution**: Check sufficient balance for gas fees
- **Solution**: Verify contract addresses are correct
- **Solution**: Check network congestion

#### Chain-Specific Issues

**Ethereum**: High gas fees, slow confirmations
- Use Layer 2 solutions (Base, Arbitrum, Optimism) for lower fees

**Tron**: TronLink not detected
- Install TronLink browser extension
- Refresh page after installation

**Solana/Bitcoin**: LayerSwap errors
- Verify LayerSwap API key is set
- Check LayerSwap service status
- Ensure sufficient balance for bridge fees

For more troubleshooting, see [docs/USER_GUIDE.md](./docs/USER_GUIDE.md#troubleshooting)

## 📝 Chain-Specific Features

### EVM Chains
- Direct token swaps
- Network switching
- Gas optimization
- Multi-DEX routing

### Tron
- TronLink wallet integration
- Tron-specific address validation
- TRX and TRC-20 token support

### Solana/Bitcoin
- LayerSwap bridge integration
- Deposit address generation
- Bridge status tracking
- Extended confirmation times

## 🔐 Security

- All transactions are signed locally in your wallet
- No private keys are stored or transmitted
- Smart contracts are audited
- Open source codebase

## 🤝 Contributing

See [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) for contribution guidelines.

## 📄 License

[Add your license here]

## 🔗 Links

- [Documentation](./docs/)
- [API Documentation](./INTEGRATION_GUIDE.md)
- [Chain Configuration](./docs/CHAIN_CONFIGURATION.md)

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) for FAQs
- Contact support team

---

**Note**: This is a non-custodial application. Users are responsible for their own funds and transactions. Always verify contract addresses and transaction details before confirming.
