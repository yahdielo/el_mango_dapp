# User Guide

This guide helps users understand how to use Mango DeFi for swapping tokens across multiple blockchains.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Chain Selection](#chain-selection)
3. [Network Switching](#network-switching)
4. [Making Swaps](#making-swaps)
5. [Cross-Chain Swaps](#cross-chain-swaps)
6. [Transaction Tracking](#transaction-tracking)
7. [Error Resolution](#error-resolution)
8. [FAQ](#faq)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- A Web3 wallet (MetaMask, WalletConnect, etc.)
- For Tron: TronLink browser extension
- Sufficient balance for gas fees
- Tokens to swap

### First Time Setup

1. **Connect Your Wallet**
   - Click "Connect Wallet" button
   - Select your wallet provider
   - Approve connection request

2. **Select Network**
   - Choose the blockchain you want to use
   - Ensure your wallet is on the correct network

3. **Start Swapping**
   - Select tokens to swap
   - Enter amount
   - Review and confirm

## Chain Selection

### Available Chains

Mango DeFi supports 10 blockchains:

#### EVM Chains
- **Ethereum** (Chain ID: 1) - Mainnet
- **Base** (Chain ID: 8453) - Layer 2
- **Arbitrum** (Chain ID: 42161) - Layer 2
- **BSC** (Chain ID: 56) - Binance Smart Chain
- **Polygon** (Chain ID: 137) - Layer 2
- **Optimism** (Chain ID: 10) - Layer 2
- **Avalanche** (Chain ID: 43114) - C-Chain

#### Non-EVM Chains
- **Tron** (Chain ID: 728126428) - Requires TronLink
- **Solana** (Chain ID: 501111) - Via LayerSwap
- **Bitcoin** (Chain ID: 0) - Via LayerSwap

### How to Select a Chain

1. Click on the chain selector
2. Browse available chains
3. Use search to find specific chain
4. Filter by chain type (EVM, Tron, etc.)
5. Click to select

### Chain Status Indicators

- 🟢 **Active** - Chain is operational
- 🟡 **Maintenance** - Chain is under maintenance
- 🔴 **Inactive** - Chain is temporarily unavailable

## Network Switching

### Automatic Network Switching

When you select a chain, the app will:
1. Detect your current network
2. Show a warning if networks don't match
3. Provide a button to switch networks
4. Automatically switch if enabled

### Manual Network Switching

1. **Via Wallet**
   - Open your wallet
   - Switch network manually
   - Return to app

2. **Via App**
   - Click "Switch Network" button
   - Approve network switch in wallet
   - Wait for confirmation

### Network Switching Issues

**Problem**: Can't switch network

**Solutions**:
- Ensure network is added to your wallet
- Try adding network manually
- Check if network RPC is accessible
- Refresh the page

## Making Swaps

### Standard Swap (EVM Chains)

1. **Select Source Chain**
   - Choose the blockchain
   - Ensure wallet is connected

2. **Select Tokens**
   - Click "Select Token" for input token
   - Click "Select Token" for output token
   - Search or browse token list

3. **Enter Amount**
   - Type amount to swap
   - Check minimum amount requirements
   - Review estimated output

4. **Review Details**
   - Check exchange rate
   - Review fees
   - Verify slippage tolerance

5. **Confirm Swap**
   - Click "Swap" button
   - Approve token (first time only)
   - Confirm transaction in wallet
   - Wait for confirmation

### Tron Swaps

1. **Connect TronLink**
   - Install TronLink extension
   - Create or import wallet
   - Connect to app

2. **Select Tokens**
   - Choose TRX or TRC-20 tokens
   - Enter amount

3. **Enter Recipient**
   - Enter Tron address (TXYZ...)
   - Address is validated automatically

4. **Execute Swap**
   - Click "Swap" button
   - Approve in TronLink
   - Wait for confirmation

### LayerSwap Swaps (Solana/Bitcoin)

1. **Select Chains**
   - Choose source chain (EVM)
   - Choose destination (Solana/Bitcoin)

2. **Enter Details**
   - Enter amount
   - Review LayerSwap fees
   - Check estimated time

3. **Initiate Swap**
   - Click "Initiate LayerSwap"
   - Get deposit address
   - Send tokens to deposit address

4. **Wait for Processing**
   - Monitor swap status
   - Wait for LayerSwap processing (5-15 min)
   - Receive tokens on destination chain

## Cross-Chain Swaps

### EVM to EVM

1. Select source chain
2. Select destination chain
3. Enter swap details
4. Review route and fees
5. Confirm swap
6. Track transaction on both chains

### EVM to Tron

1. Select EVM source chain
2. Select Tron as destination
3. Enter Tron recipient address
4. Review and confirm
5. Track on both chains

### EVM to Solana/Bitcoin

Uses LayerSwap bridge:
1. Select source chain
2. Select Solana/Bitcoin
3. Review LayerSwap fees
4. Initiate swap
5. Send to deposit address
6. Wait for bridge processing

## Transaction Tracking

### Viewing Transactions

1. **Transaction Hash**
   - Displayed after transaction submission
   - Click to view on explorer

2. **Transaction Status**
   - Pending - Waiting for confirmation
   - Confirming - Being processed
   - Confirmed - Successfully completed
   - Failed - Transaction failed

3. **Explorer Links**
   - Click "View on Explorer"
   - Opens block explorer in new tab
   - View transaction details

### Transaction History

- View past transactions
- Filter by chain
- Search by transaction hash
- Export transaction data

## Error Resolution

### Common Errors

#### Insufficient Balance

**Error**: "Insufficient balance"

**Solutions**:
- Check wallet balance
- Ensure enough for gas fees
- Verify token balance is sufficient

#### Network Error

**Error**: "Network error" or "RPC error"

**Solutions**:
- Check internet connection
- Try refreshing the page
- Switch to different RPC endpoint
- Wait and retry

#### Transaction Rejected

**Error**: "User rejected transaction"

**Solutions**:
- Check wallet is unlocked
- Approve transaction in wallet
- Increase gas limit if needed

#### Invalid Address

**Error**: "Invalid address format"

**Solutions**:
- Verify address format for chain
- Check address is correct
- Ensure address is for correct chain

#### Slippage Exceeded

**Error**: "Slippage tolerance exceeded"

**Solutions**:
- Increase slippage tolerance
- Try again when market is calmer
- Use smaller amount

### Chain-Specific Errors

#### Ethereum

**High Gas Fees**
- Use Layer 2 solutions (Base, Arbitrum, Optimism)
- Wait for lower gas periods
- Use gas tracker to find optimal time

**Slow Confirmations**
- Normal during high congestion
- Wait patiently
- Check transaction status on explorer

#### Tron

**TronLink Not Detected**
- Install TronLink extension
- Refresh page
- Enable TronLink in browser

**Invalid Tron Address**
- Tron addresses start with 'T'
- Verify address format
- Check address is correct

#### Solana/Bitcoin

**LayerSwap Errors**
- Verify LayerSwap API is accessible
- Check deposit address is correct
- Ensure sufficient balance for fees
- Wait for processing time

## FAQ

### General Questions

**Q: Which wallets are supported?**
A: MetaMask, WalletConnect, TronLink, and other Web3 wallets.

**Q: Are there fees?**
A: Yes, there are network gas fees and swap fees. LayerSwap swaps have additional bridge fees.

**Q: How long do swaps take?**
A: EVM swaps: 1-5 minutes. Tron: 1-3 minutes. LayerSwap: 5-15 minutes.

**Q: Can I cancel a swap?**
A: Once submitted, swaps cannot be cancelled. LayerSwap swaps can be cancelled before deposit.

### Chain-Specific Questions

**Q: Why use Layer 2 chains?**
A: Lower gas fees and faster transactions compared to Ethereum mainnet.

**Q: Do I need TronLink for Tron?**
A: Yes, TronLink is required for Tron swaps.

**Q: How do Solana/Bitcoin swaps work?**
A: They use LayerSwap bridge service. You send tokens to a deposit address, and LayerSwap processes the swap.

**Q: Can I swap between any chains?**
A: Yes, you can swap between any supported chains. Some pairs use LayerSwap bridge.

### Technical Questions

**Q: What is slippage?**
A: Slippage is the difference between expected and actual swap price. Higher slippage tolerance allows larger price movements.

**Q: What are minimum amounts?**
A: Each chain has minimum swap amounts to prevent dust transactions and ensure economic viability.

**Q: How are contract addresses managed?**
A: Contract addresses are configured via environment variables and managed by ChainConfigService.

**Q: What if a transaction fails?**
A: Failed transactions still consume gas. Check error message and try again with adjusted parameters.

## Troubleshooting

### Wallet Issues

**Problem**: Wallet won't connect

**Solutions**:
1. Ensure wallet extension is installed
2. Unlock your wallet
3. Refresh the page
4. Try different wallet
5. Check browser console for errors

**Problem**: Wrong network detected

**Solutions**:
1. Switch network in wallet
2. Use "Switch Network" button
3. Add network manually if needed
4. Refresh page after switching

### Transaction Issues

**Problem**: Transaction stuck pending

**Solutions**:
1. Check network congestion
2. Verify transaction on explorer
3. Try increasing gas price
4. Wait for confirmation
5. Contact support if stuck > 1 hour

**Problem**: Transaction failed

**Solutions**:
1. Check error message
2. Verify sufficient balance
3. Check contract addresses
4. Try with higher gas limit
5. Verify network is correct

### Chain-Specific Issues

#### Ethereum

**High Gas Fees**
- Use Layer 2 alternatives
- Wait for lower gas periods
- Use gas optimization tools

**Slow Transactions**
- Normal during congestion
- Check transaction status
- Be patient

#### Tron

**TronLink Issues**
- Reinstall extension
- Clear browser cache
- Try different browser
- Check TronLink is updated

**Address Validation Errors**
- Verify address format (starts with T)
- Check address is correct
- Ensure address is for Tron network

#### Solana/Bitcoin

**LayerSwap Issues**
- Verify API key is set
- Check LayerSwap status
- Verify deposit address
- Contact LayerSwap support

**Long Processing Times**
- Normal for bridge swaps
- Can take 5-15 minutes
- Monitor swap status
- Check LayerSwap dashboard

### Getting Help

If you encounter issues:

1. **Check Documentation**
   - Review this guide
   - Check [Chain Configuration](./CHAIN_CONFIGURATION.md)
   - Review [Developer Guide](./DEVELOPER_GUIDE.md)

2. **Check Error Messages**
   - Read error messages carefully
   - Note error codes
   - Check transaction hash on explorer

3. **Contact Support**
   - Open GitHub issue
   - Include error details
   - Provide transaction hashes
   - Include browser/OS information

4. **Community Resources**
   - Check GitHub issues
   - Review documentation
   - Join community discussions

## Best Practices

1. **Always Verify**
   - Check contract addresses
   - Verify transaction details
   - Confirm network before swapping

2. **Start Small**
   - Test with small amounts first
   - Verify everything works
   - Then use larger amounts

3. **Monitor Transactions**
   - Track transaction status
   - Save transaction hashes
   - Check explorer links

4. **Security**
   - Never share private keys
   - Verify URLs are correct
   - Use official links only
   - Be cautious of phishing

5. **Gas Management**
   - Monitor gas prices
   - Use Layer 2 when possible
   - Time transactions for lower gas

---

For technical details, see [Developer Guide](./DEVELOPER_GUIDE.md)
For configuration help, see [Chain Configuration](./CHAIN_CONFIGURATION.md)

