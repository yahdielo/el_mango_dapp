# Chain Configuration Guide

This document explains how to configure and manage blockchain chains in Mango DeFi.

## Overview

Mango DeFi supports 10 different blockchains:
- 7 EVM-compatible chains (Ethereum, Base, Arbitrum, BSC, Polygon, Optimism, Avalanche)
- 1 Tron chain
- 1 Solana chain (via LayerSwap)
- 1 Bitcoin chain (via LayerSwap)

Chain configuration is managed through:
1. `chains.json` - Static chain metadata
2. Environment variables - Contract addresses and API keys
3. `ChainConfigService` - Runtime configuration service

## chains.json Structure

The `chains.json` file contains static chain metadata for all supported chains.

### Basic Structure

```json
{
  "chainName": "Ethereum",
  "chainId": "1",
  "type": "EVM",
  "img": "data:image/png;base64,...",
  "nativeCurrency": {
    "name": "ETH",
    "symbol": "ETH",
    "decimals": 18
  },
  "rpcUrls": [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth"
  ],
  "blockExplorers": [
    {
      "name": "Etherscan",
      "url": "https://etherscan.io"
    }
  ],
  "contracts": {
    "router": null,
    "referral": null,
    "token": null,
    "manager": null,
    "whitelist": null
  },
  "dexes": ["Uniswap V2", "Uniswap V3"],
  "bridge": "LayerSwap",
  "status": "active",
  "gasSettings": {
    "gasLimit": 500000,
    "maxFeePerGas": null,
    "maxPriorityFeePerGas": null,
    "gasPrice": null
  },
  "slippage": {
    "default": 0.5,
    "min": 0.1,
    "max": 5.0
  },
  "timeouts": {
    "transactionTimeout": 300000,
    "rpcTimeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "minimums": {
    "swap": "0.001",
    "referral": "0.0001"
  },
  "blockTime": 12,
  "confirmationsRequired": 1,
  "featureFlags": {
    "directSwap": true,
    "layerSwap": false,
    "referralSystem": true,
    "whitelist": false,
    "tokenTax": false,
    "crossChainSync": true,
    "batchOperations": false
  }
}
```

### Field Descriptions

#### Required Fields

- **chainName**: Display name of the chain
- **chainId**: Unique chain identifier (string)
- **type**: Chain type (`EVM`, `TRON`, `SOLANA`, `BITCOIN`)
- **nativeCurrency**: Native token information
- **rpcUrls**: Array of RPC endpoint URLs
- **blockExplorers**: Array of block explorer configurations

#### Optional Fields

- **img**: Base64 encoded chain logo
- **contracts**: Contract addresses (loaded from environment)
- **dexes**: Supported DEXes on this chain
- **bridge**: Bridge service used (e.g., "LayerSwap")
- **status**: Chain status (`active`, `maintenance`, `inactive`)
- **gasSettings**: Gas configuration
- **slippage**: Slippage tolerance settings
- **timeouts**: Timeout configurations
- **minimums**: Minimum transaction amounts
- **blockTime**: Average block time in seconds
- **confirmationsRequired**: Number of confirmations needed
- **featureFlags**: Feature availability flags

## ChainConfigService API

The `ChainConfigService` provides a centralized API for accessing chain configuration.

### Import

```javascript
import chainConfig from '../services/chainConfig';
```

### Methods

#### Get Chain Information

```javascript
// Get all chains
const allChains = chainConfig.getAllChains();
// Returns: Array of all chain configurations

// Get only EVM chains
const evmChains = chainConfig.getEVMChains();
// Returns: Array of EVM-compatible chains

// Get specific chain by ID
const chain = chainConfig.getChain(8453); // Base
// Returns: Chain configuration object or undefined
```

#### Get Contract Addresses

```javascript
// Get contract address
const routerAddress = chainConfig.getContractAddress(8453, 'router');
const referralAddress = chainConfig.getContractAddress(8453, 'referral');
const tokenAddress = chainConfig.getContractAddress(8453, 'token');
const managerAddress = chainConfig.getContractAddress(8453, 'manager');
const whitelistAddress = chainConfig.getContractAddress(8453, 'whitelist');
```

#### Get Chain Settings

```javascript
// Get RPC URLs
const rpcUrls = chainConfig.getRpcUrls(8453);

// Get gas settings
const gasSettings = chainConfig.getGasSettings(8453);

// Get slippage tolerance
const slippage = chainConfig.getSlippageTolerance(8453);

// Get timeout settings
const timeouts = chainConfig.getTimeoutSettings(8453);

// Get minimum amounts
const minimums = chainConfig.getMinimumAmounts(8453);

// Get block time
const blockTime = chainConfig.getBlockTime(8453);

// Get confirmations required
const confirmations = chainConfig.getConfirmationsRequired(8453);
```

#### Get Feature Flags

```javascript
// Get all feature flags
const features = chainConfig.getFeatureFlags(8453);
// Returns: { directSwap, layerSwap, referralSystem, whitelist, tokenTax, crossChainSync, batchOperations }

// Check specific feature (using featureFlags utility)
import { supportsDirectSwap, requiresLayerSwap } from '../utils/featureFlags';
const supportsDirect = supportsDirectSwap(8453);
const requiresLS = requiresLayerSwap(501111); // Solana
```

#### Get Explorer URLs

```javascript
// Get explorer URL for transaction
const txUrl = chainConfig.getExplorerUrl(8453, '0x...');

// Get explorer URL for address
const chain = chainConfig.getChain(8453);
const addressUrl = `${chain.blockExplorers[0].url}/address/0x...`;
```

#### Address Validation

```javascript
// Validate address format for any chain
const isValid = chainConfig.validateAddress(8453, '0x...'); // EVM
const isValidTron = chainConfig.validateAddress(728126428, 'TXYZ...'); // Tron
const isValidSolana = chainConfig.validateAddress(501111, 'So1...'); // Solana
const isValidBitcoin = chainConfig.validateAddress(0, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'); // Bitcoin

// Returns: true if address format is valid for the chain, false otherwise
```

#### Error Messages

```javascript
// Get chain-specific error message
const errorMsg = chainConfig.getErrorMessage(8453, 'invalidAddress');
const errorMsg = chainConfig.getErrorMessage(8453, 'networkError');
const errorMsg = chainConfig.getErrorMessage(8453, 'transactionFailed');
```

## Environment Variables

Contract addresses are loaded from environment variables. The naming convention is:

```
REACT_APP_{CHAIN_NAME}_{CONTRACT_TYPE}
```

### Contract Types

- `ROUTER` - Swap router contract
- `REFERRAL` - Referral contract
- `TOKEN` - MANGO token contract
- `MANAGER` - Manager contract
- `WHITELIST` - Whitelist contract

### Examples

```env
# Base
REACT_APP_BASE_ROUTER=0x...
REACT_APP_BASE_REFERRAL=0x...
REACT_APP_BASE_TOKEN=0x...
REACT_APP_BASE_MANAGER=0x...
REACT_APP_BASE_WHITELIST=0x...

# Arbitrum
REACT_APP_ARBITRUM_ROUTER=0x...
REACT_APP_ARBITRUM_REFERRAL=0x...
# ... etc
```

### RPC Override

You can override default RPC URLs:

```env
REACT_APP_BASE_RPC=https://mainnet.base.org
REACT_APP_ETHEREUM_RPC=https://eth.llamarpc.com
```

## Chain-Specific Settings

### EVM Chains

All EVM chains share similar configuration:

```json
{
  "type": "EVM",
  "featureFlags": {
    "directSwap": true,
    "layerSwap": false,
    "referralSystem": true
  }
}
```

### Tron

Tron requires special handling:

```json
{
  "type": "TRON",
  "chainId": "728126428",
  "featureFlags": {
    "directSwap": true,
    "layerSwap": false,
    "referralSystem": true
  }
}
```

- Uses TronLink wallet
- Address format: `TXYZ...`
- Explorer: Tronscan

### Solana

Solana uses LayerSwap:

```json
{
  "type": "SOLANA",
  "chainId": "501111",
  "bridge": "LayerSwap",
  "featureFlags": {
    "directSwap": false,
    "layerSwap": true,
    "referralSystem": false
  }
}
```

- Requires LayerSwap API key
- Uses deposit addresses
- Extended confirmation times

### Bitcoin

Bitcoin uses LayerSwap:

```json
{
  "type": "BITCOIN",
  "chainId": "0",
  "bridge": "LayerSwap",
  "featureFlags": {
    "directSwap": false,
    "layerSwap": true,
    "referralSystem": false
  }
}
```

- Requires LayerSwap API key
- Uses Bitcoin addresses
- Extended confirmation times

## Adding a New Chain

### Step 1: Update chains.json

Add chain configuration to `chains.json`:

```json
{
  "chainName": "New Chain",
  "chainId": "12345",
  "type": "EVM",
  "nativeCurrency": {
    "name": "NATIVE",
    "symbol": "NATIVE",
    "decimals": 18
  },
  "rpcUrls": ["https://rpc.newchain.com"],
  "blockExplorers": [{
    "name": "NewScan",
    "url": "https://newscan.io"
  }],
  "contracts": {
    "router": null,
    "referral": null,
    "token": null,
    "manager": null,
    "whitelist": null
  },
  "dexes": ["DEX Name"],
  "status": "active",
  "gasSettings": {
    "gasLimit": 500000
  },
  "slippage": {
    "default": 0.5,
    "min": 0.1,
    "max": 5.0
  },
  "timeouts": {
    "transactionTimeout": 300000,
    "rpcTimeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "minimums": {
    "swap": "0.001",
    "referral": "0.0001"
  },
  "blockTime": 12,
  "confirmationsRequired": 1,
  "featureFlags": {
    "directSwap": true,
    "layerSwap": false,
    "referralSystem": true,
    "whitelist": false
  }
}
```

### Step 2: Update ChainConfigService

Add contract address loading in `src/services/chainConfig.js`:

```javascript
12345: { // New Chain
  router: process.env.REACT_APP_NEWCHAIN_ROUTER || null,
  referral: process.env.REACT_APP_NEWCHAIN_REFERRAL || null,
  token: process.env.REACT_APP_NEWCHAIN_TOKEN || null,
  manager: process.env.REACT_APP_NEWCHAIN_MANAGER || null,
  whitelist: process.env.REACT_APP_NEWCHAIN_WHITELIST || null,
},
```

### Step 3: Add Environment Variables

Update `.env.example`:

```env
# New Chain
REACT_APP_NEWCHAIN_ROUTER=0x...
REACT_APP_NEWCHAIN_REFERRAL=0x...
REACT_APP_NEWCHAIN_TOKEN=0x...
REACT_APP_NEWCHAIN_MANAGER=0x...
REACT_APP_NEWCHAIN_WHITELIST=0x...
REACT_APP_NEWCHAIN_RPC=https://rpc.newchain.com
```

### Step 4: Update Wallet Provider

If EVM chain, add to `src/components/utils/appKitProvider.js`:

```javascript
import { newChain } from '@reown/appkit/networks';

const networks = [
  // ... existing chains
  newChain, // Add new chain
];
```

### Step 5: Test

1. Test chain detection
2. Test wallet connection
3. Test contract interactions
4. Test transaction flow

## Troubleshooting

### Contract Addresses Not Loading

**Problem**: Contract addresses return `null`

**Solutions**:
- Verify environment variables are set correctly
- Check variable naming matches convention
- Restart development server after changing `.env`
- Verify `REACT_APP_` prefix is used

### RPC Connection Issues

**Problem**: Can't connect to chain RPC

**Solutions**:
- Verify RPC URLs are accessible
- Check RPC rate limits
- Use fallback RPC URLs
- Verify network connectivity

### Chain Not Detected

**Problem**: Chain doesn't appear in UI

**Solutions**:
- Verify chain is in `chains.json`
- Check `status` is set to `"active"`
- Verify `chainId` is correct
- Check browser console for errors

### Feature Flags Not Working

**Problem**: Features not available when they should be

**Solutions**:
- Verify `featureFlags` in `chains.json`
- Check `ChainConfigService` methods
- Verify feature flag checks in components

## Best Practices

1. **Always use ChainConfigService**: Don't hardcode chain data
2. **Use environment variables**: Don't commit contract addresses
3. **Provide fallback RPCs**: Multiple RPC URLs for reliability
4. **Test all chains**: Verify functionality on each chain
5. **Document changes**: Update documentation when adding chains
6. **Version control**: Track changes to `chains.json`

## Examples

### Getting Chain Information

```javascript
import chainConfig from '../services/chainConfig';

// Get Base chain info
const baseChain = chainConfig.getChain(8453);
console.log(baseChain.chainName); // "Base"
console.log(baseChain.type); // "EVM"

// Get all EVM chains
const evmChains = chainConfig.getEVMChains();
console.log(evmChains.length); // 7

// Check if chain supports direct swap (using featureFlags utility)
import { supportsDirectSwap } from '../utils/featureFlags';
const supportsDirect = supportsDirectSwap(8453);
console.log(supportsDirect); // true
```

### Using Contract Addresses

```javascript
// Get router address
const router = chainConfig.getContractAddress(8453, 'router');
if (router) {
  // Use router address
  console.log('Router:', router);
} else {
  console.error('Router address not configured');
}
```

### Validating Addresses

```javascript
// Validate EVM address
const isValid = chainConfig.validateAddress(8453, '0x1234...');
if (!isValid) {
  alert('Invalid address');
}

// Validate Tron address
const isValidTron = chainConfig.validateAddress(728126428, 'TXYZ...');
```

For more information, see:
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [User Guide](./USER_GUIDE.md)

