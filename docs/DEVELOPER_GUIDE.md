# Developer Guide

This guide is for developers contributing to or integrating with Mango DeFi.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Chain Configuration](#chain-configuration)
4. [Adding New Chains](#adding-new-chains)
5. [Chain-Specific Implementation](#chain-specific-implementation)
6. [API Documentation](#api-documentation)
7. [Testing Guide](#testing-guide)
8. [Deployment Guide](#deployment-guide)

## Getting Started

### Prerequisites

- Node.js 24.x
- npm >= 10.x
- Git
- Code editor (VS Code recommended)

### Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd mangoDapp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**
   ```bash
   npm start
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Project Structure

```
mangoDapp/
├── src/
│   ├── components/          # React components
│   │   ├── swapBox.js      # Main swap interface
│   │   ├── CrossChainSwap.js
│   │   ├── TronSwap.js
│   │   ├── LayerSwapSwap.js
│   │   ├── chainModal.js
│   │   ├── ChainStatusBadge.js
│   │   └── ...
│   ├── services/            # API and services
│   │   ├── chainConfig.js  # Chain configuration service
│   │   ├── mangoApi.js     # Mango DeFi API client
│   │   ├── rpcProvider.js  # RPC fallback mechanism
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useCrossChainSwap.js
│   │   ├── useLayerSwap.js
│   │   ├── useNetworkDetection.js
│   │   ├── useTransactionStatus.js
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── chainErrors.js
│   │   ├── chainValidation.js
│   │   └── ...
│   ├── config/             # Configuration files
│   │   └── tokenLists.js
│   └── __tests__/          # Test files
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── chains.json             # Chain configuration
├── .env.example           # Environment variables template
└── docs/                  # Documentation
```

## Chain Configuration

### ChainConfigService

The `ChainConfigService` is the central service for chain configuration.

**Location**: `src/services/chainConfig.js`

**Usage**:
```javascript
import chainConfig from '../services/chainConfig';

// Get chain information
const chain = chainConfig.getChain(8453);

// Get contract address
const router = chainConfig.getContractAddress(8453, 'router');

// Check features
const supportsDirect = chainConfig.supportsDirectSwap(8453);
```

See [Chain Configuration Guide](./CHAIN_CONFIGURATION.md) for complete API documentation.

### chains.json

Static chain metadata stored in `chains.json`.

**Structure**:
```json
{
  "chainName": "Base",
  "chainId": "8453",
  "type": "EVM",
  "nativeCurrency": { ... },
  "rpcUrls": [ ... ],
  "blockExplorers": [ ... ],
  "featureFlags": { ... }
}
```

### Environment Variables

Contract addresses loaded from environment variables:

```env
REACT_APP_BASE_ROUTER=0x...
REACT_APP_BASE_REFERRAL=0x...
```

## Adding New Chains

### Step 1: Update chains.json

Add chain configuration:

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
  "featureFlags": {
    "directSwap": true,
    "layerSwap": false,
    "referralSystem": true
  }
}
```

### Step 2: Update ChainConfigService

Add contract address loading:

```javascript
// In loadContractAddresses()
12345: {
  router: process.env.REACT_APP_NEWCHAIN_ROUTER || null,
  referral: process.env.REACT_APP_NEWCHAIN_REFERRAL || null,
  token: process.env.REACT_APP_NEWCHAIN_TOKEN || null,
  manager: process.env.REACT_APP_NEWCHAIN_MANAGER || null,
  whitelist: process.env.REACT_APP_NEWCHAIN_WHITELIST || null,
},
```

### Step 3: Update Wallet Provider

For EVM chains, add to `appKitProvider.js`:

```javascript
import { newChain } from '@reown/appkit/networks';

const networks = [
  // ... existing
  newChain,
];
```

### Step 4: Add Environment Variables

Update `.env.example`:

```env
REACT_APP_NEWCHAIN_ROUTER=0x...
REACT_APP_NEWCHAIN_REFERRAL=0x...
```

### Step 5: Create Tests

Add E2E test in `src/__tests__/e2e/newChainSwap.test.js`:

```javascript
describe('New Chain E2E Swap Flow', () => {
  // Test implementation
});
```

### Step 6: Update Documentation

- Update README.md
- Update CHAIN_CONFIGURATION.md
- Update USER_GUIDE.md

## Chain-Specific Implementation

### EVM Chains

Standard implementation using Wagmi:

```javascript
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { writeContract } from 'wagmi/actions';

const swap = async () => {
  await writeContract({
    address: routerAddress,
    abi: routerAbi,
    functionName: 'swap',
    args: [tokenIn, tokenOut, amount],
  });
};
```

### Tron

Uses TronLink and custom API:

```javascript
import mangoApi from '../services/mangoApi';

const swap = async () => {
  const result = await mangoApi.tron.signAndExecuteTronSwap({
    tokenIn,
    tokenOut,
    amountIn,
    recipient,
  });
};
```

**Requirements**:
- TronLink wallet detection
- Tron address validation
- Custom API endpoints

### Solana/Bitcoin

Uses LayerSwap integration:

```javascript
import { useLayerSwap } from '../hooks/useLayerSwap';

const { initiateSwap } = useLayerSwap();

const swap = async () => {
  await initiateSwap({
    sourceChainId,
    destChainId,
    tokenIn,
    amountIn,
  });
};
```

**Requirements**:
- LayerSwap API key
- Deposit address handling
- Status polling

## Slippage Tolerance Implementation

### Overview

Slippage tolerance is applied at the contract level to protect users from price movements during swap execution. The contract calculates the minimum amount out based on the expected output and slippage tolerance.

### Contract Interface

The `MangoRouterSecure` contract's `swap` function accepts a `slippageTolerance` parameter:

```solidity
function swap(
    address token0, 
    address token1,
    uint256 amount,
    address referrer,
    uint256 slippageTolerance  // In basis points (10000 = 100%)
) external payable returns(uint256 amountOut)
```

### Slippage Calculation

**Formula**: `minAmountOut = expectedAmountOut * (BASIS_POINTS - slippageTolerance) / BASIS_POINTS`

Where:
- `BASIS_POINTS = 10000` (100% = 10000 basis points)
- `slippageTolerance` is in basis points (e.g., 50 = 0.5%, 100 = 1%)

**Example**:
- Expected output: 1000 tokens
- Slippage tolerance: 50 basis points (0.5%)
- Minimum output: `1000 * (10000 - 50) / 10000 = 995 tokens`

### Frontend Implementation

#### Using Slippage Utils

```javascript
import { getSlippageToleranceInBasisPoints } from '../utils/slippageUtils';
import chainConfig from '../services/chainConfig';

// Get slippage tolerance in basis points
const slippageTolerance = getSlippageToleranceInBasisPoints(chainId, chainConfig);

// Use in swap function call
await writeContract({
    address: routerAddress,
    abi: routerAbi,
    functionName: 'swap',
    args: [token0, token1, amount, referrer, slippageTolerance],
});
```

#### Slippage Conversion

The `slippageUtils.js` utility provides conversion functions:

```javascript
import { 
    convertPercentageToBasisPoints,
    convertBasisPointsToPercentage,
    calculateMinAmountOut,
    validateSlippageTolerance
} from '../utils/slippageUtils';

// Convert percentage to basis points
const basisPoints = convertPercentageToBasisPoints(0.5); // Returns 50n

// Convert basis points to percentage
const percentage = convertBasisPointsToPercentage(50n); // Returns 0.5

// Calculate minimum amount out
const minAmount = calculateMinAmountOut(1000n, 50n); // Returns 995n

// Validate slippage tolerance
const validation = validateSlippageTolerance(50n);
// Returns { isValid: true, message: 'Slippage tolerance is valid' }
```

### Chain-Specific Slippage

Slippage tolerance is configured per chain in `chains.json`:

```json
{
  "chainId": "8453",
  "chainName": "Base",
  "slippage": {
    "default": 0.5,
    "min": 0.1,
    "max": 5.0
  }
}
```

**Contract Constraints**:
- Minimum: 50 basis points (0.5%)
- Maximum: 1000 basis points (10%)

### Getting Slippage Settings

```javascript
import chainConfig from '../services/chainConfig';

// Get slippage settings for a chain
const slippageSettings = chainConfig.getSlippageTolerance(chainId);
// Returns: { default: 0.5, min: 0.1, max: 5.0 }

// Use default slippage
const slippageTolerance = getSlippageToleranceInBasisPoints(
    chainId, 
    chainConfig
);
```

### Error Handling

If slippage is exceeded during swap execution, the contract will revert with `SlippageExceeded()` error. The frontend should handle this gracefully:

```javascript
try {
    await writeContract({
        // ... swap parameters
    });
} catch (error) {
    if (error.message.includes('SlippageExceeded')) {
        // Handle slippage exceeded error
        alert('Slippage tolerance exceeded. Please try again with a higher tolerance.');
    }
}
```

### Best Practices

1. **Always use chain-specific slippage**: Get slippage from `ChainConfigService` rather than hardcoding
2. **Validate slippage before swap**: Use `validateSlippageTolerance()` to ensure slippage is within contract bounds
3. **Display slippage to users**: Show the slippage tolerance being used in the UI
4. **Handle slippage errors**: Provide clear error messages when slippage is exceeded
5. **Consider market conditions**: Higher volatility may require higher slippage tolerance

## API Documentation

### Mango DeFi API

**Base URL**: Configured via `REACT_APP_MANGO_API_URL`

**Authentication**: API key via `REACT_APP_MANGO_API_KEY`

#### Referral API

```javascript
import { referralApi } from '../services/mangoApi';

// Get referral chain
const referral = await referralApi.getReferralChain(address, chainId);

// Sync referral
await referralApi.syncReferral(userAddress, referrerAddress, sourceChainId, destChainId);
```

#### Whitelist API

```javascript
import { whitelistApi } from '../services/mangoApi';

// Get whitelist status
const status = await whitelistApi.getWhitelistStatus(address, chainId);
```

#### Chain API

```javascript
import { chainApi } from '../services/mangoApi';

// Get supported chains
const chains = await chainApi.getSupportedChains();

// Get chain status
const status = await chainApi.getChainStatus(chainId);
```

#### Swap API

```javascript
import { swapApi } from '../services/mangoApi';

// Initiate cross-chain swap
const swap = await swapApi.initiateCrossChainSwap({
  sourceChainId,
  destChainId,
  tokenIn,
  tokenOut,
  amountIn,
  recipient,
});

// Get swap status
const status = await swapApi.getSwapStatus(swapId);
```

### LayerSwap API

**Base URL**: `https://api.layerswap.io`

**Authentication**: API key via `REACT_APP_LAYERSWAP_API_KEY`

```javascript
import { layerSwapApi } from '../services/mangoApi';

// Get routes
const routes = await layerSwapApi.getRoutes(sourceChainId, destChainId);

// Get estimate
const estimate = await layerSwapApi.getEstimate({
  sourceChainId,
  destChainId,
  tokenIn,
  amountIn,
});

// Create order
const order = await layerSwapApi.createOrder({
  sourceChainId,
  destChainId,
  tokenIn,
  amountIn,
  destinationAddress,
});
```

## Testing Guide

### Unit Tests

**Location**: `src/__tests__/unit/`

**Run**:
```bash
npm test
```

**Example**:
```javascript
import { render, screen } from '@testing-library/react';
import ChainStatusBadge from '../components/ChainStatusBadge';

describe('ChainStatusBadge', () => {
  it('should render correctly', () => {
    render(<ChainStatusBadge chainId={8453} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Location**: `src/__tests__/integration/`

**Run**:
```bash
npm test -- integration
```

**Example**:
```javascript
describe('Chain Integration', () => {
  it('should handle wallet connection', async () => {
    // Test wallet connection flow
  });
});
```

### E2E Tests

**Location**: `src/__tests__/e2e/`

**Run**:
```bash
npm test -- e2e
```

**Example**:
```javascript
describe('Base Chain E2E Swap Flow', () => {
  it('should complete swap flow', async () => {
    // Test complete user journey
  });
});
```

### Test Coverage

**Run with coverage**:
```bash
npm run test:coverage
```

**Target**: >90% coverage

## Deployment Guide

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Contract addresses verified
- [ ] API keys set
- [ ] RPC endpoints accessible
- [ ] Tests passing
- [ ] Documentation updated

### Build Process

1. **Build Production Bundle**
   ```bash
   npm run build
   ```

2. **Verify Build**
   ```bash
   # Check build directory
   ls -la build/
   ```

3. **Test Production Build**
   ```bash
   # Serve build locally
   npx serve -s build
   ```

### Environment Configuration

**Production `.env`**:
```env
REACT_APP_MANGO_API_URL=https://api.mangodefi.com
REACT_APP_MANGO_API_KEY=prod_api_key
REACT_APP_LAYERSWAP_API_KEY=prod_layerswap_key
# ... all contract addresses
```

### Deployment Steps

1. **Set Environment Variables**
   - Configure all required variables
   - Verify API keys
   - Test API connectivity

2. **Build Application**
   ```bash
   npm run build:production
   ```

3. **Deploy to Hosting**
   - Upload `build/` directory
   - Configure server
   - Set up SSL certificate

4. **Verify Deployment**
   - Test all chains
   - Verify API connections
   - Check error handling

### CI/CD Pipeline

**Example GitHub Actions**:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - run: npm install
      - run: npm test
      - run: npm run build
      - run: npm run deploy
```

## Code Style

### JavaScript/React

- Use ES6+ features
- Prefer functional components
- Use hooks for state management
- Follow React best practices

### Naming Conventions

- **Components**: PascalCase (`ChainStatusBadge`)
- **Functions**: camelCase (`getChain`)
- **Constants**: UPPER_SNAKE_CASE (`BASE_CHAIN_ID`)
- **Files**: camelCase for components, kebab-case for utilities

### Code Organization

- Group related functionality
- Use custom hooks for reusable logic
- Separate concerns (UI, logic, API)
- Keep components focused

## Best Practices

1. **Always Use ChainConfigService**
   - Don't hardcode chain data
   - Use service methods
   - Centralize configuration

2. **Error Handling**
   - Use chain-specific error messages
   - Handle all error cases
   - Provide user-friendly messages

3. **Testing**
   - Write tests for new features
   - Maintain >90% coverage
   - Test all chains

4. **Documentation**
   - Document new features
   - Update guides
   - Add code comments

5. **Security**
   - Never commit API keys
   - Validate all inputs
   - Use environment variables

## Contributing

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Make changes
4. Write tests
5. Update documentation
6. Submit pull request

### Code Review

- All PRs require review
- Tests must pass
- Documentation must be updated
- Code style must be followed

## Resources

- [React Documentation](https://react.dev)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [Chain Configuration Guide](./CHAIN_CONFIGURATION.md)
- [User Guide](./USER_GUIDE.md)

---

For questions or issues, open a GitHub issue or contact the development team.

