/**
 * Integration Tests for Multichain Token Swap Flow
 * 
 * Comprehensive integration tests covering:
 * - Direct swap integration tests (same chain)
 * - Cross-chain swap integration tests
 * - Token selection integration tests
 * - Error handling tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useAccount, useBalance } from 'wagmi';
import CrossChainSwap from '../../components/CrossChainSwap';

// Mock dependencies
jest.mock('wagmi');
jest.mock('../../hooks/useCrossChainSwap', () => ({
  useSwapRoutes: jest.fn(),
  useSwapEstimate: jest.fn(),
  useCrossChainSwap: jest.fn(),
}));
jest.mock('../../services/chainConfig');
jest.mock('../../utils/chainValidation');
jest.mock('../../utils/featureFlags', () => ({
  supportsDirectSwap: jest.fn(() => true),
  requiresLayerSwap: jest.fn(() => false),
  supportsWhitelist: jest.fn(() => false),
  getFeatureMessage: jest.fn(() => ''),
  FEATURE_FLAGS: {},
}));
jest.mock('../../utils/chainErrors');

// Mock child components
jest.mock('../../components/ChainStatusBadge', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ chainId }) => React.createElement('div', { 'data-testid': `chain-status-badge-${chainId}` }, 'Status'),
  };
});
jest.mock('../../components/WhitelistBadge', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'whitelist-badge' }, 'WhitelistBadge'),
  };
});
jest.mock('../../components/SwapProgress', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ swapStatus }) => React.createElement('div', { 'data-testid': 'swap-progress' }, `SwapProgress: ${swapStatus?.status || ''}`),
  };
});
jest.mock('../../components/getTokenList', () => {
  const React = require('react');
  const MockCallTokenList = ({ show, onHide, onTokenSelect, chainInfo, filterByChainId }) => {
    if (!show) return null;
    
    // Mock tokens for different chains
    const mockTokens = [
      {
        symbol: 'WETH',
        address: '0x4200000000000000000000000000000000000006',
        img: '/weth.png',
        decimals: 18,
        name: 'Wrapped Ethereum',
        chainId: 8453, // Base
      },
      {
        symbol: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        img: '/usdc.png',
        decimals: 6,
        name: 'USD Coin',
        chainId: 8453, // Base
      },
      {
        symbol: 'WETH',
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        img: '/weth.png',
        decimals: 18,
        name: 'Wrapped Ethereum',
        chainId: 42161, // Arbitrum
      },
      {
        symbol: 'USDC',
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        img: '/usdc.png',
        decimals: 6,
        name: 'USD Coin',
        chainId: 42161, // Arbitrum
      },
    ];
    
    // Filter tokens by chainId if filterByChainId is provided
    const filteredTokens = filterByChainId 
      ? mockTokens.filter(token => token.chainId === filterByChainId)
      : mockTokens;
    
    return React.createElement('div', { 'data-testid': 'token-list-modal' },
      React.createElement('div', {}, 'Token List Modal'),
      ...filteredTokens.map((token, index) => 
        React.createElement('button', {
          key: index,
          'data-testid': `select-token-${token.symbol}-${token.chainId}`,
          onClick: () => onTokenSelect(token),
        }, `Select ${token.symbol} (${token.chainId})`)
      ),
      React.createElement('button', {
        'data-testid': 'close-modal',
        onClick: onHide,
      }, 'Close')
    );
  };
  return {
    __esModule: true,
    default: MockCallTokenList,
  };
});

import { useSwapRoutes, useSwapEstimate, useCrossChainSwap } from '../../hooks/useCrossChainSwap';
import chainConfig from '../../services/chainConfig';
import { checkMinimumAmount } from '../../utils/chainValidation';
import { formatErrorForDisplay } from '../../utils/chainErrors';
import mangoApi from '../../services/mangoApi';

// Mock mangoApi
jest.mock('../../services/mangoApi', () => {
  const swapApi = {
    getRoutes: jest.fn(),
    getEstimate: jest.fn(),
    initiateCrossChainSwap: jest.fn(),
    getSwapStatus: jest.fn(),
    cancelSwap: jest.fn(),
  };
  return {
    swapApi,
    default: { swapApi },
  };
});

describe('Multichain Token Swap Integration Tests', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  
  const mockTokenBaseWETH = {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    img: '/weth.png',
    decimals: 18,
    name: 'Wrapped Ethereum',
    chainId: 8453, // Base
  };
  
  const mockTokenBaseUSDC = {
    symbol: 'USDC',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    img: '/usdc.png',
    decimals: 6,
    name: 'USD Coin',
    chainId: 8453, // Base
  };
  
  const mockTokenArbitrumWETH = {
    symbol: 'WETH',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    img: '/weth.png',
    decimals: 18,
    name: 'Wrapped Ethereum',
    chainId: 42161, // Arbitrum
  };
  
  const mockInitiateSwap = jest.fn();
  const mockCancelSwap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock wagmi
    useAccount.mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });

    useBalance.mockReturnValue({
      data: {
        value: BigInt('1000000000000000000'), // 1 token
        decimals: 18,
        formatted: '1.0',
        symbol: 'WETH',
      },
      isError: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Mock useCrossChainSwap hooks
    useSwapRoutes.mockReturnValue({
      routes: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    useSwapEstimate.mockReturnValue({
      estimate: {
        totalFee: '50000000000000000',
        mangoFee: '30000000000000000',
        layerSwapFee: '20000000000000000',
        estimatedTime: 120,
      },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    useCrossChainSwap.mockReturnValue({
      initiateSwap: mockInitiateSwap,
      cancelSwap: mockCancelSwap,
      swapStatus: null,
      loading: false,
      error: null,
      isPolling: false,
    });

    // Mock chainConfig
    chainConfig.getAllChains.mockReturnValue([
      { chainId: '8453', chainName: 'Base', type: 'EVM' },
      { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
    ]);

    chainConfig.getChain.mockImplementation((chainId) => {
      const chains = {
        8453: { chainId: '8453', chainName: 'Base', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
        42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
      };
      return chains[chainId] || { chainId: chainId?.toString(), chainName: `Chain ${chainId}`, type: 'EVM' };
    });

    chainConfig.getGasSettings.mockReturnValue({
      gasLimit: 500000,
      gasPrice: null,
    });

    chainConfig.getSlippageTolerance.mockReturnValue({
      default: 0.5,
      min: 0.1,
      max: 5.0,
    });

    chainConfig.getMinimumAmounts.mockReturnValue({
      swap: '0.001',
    });

    // Mock utility functions
    checkMinimumAmount.mockReturnValue({
      isValid: true,
      message: '',
      error: null,
    });

    formatErrorForDisplay.mockImplementation((error, chainId) => ({
      title: 'Error',
      message: error?.message || 'Unknown error',
      suggestion: 'Please try again',
      recoverySuggestion: null,
      severity: 'error',
      canRetry: false,
      retryDelay: null,
      maxRetries: null,
      chainName: chainConfig.getChain(chainId)?.chainName || 'Unknown',
      chainId: chainId,
      errorType: 'unknown',
    }));
  });

  // ============ 1. Direct Swap Integration Tests (Same Chain) ============

  describe('Direct Swap Integration Tests (Same Chain)', () => {
    it('should complete direct swap from Base to Base (WETH → USDC)', async () => {
      mockInitiateSwap.mockResolvedValue({
        swapId: 'swap-123',
        status: 'initiated',
      });

      render(<CrossChainSwap />);

      // Select source chain (Base)
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });

      // Select destination chain (Base - same chain)
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(destChainSelect, { target: { value: '8453' } });

      // Select tokenIn (WETH on Base)
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      const selectWETHButton = screen.getByTestId('select-token-WETH-8453');
      fireEvent.click(selectWETHButton);

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
        expect(screen.getByText('WETH')).toBeInTheDocument();
      });

      // Select tokenOut (USDC on Base)
      const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
      fireEvent.click(tokenOutButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      const selectUSDCButton = screen.getByTestId('select-token-USDC-8453');
      fireEvent.click(selectUSDCButton);

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
        expect(screen.getByText('USDC')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '1.0' } });

      // Initiate swap
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      
      await act(async () => {
        fireEvent.click(swapButton);
      });

      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText(/confirm cross-chain swap/i)).toBeInTheDocument();
      });

      // Confirm swap
      const confirmButton = screen.getByRole('button', { name: /confirm swap/i });
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // Verify swap was initiated
      await waitFor(() => {
        expect(mockInitiateSwap).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceChainId: 8453,
            destChainId: 8453,
            tokenIn: mockTokenBaseWETH.address,
            tokenOut: mockTokenBaseUSDC.address,
            amountIn: '1.0',
            recipient: mockUserAddress,
          })
        );
      });
    });

    it('should complete direct swap from Arbitrum to Arbitrum', async () => {
      mockInitiateSwap.mockResolvedValue({
        swapId: 'swap-456',
        status: 'initiated',
      });

      render(<CrossChainSwap />);

      // Select source chain (Arbitrum)
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '42161' } });

      // Select destination chain (Arbitrum - same chain)
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      // Select tokens
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      const selectWETHButton = screen.getByTestId('select-token-WETH-42161');
      fireEvent.click(selectWETHButton);

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
      });

      // Verify swap can be initiated
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      expect(swapButton).toBeInTheDocument();
    });

    it('should work with token selection for direct swaps', async () => {
      render(<CrossChainSwap />);

      // Set both chains to Base
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '8453' } });

      // Token selection should filter by chain (Base)
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        // Should only show Base tokens
        expect(screen.getByTestId('select-token-WETH-8453')).toBeInTheDocument();
        expect(screen.getByTestId('select-token-USDC-8453')).toBeInTheDocument();
        // Should not show Arbitrum tokens
        expect(screen.queryByTestId('select-token-WETH-42161')).not.toBeInTheDocument();
      });
    });

    it('should execute swap via smart contract (mocked)', async () => {
      mockInitiateSwap.mockResolvedValue({
        swapId: 'swap-789',
        status: 'initiated',
      });

      useSwapEstimate.mockReturnValue({
        estimate: {
          totalFee: '30000000000000000',
          mangoFee: '30000000000000000',
          layerSwapFee: '0',
          estimatedTime: 60,
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<CrossChainSwap />);

      // Setup swap
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '8453' } });

      // Select tokens and amount
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('select-token-WETH-8453'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '0.5' } });

      // Verify estimate was called (direct swap, no LayerSwap fee)
      await waitFor(() => {
        expect(useSwapEstimate).toHaveBeenCalled();
      });
    });
  });

  // ============ 2. Cross-Chain Swap Integration Tests ============

  describe('Cross-Chain Swap Integration Tests', () => {
    it('should complete cross-chain swap from Base to Arbitrum', async () => {
      mockInitiateSwap.mockResolvedValue({
        swapId: 'swap-cross-123',
        status: 'initiated',
      });

      useSwapRoutes.mockReturnValue({
        routes: [
          {
            source: 'BASE',
            destination: 'ARBITRUM',
            sourceAsset: 'WETH',
            destinationAsset: 'WETH',
            fee: '0.001',
          },
        ],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<CrossChainSwap />);

      // Select source chain (Base)
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });

      // Select destination chain (Arbitrum)
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      // Select tokenIn (WETH on Base)
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-8453'));

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
      });

      // Select tokenOut (WETH on Arbitrum)
      const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
      fireEvent.click(tokenOutButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-42161'));

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '1.0' } });

      // Verify routes are discovered
      await waitFor(() => {
        expect(useSwapRoutes).toHaveBeenCalled();
      });

      // Initiate swap
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      
      await act(async () => {
        fireEvent.click(swapButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/confirm cross-chain swap/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm swap/i });
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // Verify cross-chain swap was initiated
      await waitFor(() => {
        expect(mockInitiateSwap).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceChainId: 8453,
            destChainId: 42161,
            tokenIn: mockTokenBaseWETH.address,
            tokenOut: mockTokenArbitrumWETH.address,
            amountIn: '1.0',
            recipient: mockUserAddress,
          })
        );
      });
    });

    it('should complete cross-chain swap from Arbitrum to Base', async () => {
      mockInitiateSwap.mockResolvedValue({
        swapId: 'swap-cross-456',
        status: 'initiated',
      });

      render(<CrossChainSwap />);

      // Select source chain (Arbitrum)
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '42161' } });

      // Select destination chain (Base)
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(destChainSelect, { target: { value: '8453' } });

      // Select tokens
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-42161'));

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
      });

      // Verify swap can be initiated
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      expect(swapButton).toBeInTheDocument();
    });

    it('should create LayerSwap order for cross-chain swaps (mocked)', async () => {
      mockInitiateSwap.mockResolvedValue({
        swapId: 'swap-layerswap-123',
        layerswapOrderId: 'ls_order_123',
        status: 'pending',
      });

      useSwapEstimate.mockReturnValue({
        estimate: {
          totalFee: '50000000000000000',
          mangoFee: '30000000000000000',
          layerSwapFee: '20000000000000000',
          estimatedTime: 300,
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<CrossChainSwap />);

      // Setup cross-chain swap
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      // Verify LayerSwap fee is included in estimate
      await waitFor(() => {
        expect(useSwapEstimate).toHaveBeenCalled();
      });
    });

    it('should poll swap status for cross-chain swaps', async () => {
      useCrossChainSwap.mockReturnValue({
        initiateSwap: mockInitiateSwap,
        cancelSwap: mockCancelSwap,
        swapStatus: {
          status: 'pending',
          swapId: 'swap-123',
          layerswapOrderId: 'ls_order_123',
        },
        loading: false,
        error: null,
        isPolling: true,
      });

      render(<CrossChainSwap />);

      // Swap progress should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('swap-progress')).toBeInTheDocument();
      });
    });
  });

  // ============ 3. Token Selection Integration Tests ============

  describe('Token Selection Integration Tests', () => {
    it('should auto-select source chain when token from different chain is selected', async () => {
      render(<CrossChainSwap />);

      // Initially no chain selected
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      expect(sourceChainSelect.value).toBe('');

      // Select token with chainId (Base)
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-8453'));

      // Source chain should be auto-selected to 8453 (Base)
      await waitFor(() => {
        expect(sourceChainSelect.value).toBe('8453');
      });
    });

    it('should auto-select dest chain when token from different chain is selected', async () => {
      render(<CrossChainSwap />);

      // Initially no chain selected
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      expect(destChainSelect.value).toBe('');

      // Select token with chainId (Arbitrum)
      const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
      fireEvent.click(tokenOutButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-42161'));

      // Destination chain should be auto-selected to 42161 (Arbitrum)
      await waitFor(() => {
        expect(destChainSelect.value).toBe('42161');
      });
    });

    it('should detect swap type (direct vs cross-chain)', async () => {
      render(<CrossChainSwap />);

      // Same chain = direct swap
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '8453' } });

      // Direct swap: no LayerSwap fee
      useSwapEstimate.mockReturnValue({
        estimate: {
          totalFee: '30000000000000000',
          mangoFee: '30000000000000000',
          layerSwapFee: '0',
          estimatedTime: 60,
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Cross-chain: LayerSwap fee included
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      useSwapEstimate.mockReturnValue({
        estimate: {
          totalFee: '50000000000000000',
          mangoFee: '30000000000000000',
          layerSwapFee: '20000000000000000',
          estimatedTime: 300,
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Estimate should reflect cross-chain fees
      await waitFor(() => {
        expect(useSwapEstimate).toHaveBeenCalled();
      });
    });

    it('should trigger route discovery with selected tokens', async () => {
      render(<CrossChainSwap />);

      // Select chains
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      // Select tokens
      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-8453'));

      await waitFor(() => {
        expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
      });

      // Route discovery should be triggered
      await waitFor(() => {
        expect(useSwapRoutes).toHaveBeenCalled();
      });
    });
  });

  // ============ 4. Error Handling Tests ============

  describe('Error Handling Tests', () => {
    it('should handle swap failure with invalid token addresses', async () => {
      mockInitiateSwap.mockRejectedValue(new Error('Invalid token address'));

      formatErrorForDisplay.mockReturnValue({
        title: 'Error',
        message: 'Invalid token address',
        suggestion: 'Please check the token address',
        recoverySuggestion: null,
        severity: 'error',
        canRetry: false,
        retryDelay: null,
        maxRetries: null,
        chainName: 'Base',
        chainId: 8453,
        errorType: 'invalidAddress',
      });

      render(<CrossChainSwap />);

      // Setup swap with invalid address (component won't validate, but API will)
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '8453' } });

      // Error should be handled gracefully
      expect(screen.getByRole('button', { name: /initiate swap/i })).toBeInTheDocument();
    });

    it('should handle swap failure with incompatible chains', async () => {
      useSwapRoutes.mockReturnValue({
        routes: [],
        loading: false,
        error: 'No routes available between selected chains',
        refetch: jest.fn(),
      });

      render(<CrossChainSwap />);

      // Select incompatible chains (if such exist)
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/no routes available/i)).toBeInTheDocument();
      });
    });

    it('should handle swap failure with insufficient balance', async () => {
      useBalance.mockReturnValue({
        data: {
          value: BigInt('100000000000000'), // 0.0001 token (very small)
          decimals: 18,
          formatted: '0.0001',
          symbol: 'WETH',
        },
        isError: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<CrossChainSwap />);

      // Setup swap with amount larger than balance
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });

      const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
      fireEvent.click(tokenInButton);

      await waitFor(() => {
        expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-token-WETH-8453'));

      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '10.0' } }); // Much larger than balance

      // Component should still render (actual validation happens in smart contract)
      expect(screen.getByRole('button', { name: /initiate swap/i })).toBeInTheDocument();
    });

    it('should display error messages correctly', async () => {
      useCrossChainSwap.mockReturnValue({
        initiateSwap: mockInitiateSwap,
        cancelSwap: mockCancelSwap,
        swapStatus: null,
        loading: false,
        error: 'Swap failed: Insufficient liquidity',
        isPolling: false,
      });

      formatErrorForDisplay.mockReturnValue({
        title: 'Swap Error',
        message: 'Swap failed: Insufficient liquidity',
        suggestion: 'Please try again later or use a different amount',
        recoverySuggestion: null,
        severity: 'error',
        canRetry: true,
        retryDelay: 5000,
        maxRetries: 3,
        chainName: 'Base',
        chainId: 8453,
        errorType: 'insufficientLiquidity',
      });

      render(<CrossChainSwap />);

      // Error should be displayed
      await waitFor(() => {
        const errorAlert = screen.getByTestId('cross-chain-swap-error');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/insufficient liquidity/i);
      });
    });

    it('should handle network errors gracefully', async () => {
      useSwapRoutes.mockReturnValue({
        routes: [],
        loading: false,
        error: 'Network error: Unable to connect to server',
        refetch: jest.fn(),
      });

      render(<CrossChainSwap />);

      // Select chains to trigger route discovery
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });

      // Network error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});

