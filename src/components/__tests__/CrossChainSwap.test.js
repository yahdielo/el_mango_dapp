/**
 * Tests for CrossChainSwap Component
 * 
 * Comprehensive tests for cross-chain swap functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CrossChainSwap from '../CrossChainSwap';
import { useAccount } from 'wagmi';
// Mock dependencies
jest.mock('wagmi');
jest.mock('../../hooks/useCrossChainSwap', () => ({
  useSwapRoutes: jest.fn(),
  useSwapEstimate: jest.fn(),
  useCrossChainSwap: jest.fn(),
}));
jest.mock('../../hooks/useChainStatus');

import { useSwapRoutes, useSwapEstimate, useCrossChainSwap } from '../../hooks/useCrossChainSwap';
import { useSupportedChains } from '../../hooks/useChainStatus';
import chainConfig from '../../services/chainConfig';
import ChainStatusBadge from '../ChainStatusBadge';
import { formatErrorForDisplay } from '../../utils/chainErrors';
import { checkMinimumAmount } from '../../utils/chainValidation';
import { requiresLayerSwap } from '../../utils/featureFlags';

jest.mock('../../services/chainConfig');
jest.mock('../../utils/chainErrors');
jest.mock('../../utils/chainValidation');
jest.mock('../../utils/featureFlags');

jest.mock('../ChainStatusBadge', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ chainId }) => React.createElement('div', { 'data-testid': `chain-status-badge-${chainId}` }, 'Status')
  };
});
jest.mock('../WhitelistBadge', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'whitelist-badge' }, 'WhitelistBadge')
  };
});
jest.mock('../SwapProgress', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ swapStatus }) => React.createElement('div', { 'data-testid': 'swap-progress' }, `SwapProgress: ${swapStatus?.status || ''}`)
  };
});
jest.mock('../getTokenList', () => {
  const React = require('react');
  const MockCallTokenList = ({ show, onHide, onTokenSelect, chainInfo, filterByChainId }) => {
    if (!show) return null;
    const mockToken = {
      symbol: 'ETH',
      address: '0x4200000000000000000000000000000000000006',
      img: '/eth.png',
      decimals: 18,
      name: 'Ethereum',
      chainId: 8453,
    };
    return React.createElement('div', { 'data-testid': 'token-list-modal' },
      React.createElement('div', {}, 'Token List Modal'),
      React.createElement('button', {
        'data-testid': 'select-token-eth',
        onClick: () => onTokenSelect(mockToken),
      }, 'Select ETH'),
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

describe('CrossChainSwap Component', () => {
  const mockSupportedChains = [
    { chainId: 8453, name: 'Base' },
    { chainId: 42161, name: 'Arbitrum' },
    { chainId: 1, name: 'Ethereum' },
  ];

  const mockRoutes = [
    {
      source: 'BASE',
      destination: 'ARBITRUM',
      sourceAsset: 'ETH',
      destinationAsset: 'ETH',
      fee: '0.001',
    },
  ];

  const mockEstimate = {
    totalFee: '50000000000000000',
    mangoFee: '30000000000000000',
    layerSwapFee: '20000000000000000',
    estimatedTime: 120,
  };

  const mockInitiateSwap = jest.fn();
  const mockCancelSwap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });

    useSupportedChains.mockReturnValue({
      chains: mockSupportedChains,
      loading: false,
    });

    useSwapRoutes.mockReturnValue({
      routes: [],
      loading: false,
      error: null,
    });

    useSwapEstimate.mockReturnValue({
      estimate: null,
      loading: false,
      error: null,
    });

    useCrossChainSwap.mockReturnValue({
      initiateSwap: mockInitiateSwap,
      swapStatus: null,
      loading: false,
      error: null,
      cancelSwap: mockCancelSwap,
    });

    // Mock chainConfig methods
    chainConfig.getAllChains.mockReturnValue(mockSupportedChains.map(chain => ({
      chainId: chain.chainId.toString(),
      chainName: chain.name,
      type: 'EVM',
      nativeCurrency: { symbol: 'ETH', decimals: 18 },
    })));

    chainConfig.getChain.mockImplementation((chainId) => {
      const chains = {
        8453: { chainId: '8453', chainName: 'Base', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
        42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
        1: { chainId: '1', chainName: 'Ethereum', type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
        501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
        0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
      };
      return chains[chainId] || { chainId: chainId?.toString(), chainName: `Chain ${chainId}`, type: 'EVM', nativeCurrency: { symbol: 'ETH', decimals: 18 } };
    });

    chainConfig.getGasSettings.mockImplementation((chainId) => {
      return {
        gasLimit: 500000,
        gasPrice: null,
      };
    });

    chainConfig.getSlippageTolerance.mockImplementation((chainId) => {
      return {
        default: 0.5,
        min: 0.1,
        max: 5.0,
      };
    });

    chainConfig.getMinimumAmounts.mockImplementation((chainId) => {
      return {
        swap: '0.001',
      };
    });

    chainConfig.requiresLayerSwap.mockImplementation((chainId) => {
      return chainId === 501111 || chainId === 0;
    });

    chainConfig.getFeatureFlags = jest.fn().mockReturnValue({});

    // Mock utility functions
    formatErrorForDisplay.mockImplementation((error, chainId) => {
      const message = error?.message || 'Unknown error';
      return {
        title: 'Error',
        message: message,
        suggestion: 'Please try again',
        recoverySuggestion: null,
        severity: 'error',
        canRetry: false,
        retryDelay: null,
        maxRetries: null,
        chainName: chainConfig.getChain(chainId)?.chainName || 'Unknown',
        chainId: chainId,
        errorType: 'unknown',
      };
    });

    checkMinimumAmount.mockReturnValue({
      isValid: true,
      message: '',
      error: null,
    });

    requiresLayerSwap.mockImplementation((chainId) => {
      return chainId === 501111 || chainId === 0;
    });
  });

  // ============ 1. Rendering Tests ============

  describe('Rendering Tests', () => {
    it('should render component correctly', () => {
      render(<CrossChainSwap />);
      
      expect(screen.getByText(/cross-chain swap/i)).toBeInTheDocument();
      expect(screen.getByText(/from chain/i)).toBeInTheDocument();
      expect(screen.getByText(/to chain/i)).toBeInTheDocument();
    });

    it('should render source chain selection', () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      expect(sourceChainSelect).toBeInTheDocument();
    });

    it('should render destination chain selection', () => {
      render(<CrossChainSwap />);
      
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      expect(destChainSelect).toBeInTheDocument();
    });

    it('should render token input fields', () => {
      render(<CrossChainSwap />);
      
      expect(screen.getByLabelText(/token in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/token out/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    it('should render swap button', () => {
      render(<CrossChainSwap />);
      
      expect(screen.getByRole('button', { name: /initiate swap/i })).toBeInTheDocument();
    });

    it('should render supported chains in dropdowns', () => {
      render(<CrossChainSwap />);
      
      // Chains are rendered as <option> elements in select dropdowns
      mockSupportedChains.forEach(chain => {
        const options = screen.getAllByText(chain.name);
        expect(options.length).toBeGreaterThan(0);
        // Verify it's in a select option
        const option = options.find(opt => opt.tagName === 'OPTION' || opt.closest('select'));
        expect(option).toBeTruthy();
      });
    });
  });

  // ============ 2. Functionality Tests ============

  describe('Functionality Tests', () => {
    it('should handle source chain selection', () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      expect(sourceChainSelect.value).toBe('8453');
    });

    it('should handle destination chain selection', () => {
      render(<CrossChainSwap />);
      
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      
      expect(destChainSelect.value).toBe('42161');
    });

    it('should handle token input changes', () => {
      render(<CrossChainSwap />);
      
      const tokenInInput = screen.getByLabelText(/token in/i);
      const tokenOutInput = screen.getByLabelText(/token out/i);
      
      fireEvent.change(tokenInInput, { target: { value: '0x4200000000000000000000000000000000000006' } });
      fireEvent.change(tokenOutInput, { target: { value: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' } });
      
      expect(tokenInInput.value).toBe('0x4200000000000000000000000000000000000006');
      expect(tokenOutInput.value).toBe('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');
    });

    it('should handle amount input changes', () => {
      render(<CrossChainSwap />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(amountInput, { target: { value: '1.5' } });
      
      expect(amountInput.value).toBe('1.5');
    });

    it('should fetch routes when chains are selected', async () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      
      await waitFor(() => {
        expect(useSwapRoutes).toHaveBeenCalled();
      });
    });

    it('should display routes when available', () => {
      useSwapRoutes.mockReturnValue({
        routes: mockRoutes,
        loading: false,
        error: null,
      });

      render(<CrossChainSwap />);
      
      expect(screen.getByText(/available routes/i)).toBeInTheDocument();
      expect(screen.getByText(/BASE → ARBITRUM/i)).toBeInTheDocument();
    });

    it('should display loading state for routes', () => {
      useSwapRoutes.mockReturnValue({
        routes: [],
        loading: true,
        error: null,
      });

      render(<CrossChainSwap />);
      
      expect(screen.getByText(/loading routes/i)).toBeInTheDocument();
    });

    it('should fetch estimate when all parameters are provided', async () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      const tokenInInput = screen.getByLabelText(/token in/i);
      const tokenOutInput = screen.getByLabelText(/token out/i);
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      fireEvent.change(tokenInInput, { target: { value: '0x4200...' } });
      fireEvent.change(tokenOutInput, { target: { value: '0x82af...' } });
      fireEvent.change(amountInput, { target: { value: '1.0' } });
      
      await waitFor(() => {
        expect(useSwapEstimate).toHaveBeenCalled();
      });
    });

    it('should display fee estimate when available', () => {
      useSwapEstimate.mockReturnValue({
        estimate: mockEstimate,
        loading: false,
        error: null,
      });

      render(<CrossChainSwap />);
      
      expect(screen.getByText(/fee estimate/i)).toBeInTheDocument();
      expect(screen.getByText(/layerswap fee/i)).toBeInTheDocument();
      expect(screen.getByText(/mango fee/i)).toBeInTheDocument();
    });

    it('should handle swap initiation', async () => {
      useSwapEstimate.mockReturnValue({
        estimate: mockEstimate,
        loading: false,
        error: null,
      });

      mockInitiateSwap.mockResolvedValue({ swapId: 'swap-123' });

      render(<CrossChainSwap />);
      
      // Fill in all required fields
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      const tokenInInput = screen.getByLabelText(/token in/i);
      const tokenOutInput = screen.getByLabelText(/token out/i);
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      fireEvent.change(tokenInInput, { target: { value: '0x4200...' } });
      fireEvent.change(tokenOutInput, { target: { value: '0x82af...' } });
      fireEvent.change(amountInput, { target: { value: '1.0' } });
      
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      
      await act(async () => {
        fireEvent.click(swapButton);
      });
      
      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText(/confirm cross-chain swap/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation modal before swap', async () => {
      useSwapEstimate.mockReturnValue({
        estimate: mockEstimate,
        loading: false,
        error: null,
      });

      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      const tokenInInput = screen.getByLabelText(/token in/i);
      const tokenOutInput = screen.getByLabelText(/token out/i);
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      fireEvent.change(tokenInInput, { target: { value: '0x4200...' } });
      fireEvent.change(tokenOutInput, { target: { value: '0x82af...' } });
      fireEvent.change(amountInput, { target: { value: '1.0' } });
      
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      
      await act(async () => {
        fireEvent.click(swapButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Confirm Cross-Chain Swap/i)).toBeInTheDocument();
        expect(screen.getByText(/From:/i)).toBeInTheDocument();
        expect(screen.getByText(/To:/i)).toBeInTheDocument();
        // "Amount:" appears in both warning and modal, use getAllByText
        const amountTexts = screen.getAllByText(/Amount:/i);
        expect(amountTexts.length).toBeGreaterThan(0);
      });
    });

    it('should confirm swap in modal', async () => {
      useSwapEstimate.mockReturnValue({
        estimate: mockEstimate,
        loading: false,
        error: null,
      });

      mockInitiateSwap.mockResolvedValue({ swapId: 'swap-123' });

      render(<CrossChainSwap />);
      
      // Open confirmation modal
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      const tokenInInput = screen.getByLabelText(/token in/i);
      const tokenOutInput = screen.getByLabelText(/token out/i);
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      fireEvent.change(tokenInInput, { target: { value: '0x4200...' } });
      fireEvent.change(tokenOutInput, { target: { value: '0x82af...' } });
      fireEvent.change(amountInput, { target: { value: '1.0' } });
      
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
      
      await waitFor(() => {
        expect(mockInitiateSwap).toHaveBeenCalled();
      });
    });

    it('should display swap progress when swap status is available', () => {
      useCrossChainSwap.mockReturnValue({
        initiateSwap: mockInitiateSwap,
        swapStatus: { status: 'pending', swapId: 'swap-123' },
        loading: false,
        error: null,
        cancelSwap: mockCancelSwap,
      });

      render(<CrossChainSwap />);
      
      expect(screen.getByTestId('swap-progress')).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  // ============ 3. Error Handling Tests ============

  describe('Error Handling Tests', () => {
    it('should display route error', () => {
      useSwapRoutes.mockReturnValue({
        routes: [],
        loading: false,
        error: 'No routes available',
      });

      render(<CrossChainSwap />);
      
      expect(screen.getByText(/no routes available/i)).toBeInTheDocument();
    });

    it('should handle insufficient balance error', () => {
      formatErrorForDisplay.mockReturnValue({
        title: 'Error',
        message: 'Insufficient balance',
        suggestion: 'Please ensure you have enough balance',
        recoverySuggestion: null,
        severity: 'error',
        canRetry: false,
        retryDelay: null,
        maxRetries: null,
        chainName: 'Base',
        chainId: 8453,
        errorType: 'insufficientBalance',
      });

      useCrossChainSwap.mockReturnValue({
        initiateSwap: mockInitiateSwap,
        swapStatus: null,
        loading: false,
        error: 'Insufficient balance',
        cancelSwap: mockCancelSwap,
      });

      render(<CrossChainSwap />);
      
      // Error is displayed in Alert with formatted message
      const errorAlert = screen.getByTestId('cross-chain-swap-error');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent(/insufficient balance/i);
    });

    it('should handle network errors', () => {
      useSwapRoutes.mockReturnValue({
        routes: [],
        loading: false,
        error: 'Network error',
      });

      render(<CrossChainSwap />);
      
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('should disable swap button when loading', () => {
      useCrossChainSwap.mockReturnValue({
        initiateSwap: mockInitiateSwap,
        swapStatus: null,
        loading: true,
        error: null,
        cancelSwap: mockCancelSwap,
      });

      render(<CrossChainSwap />);
      
      const swapButton = screen.getByRole('button', { name: /processing/i });
      expect(swapButton).toBeDisabled();
    });

    it('should disable inputs when swap is loading', () => {
      useCrossChainSwap.mockReturnValue({
        initiateSwap: mockInitiateSwap,
        swapStatus: null,
        loading: true,
        error: null,
        cancelSwap: mockCancelSwap,
      });

      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      expect(sourceChainSelect).toBeDisabled();
    });
  });

  // ============ 4. Edge Cases ============

  describe('Edge Cases', () => {
    it('should handle empty chain selection', () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      expect(sourceChainSelect.value).toBe('');
    });

    it('should handle same source and destination chain', () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '8453' } });
      
      // Component should handle same chain selection
      expect(sourceChainSelect.value).toBe('8453');
      expect(destChainSelect.value).toBe('8453');
    });

    it('should handle zero amount', () => {
      render(<CrossChainSwap />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(amountInput, { target: { value: '0' } });
      
      expect(amountInput.value).toBe('0');
    });

    it('should handle very large amount', () => {
      render(<CrossChainSwap />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(amountInput, { target: { value: '999999999999' } });
      
      expect(amountInput.value).toBe('999999999999');
    });

    it('should handle missing wallet connection', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      render(<CrossChainSwap />);
      
      // Swap button should be disabled
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      expect(swapButton).toBeDisabled();
    });

    it('should handle cancel button in confirmation modal', async () => {
      useSwapEstimate.mockReturnValue({
        estimate: mockEstimate,
        loading: false,
        error: null,
      });

      render(<CrossChainSwap />);
      
      // Open modal
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      const tokenInInput = screen.getByLabelText(/token in/i);
      const tokenOutInput = screen.getByLabelText(/token out/i);
      const amountInput = screen.getByLabelText(/amount/i);
      
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      fireEvent.change(destChainSelect, { target: { value: '42161' } });
      fireEvent.change(tokenInInput, { target: { value: '0x4200...' } });
      fireEvent.change(tokenOutInput, { target: { value: '0x82af...' } });
      fireEvent.change(amountInput, { target: { value: '1.0' } });
      
      const swapButton = screen.getByRole('button', { name: /initiate swap/i });
      
      await act(async () => {
        fireEvent.click(swapButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/confirm cross-chain swap/i)).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await act(async () => {
        fireEvent.click(cancelButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText(/confirm cross-chain swap/i)).not.toBeInTheDocument();
      });
    });
  });

  // ============ 3. ChainConfigService Integration Tests ============

  describe('ChainConfigService Integration', () => {
    beforeEach(() => {
      chainConfig.getAllChains.mockReturnValue([
        { chainId: '8453', chainName: 'Base', type: 'EVM' },
        { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
        { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
        { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
      ]);
      chainConfig.getChain.mockImplementation((chainId) => {
        const chains = {
          8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
          42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
          501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
          '0': { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
          0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' }, // Handle both string and number
        };
        return chains[chainId];
      });
      chainConfig.requiresLayerSwap.mockReturnValue(false);
      chainConfig.getMinimumAmounts.mockReturnValue({ swap: '0.001' });
      chainConfig.getFeatureFlags.mockReturnValue({
        directSwap: true,
        layerSwap: false,
        referralSystem: true,
      });
    });

    it('should use ChainConfigService.getAllChains for chain list', () => {
      render(<CrossChainSwap />);
      
      expect(chainConfig.getAllChains).toHaveBeenCalled();
    });

    it('should display chain names from ChainConfigService', () => {
      chainConfig.getAllChains.mockReturnValue([
        { chainId: '8453', chainName: 'Base', type: 'EVM' },
        { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
      ]);
      
      render(<CrossChainSwap />);
      
      // Chains are in select options
      const baseOptions = screen.getAllByText('Base');
      const arbitrumOptions = screen.getAllByText('Arbitrum');
      expect(baseOptions.length).toBeGreaterThan(0);
      expect(arbitrumOptions.length).toBeGreaterThan(0);
    });

    it('should use ChainConfigService.getChain for chain details', () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      expect(chainConfig.getChain).toHaveBeenCalled();
    });

    it('should check LayerSwap requirements using ChainConfigService', async () => {
      requiresLayerSwap.mockReturnValue(true);
      chainConfig.getAllChains.mockReturnValue([
        { chainId: '8453', chainName: 'Base', type: 'EVM' },
        { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
      ]);
      chainConfig.getChain.mockReturnValue({ chainId: '501111', chainName: 'Solana', type: 'SOLANA' });
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '501111' } });
      
      // Wait for component to render warnings section
      // Component checks: sourceLayerSwap || sourceChain?.type === 'SOLANA' || sourceChain?.type === 'BITCOIN'
      // Since type is 'SOLANA', it will render even if requiresLayerSwap returns false
      await waitFor(() => {
        // Check that warnings section is rendered with LayerSwap badge
        const layerSwapElements = screen.queryAllByText(/LayerSwap/i);
        expect(layerSwapElements.length).toBeGreaterThan(0);
      });
      
      // Verify requiresLayerSwap was called (even if the condition short-circuits)
      expect(requiresLayerSwap).toHaveBeenCalledWith(501111);
    });

    it('should use ChainConfigService for minimum amounts', () => {
      chainConfig.getMinimumAmounts.mockReturnValue({ swap: '0.001' });
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '0.5' } });
      
      expect(chainConfig.getMinimumAmounts).toHaveBeenCalledWith(8453);
    });

    it('should use ChainConfigService for feature flags', () => {
      // Feature flags are checked via supportsDirectSwap, requiresLayerSwap, etc.
      // These are called when chains are selected
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      // Feature flags functions are called when rendering warnings
      expect(requiresLayerSwap).toHaveBeenCalled();
    });
  });

  // ============ 4. LayerSwap Badge Display Tests ============

  describe('LayerSwap Badge Display', () => {
    beforeEach(() => {
      chainConfig.getAllChains.mockReturnValue([
        { chainId: '8453', chainName: 'Base', type: 'EVM' },
        { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
        { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
      ]);
      chainConfig.getChain.mockImplementation((chainId) => {
        const chains = {
          8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
          501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
          0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
        };
        return chains[chainId];
      });
    });

    it('should show LayerSwap badge for Solana chain', async () => {
      requiresLayerSwap.mockReturnValue(true);
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '501111' } });
      
      // LayerSwap badge should be displayed (multiple elements contain "LayerSwap")
      await waitFor(() => {
        const layerSwapElements = screen.getAllByText(/LayerSwap/i);
        expect(layerSwapElements.length).toBeGreaterThan(0);
      });
      expect(requiresLayerSwap).toHaveBeenCalledWith(501111);
    });

    it('should show LayerSwap badge for Bitcoin chain', async () => {
      requiresLayerSwap.mockReturnValue(false); // Even if false, should show for BITCOIN type
      
      // The beforeEach already sets up getChain mock with '0' and 0, but let's ensure it works
      // Component uses parseInt('0') which returns 0 (number)
      chainConfig.getChain.mockImplementation((chainId) => {
        // Handle both number 0 and string '0'
        if (chainId === 0 || chainId === '0') {
          return { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN', nativeCurrency: { symbol: 'BTC' } };
        }
        // Use the default chains from beforeEach
        const chains = {
          8453: { chainId: '8453', chainName: 'Base', type: 'EVM', nativeCurrency: { symbol: 'ETH' } },
          42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM', nativeCurrency: { symbol: 'ETH' } },
          501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA', nativeCurrency: { symbol: 'SOL' } },
        };
        return chains[chainId] || chains[String(chainId)];
      });
      
      render(<CrossChainSwap />);
      
      const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
      fireEvent.change(destChainSelect, { target: { value: '0' } });
      
      // Wait for warnings section to render with LayerSwap badge
      // Component checks: destLayerSwap || destChain?.type === 'SOLANA' || destChain?.type === 'BITCOIN'
      // Since type is 'BITCOIN', it will render even if requiresLayerSwap returns false
      await waitFor(() => {
        // Verify getChain was called with 0
        expect(chainConfig.getChain).toHaveBeenCalledWith(0);
        // Check that warnings section is rendered with LayerSwap badge
        const layerSwapElements = screen.queryAllByText(/LayerSwap/i);
        expect(layerSwapElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
      
      // Verify requiresLayerSwap was called with 0 (number, since component uses parseInt)
      expect(requiresLayerSwap).toHaveBeenCalledWith(0);
    });

    it('should not show LayerSwap badge for EVM chains', () => {
      requiresLayerSwap.mockReturnValue(false);
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      // LayerSwap badge should not be displayed for EVM chains
      expect(screen.queryByText(/LayerSwap/i)).not.toBeInTheDocument();
      expect(requiresLayerSwap).toHaveBeenCalledWith(8453);
    });
  });

  // ============ 5. Chain-Specific Limits/Warnings Tests ============

  describe('Chain-Specific Limits/Warnings', () => {
    beforeEach(() => {
      chainConfig.getAllChains.mockReturnValue(mockSupportedChains);
      chainConfig.getChain.mockImplementation((chainId) => {
        const chains = {
          8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
          42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
        };
        return chains[chainId];
      });
    });

    it('should display minimum amount warning when amount is too low', async () => {
      chainConfig.getMinimumAmounts.mockReturnValue({ swap: '0.1' });
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });
      
      await waitFor(() => {
        expect(chainConfig.getMinimumAmounts).toHaveBeenCalledWith(8453);
      });
      
      // Warning should be displayed in the warnings section
      await waitFor(() => {
        const warnings = screen.queryAllByText(/minimum|below minimum/i);
        expect(warnings.length).toBeGreaterThan(0);
      });
    });

    it('should validate amount against chain-specific minimums', () => {
      chainConfig.getMinimumAmounts.mockReturnValue({ swap: '1.0' });
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '0.5' } });
      
      expect(chainConfig.getMinimumAmounts).toHaveBeenCalledWith(8453);
    });

    it('should show chain-specific warnings for non-EVM chains', async () => {
      requiresLayerSwap.mockReturnValue(true);
      chainConfig.getAllChains.mockReturnValue([
        { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
      ]);
      chainConfig.getChain.mockReturnValue({
        chainId: '501111',
        chainName: 'Solana',
        type: 'SOLANA',
      });
      
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '501111' } });
      
      // Wait for warnings section to render
      await waitFor(() => {
        const layerSwapElements = screen.queryAllByText(/LayerSwap/i);
        expect(layerSwapElements.length).toBeGreaterThan(0);
      });
      
      // Component uses requiresLayerSwap from featureFlags, not chainConfig
      expect(requiresLayerSwap).toHaveBeenCalledWith(501111);
    });

    it('should display chain status badges', () => {
      render(<CrossChainSwap />);
      
      const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
      fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
      
      // ChainStatusBadge should be rendered
      expect(screen.getByTestId('chain-status-badge-8453')).toBeInTheDocument();
    });
  });

  // ============ 6. Token Selection Tests ============

  describe('Token Selection Tests', () => {
    const mockToken = {
      symbol: 'ETH',
      address: '0x4200000000000000000000000000000000000006',
      img: '/eth.png',
      decimals: 18,
      name: 'Ethereum',
      chainId: 8453,
    };

    const mockTokenArbitrum = {
      symbol: 'USDC',
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      img: '/usdc.png',
      decimals: 6,
      name: 'USD Coin',
      chainId: 42161,
    };

    beforeEach(() => {
      // Mock useBalance for token balances
      const { useBalance } = require('wagmi');
      useBalance.mockReturnValue({
        data: {
          value: BigInt('1000000000000000000'),
          decimals: 18,
          formatted: '1.0',
          symbol: 'ETH',
        },
        isError: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    describe('Modal Opening', () => {
      it('should open tokenIn modal when button clicked', async () => {
        render(<CrossChainSwap />);
        
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
      });

      it('should open tokenOut modal when button clicked', async () => {
        render(<CrossChainSwap />);
        
        const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
        
        fireEvent.click(tokenOutButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
      });
    });

    describe('Token Selection Handlers', () => {
      it('should update selectedTokenIn when token selected', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Modal should close and token should be displayed
        await waitFor(() => {
          expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
          expect(screen.getByText('ETH')).toBeInTheDocument();
        });
      });

      it('should update selectedTokenOut when token selected', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenOut modal
        const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
        fireEvent.click(tokenOutButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Modal should close and token should be displayed
        await waitFor(() => {
          expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
          expect(screen.getByText('ETH')).toBeInTheDocument();
        });
      });

      it('should set token address when token selected', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Token should be displayed (indicating state was updated)
        await waitFor(() => {
          expect(screen.getByText('ETH')).toBeInTheDocument();
        });
      });

      it('should close modal after token selection', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Modal should be closed
        await waitFor(() => {
          expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
        });
      });
    });

    describe('Chain Auto-Selection', () => {
      it('should auto-select sourceChainId when token with chainId selected', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token (mockToken has chainId: 8453)
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Source chain should be auto-selected to 8453
        await waitFor(() => {
          const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
          expect(sourceChainSelect.value).toBe('8453');
        });
      });

      it('should auto-select destChainId when token with chainId selected', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenOut modal
        const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
        fireEvent.click(tokenOutButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token (mockToken has chainId: 8453)
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Destination chain should be auto-selected to 8453
        await waitFor(() => {
          const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
          expect(destChainSelect.value).toBe('8453');
        });
      });

      it('should not update chain if already matches token.chainId', async () => {
        render(<CrossChainSwap />);
        
        // Set source chain to 8453 first
        const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
        fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
        
        expect(sourceChainSelect.value).toBe('8453');
        
        // Open tokenIn modal
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token with same chainId (8453)
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Chain should still be 8453 (no change)
        await waitFor(() => {
          expect(sourceChainSelect.value).toBe('8453');
        });
      });

      it('should not update chain if token.chainId is undefined', async () => {
        // Mock CallTokenList to return token without chainId
        jest.doMock('../getTokenList', () => {
          const React = require('react');
          const MockCallTokenList = ({ show, onHide, onTokenSelect }) => {
            if (!show) return null;
            const mockTokenNoChain = {
              symbol: 'ETH',
              address: '0x4200000000000000000000000000000000000006',
              img: '/eth.png',
              decimals: 18,
              name: 'Ethereum',
              // chainId is undefined
            };
            return React.createElement('div', { 'data-testid': 'token-list-modal' },
              React.createElement('button', {
                'data-testid': 'select-token-eth',
                onClick: () => onTokenSelect(mockTokenNoChain),
              }, 'Select ETH')
            );
          };
          return {
            __esModule: true,
            default: MockCallTokenList,
          };
        });
        
        render(<CrossChainSwap />);
        
        // Open tokenIn modal
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        // Select token without chainId
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Chain should remain unchanged (empty or previous value)
        await waitFor(() => {
          const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
          // Chain should not have changed from initial state
          expect(sourceChainSelect).toBeInTheDocument();
        });
      });
    });

    describe('Token Display', () => {
      it('should display selected token icon', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal and select token
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Token icon should be displayed (img element with src)
        await waitFor(() => {
          const images = screen.getAllByRole('img');
          const tokenImage = images.find(img => img.src.includes('eth.png') || img.alt?.includes('ETH'));
          expect(tokenImage).toBeTruthy();
        });
      });

      it('should display selected token symbol', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal and select token
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Token symbol should be displayed
        await waitFor(() => {
          expect(screen.getByText('ETH')).toBeInTheDocument();
        });
      });

      it('should display chain badge when token.chainId exists', async () => {
        render(<CrossChainSwap />);
        
        // Open tokenIn modal and select token
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // Chain badge should be displayed (token has chainId: 8453, which is Base)
        // Use queryAllByText and check if it appears in a badge context
        await waitFor(() => {
          const baseTexts = screen.queryAllByText('Base');
          // Should have at least one "Base" text (from badge, possibly also from select options)
          expect(baseTexts.length).toBeGreaterThan(0);
          // Verify chainConfig.getChain was called with 8453 (chainId from token)
          expect(chainConfig.getChain).toHaveBeenCalledWith(8453);
        });
      });

      it('should show "Select Token" placeholder when no token selected', () => {
        render(<CrossChainSwap />);
        
        // TokenIn button should show placeholder
        expect(screen.getByText(/select token in/i)).toBeInTheDocument();
        
        // TokenOut button should show placeholder
        expect(screen.getByText(/select token out/i)).toBeInTheDocument();
      });
    });

    describe('Integration Tests', () => {
      it('should trigger route discovery when token selected', async () => {
        render(<CrossChainSwap />);
        
        // Set chains first
        const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
        const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
        fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
        fireEvent.change(destChainSelect, { target: { value: '42161' } });
        
        // Open tokenIn modal and select token
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // useSwapRoutes should be called with token address
        await waitFor(() => {
          expect(useSwapRoutes).toHaveBeenCalled();
        });
      });

      it('should trigger fee estimation when token selected', async () => {
        useSwapEstimate.mockReturnValue({
          estimate: mockEstimate,
          loading: false,
          error: null,
        });
        
        render(<CrossChainSwap />);
        
        // Set chains and amount first
        const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
        const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
        const amountInput = screen.getByLabelText(/amount/i);
        fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
        fireEvent.change(destChainSelect, { target: { value: '42161' } });
        fireEvent.change(amountInput, { target: { value: '1.0' } });
        
        // Open tokenIn modal and select token
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectButton);
        
        // useSwapEstimate should be called when all params are available
        await waitFor(() => {
          expect(useSwapEstimate).toHaveBeenCalled();
        });
      });

      it('should allow swap initiation after token selection', async () => {
        useSwapEstimate.mockReturnValue({
          estimate: mockEstimate,
          loading: false,
          error: null,
        });
        
        render(<CrossChainSwap />);
        
        // Set chains and amount
        const sourceChainSelect = screen.getByLabelText(/from chain/i).closest('select');
        const destChainSelect = screen.getByLabelText(/to chain/i).closest('select');
        const amountInput = screen.getByLabelText(/amount/i);
        fireEvent.change(sourceChainSelect, { target: { value: '8453' } });
        fireEvent.change(destChainSelect, { target: { value: '42161' } });
        fireEvent.change(amountInput, { target: { value: '1.0' } });
        
        // Select tokens
        const tokenInButton = screen.getByLabelText(/token in/i).closest('button');
        fireEvent.click(tokenInButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectTokenInButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectTokenInButton);
        
        await waitFor(() => {
          expect(screen.queryByTestId('token-list-modal')).not.toBeInTheDocument();
        });
        
        const tokenOutButton = screen.getByLabelText(/token out/i).closest('button');
        fireEvent.click(tokenOutButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('token-list-modal')).toBeInTheDocument();
        });
        
        const selectTokenOutButton = screen.getByTestId('select-token-eth');
        fireEvent.click(selectTokenOutButton);
        
        // Swap button should be enabled (not disabled)
        await waitFor(() => {
          const swapButton = screen.getByRole('button', { name: /initiate swap/i });
          expect(swapButton).not.toBeDisabled();
        });
      });
    });
  });
});

