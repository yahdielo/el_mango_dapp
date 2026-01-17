# Mango DeFi Services Integration Guide

This guide explains how the frontend (`mangoDapp`) integrates with the off-chain services (`mangoServices`).

## Overview

The frontend now includes integration with the Mango DeFi off-chain services API for:
- Referral chain management
- Whitelist status checking
- Chain status information
- Cross-chain swap operations (future)

## API Service Module

### Location
`src/services/mangoApi.js`

This module provides a centralized API client for all communication with the mangoServices API.

### Configuration

Set environment variables in your `.env` file:

```env
REACT_APP_MANGO_API_URL=http://localhost:3000
REACT_APP_MANGO_API_KEY=your_api_key_here
```

### Available APIs

#### Referral API
- `getReferralChain(address, chainId?, allChains?)` - Get referral information
- `syncReferral(userAddress, referrerAddress, sourceChainId, destChainId)` - Sync referral across chains

#### Whitelist API
- `getWhitelistStatus(address, chainId?)` - Get whitelist status and tier

#### Chain API
- `getSupportedChains()` - Get list of all supported chains
- `getChainStatus(chainId)` - Get status for specific chain

#### Swap API
- `initiateCrossChainSwap(swapParams)` - Initiate cross-chain swap
- `getSwapStatus(swapId)` - Get swap status

## React Hooks

### useReferralChain

Hook to get referral chain information for the connected wallet.

```javascript
import { useReferralChain } from '../hooks/useReferralChain';

const MyComponent = () => {
    const { referral, loading, error, refetch } = useReferralChain(false);
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    
    return (
        <div>
            {referral?.referrer ? (
                <p>Referred by: {referral.referrer}</p>
            ) : (
                <p>No referrer found</p>
            )}
        </div>
    );
};
```

### useWhitelist

Hook to check whitelist status.

```javascript
import { useWhitelist } from '../hooks/useWhitelist';

const MyComponent = () => {
    const { whitelistStatus, loading } = useWhitelist();
    
    const isVIP = whitelistStatus?.tier === 'VIP';
    const isPremium = whitelistStatus?.tier === 'Premium';
    
    return (
        <div>
            {isPremium && <span>Premium User - No Fees!</span>}
            {isVIP && <span>VIP User - 50% Fee Discount</span>}
        </div>
    );
};
```

### useChainStatus

Hook to get chain status information.

```javascript
import { useChainStatus } from '../hooks/useChainStatus';

const MyComponent = () => {
    const chainId = 8453; // Base
    const { status, loading } = useChainStatus(chainId);
    
    return (
        <div>
            Status: {status?.status}
            Total Swaps: {status?.totalSwaps}
        </div>
    );
};
```

## Integration Points

### 1. Referral Chain Display

You can now check if a user has a referral on the current chain:

```javascript
const { referral } = useReferralChain();
const hasReferrer = referral?.referrer !== null;
```

### 2. Whitelist Status Display

Show user their whitelist tier and benefits:

```javascript
const { whitelistStatus } = useWhitelist();
const tier = whitelistStatus?.tier; // 'None', 'Standard', 'VIP', 'Premium'
```

### 3. Automatic Referral Syncing

When a user swaps on a new chain, the off-chain services automatically sync their referral. You can also manually trigger syncing:

```javascript
const { syncReferral, syncing } = useReferralSync();

const handleSync = async () => {
    await syncReferral(
        userAddress,
        referrerAddress,
        sourceChainId,
        destChainId
    );
};
```

### 4. Cross-Chain Swap Integration (Future)

When LayerSwap integration is complete:

```javascript
import { swapApi } from '../services/mangoApi';

const initiateSwap = async () => {
    const swapOrder = await swapApi.initiateCrossChainSwap({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x...',
        tokenOut: '0x...',
        amountIn: '1000000000000000000',
        recipient: userAddress,
        referrer: referrerAddress,
    });
    
    // Poll for status
    const status = await swapApi.getSwapStatus(swapOrder.swapId);
};
```

## Error Handling

All API calls include error handling. Errors are logged to console and thrown as Error objects:

```javascript
try {
    const referral = await referralApi.getReferralChain(address);
} catch (error) {
    console.error('Failed to fetch referral:', error.message);
    // Handle error in UI
}
```

## Environment Variables

Required environment variables:

- `REACT_APP_MANGO_API_URL` - Base URL for mangoServices API (default: http://localhost:3000)
- `REACT_APP_MANGO_API_KEY` - API key for authentication

## Next Steps

1. **Set up environment variables** in your `.env` file
2. **Test API connectivity** by checking health endpoint
3. **Integrate referral display** in your swap UI
4. **Show whitelist benefits** to users
5. **Add cross-chain swap UI** when LayerSwap integration is complete

## Troubleshooting

### API Connection Errors

- Check that mangoServices is running
- Verify `REACT_APP_MANGO_API_URL` is correct
- Check CORS settings in mangoServices
- Verify API key is set correctly

### No Referral Data

- User may not have a referral on this chain
- Check if referral exists on other chains with `allChains: true`
- Verify database has referral data

### Whitelist Not Working

- Verify whitelist contract is deployed
- Check if address is in whitelist cache
- Verify API key has permissions

## API Documentation

Full API documentation is available at:
- Swagger UI: `http://localhost:3000/api/docs`
- Or see `mangoServices/README.md` for endpoint details

