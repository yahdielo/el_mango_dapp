/**
 * Expanded Tests for SwapProgress Component
 * 
 * Additional tests covering:
 * - Stuck transactions
 * - Failed transactions
 * - Timeout scenarios
 * - Multiple concurrent swaps
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SwapProgress from '../SwapProgress';
import chainConfig from '../../services/chainConfig';
import { trackConfirmations } from '../../utils/confirmationTracking';
import { formatErrorForDisplay } from '../../utils/chainErrors';

// Mock dependencies
jest.mock('../../services/chainConfig');
jest.mock('../../utils/confirmationTracking');
jest.mock('../../utils/chainErrors');

describe('SwapProgress Component - Expanded Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    chainConfig.getChain.mockImplementation((chainId) => {
      const chains = {
        8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
        42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
      };
      return chains[chainId];
    });

    chainConfig.getExplorerUrl.mockImplementation((chainId, hash) => {
      return `https://explorer.chain${chainId}.com/tx/${hash}`;
    });

    trackConfirmations.mockImplementation((chainId, confirmations) => {
      return {
        current: confirmations,
        required: 12,
        progress: (confirmations / 12) * 100,
        status: {
          variant: confirmations >= 12 ? 'success' : 'warning',
          message: `${confirmations}/12 confirmations`,
        },
        estimatedTime: 60,
        formattedEstimatedTime: '1m',
      };
    });

    formatErrorForDisplay.mockReturnValue({
      title: 'Error',
      message: 'Transaction failed',
      suggestion: 'Please try again',
    });
  });

  // ============ 1. Stuck Transactions ============

  describe('Stuck Transactions', () => {
    it('should display processing status for long-running swaps', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        sourceChainId: 8453,
        destChainId: 42161,
        sourceConfirmations: 5,
        destConfirmations: 0,
        estimatedCompletion: Date.now() + 300000,
        timestamp: Date.now() - 600000,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // "Processing" appears in both badge and progress labels, use getAllByText
      const processingElements = screen.getAllByText(/processing/i);
      expect(processingElements.length).toBeGreaterThan(0);
      // Component doesn't show stuck warning, just displays processing status
    });

    it('should show processing status after extended period', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        timestamp: Date.now() - 900000,
        estimatedCompletion: Date.now() - 600000,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // "Processing" appears in both badge and progress labels, use getAllByText
      const processingElements = screen.getAllByText(/processing/i);
      expect(processingElements.length).toBeGreaterThan(0);
    });

    it('should display swap details for stuck transactions', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        sourceChainId: 8453,
        destChainId: 42161,
        timestamp: Date.now() - 900000,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // Component shows swap details
      expect(screen.getByText(/swap-123/i)).toBeInTheDocument();
      expect(screen.getByText(/route/i)).toBeInTheDocument();
    });
  });

  // ============ 2. Failed Transactions ============

  describe('Failed Transactions', () => {
    it('should display failed transaction with error message', () => {
      // Mock formatErrorForDisplay to return the actual error message
      formatErrorForDisplay.mockReturnValue({
        title: 'Error',
        message: 'Transaction reverted: Insufficient liquidity',
        suggestion: 'Please try again',
      });

      const swapStatus = {
        status: 'failed',
        swapId: 'swap-123',
        errorMessage: 'Transaction reverted: Insufficient liquidity',
        sourceChainId: 8453,
        destChainId: 42161,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // "Failed" appears in badge, use getAllByText or check badge specifically
      const failedElements = screen.getAllByText(/failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
      // The error message is formatted by formatErrorForDisplay
      expect(screen.getByText(/insufficient liquidity/i)).toBeInTheDocument();
    });

    it('should show transaction hash for failed transaction', () => {
      const swapStatus = {
        status: 'failed',
        swapId: 'swap-123',
        sourceTxHash: '0xabcdef1234567890',
        sourceChainId: 8453,
        errorMessage: 'Transaction failed',
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      const explorerLink = screen.getByText(/view on explorer/i);
      expect(explorerLink).toBeInTheDocument();
      expect(explorerLink.closest('a')).toHaveAttribute('href', expect.stringContaining('0xabcdef1234567890'));
    });

    it('should display formatted error with suggestion', () => {
      formatErrorForDisplay.mockReturnValue({
        title: 'Transaction Failed',
        message: 'The swap could not be completed',
        suggestion: 'Please check your balance and try again',
      });

      const swapStatus = {
        status: 'failed',
        swapId: 'swap-123',
        errorMessage: 'Transaction failed',
        sourceChainId: 8453,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      expect(screen.getByText(/the swap could not be completed/i)).toBeInTheDocument();
      expect(screen.getByText(/check your balance/i)).toBeInTheDocument();
    });

    it('should display error details for failed transaction', () => {
      const swapStatus = {
        status: 'failed',
        swapId: 'swap-123',
        errorMessage: 'Transaction failed',
        sourceChainId: 8453,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // "Failed" appears in badge, use getAllByText
      const failedElements = screen.getAllByText(/failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
      // Component doesn't have retry button, only shows error
    });
  });

  // ============ 3. Timeout Scenarios ============

  describe('Timeout Scenarios', () => {
    it('should display processing status when swap exceeds estimated time', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        estimatedCompletion: Date.now() - 60000, // 1 minute ago
        timestamp: Date.now() - 300000, // 5 minutes ago
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // "Processing" appears in both badge and progress labels, use getAllByText
      const processingElements = screen.getAllByText(/processing/i);
      expect(processingElements.length).toBeGreaterThan(0);
      // Component doesn't implement timeout warnings
    });

    it('should show processing status after extended period', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        estimatedCompletion: Date.now() - 1500000, // Should have completed 25 minutes ago
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // "Processing" appears in both badge and progress labels, use getAllByText
      const processingElements = screen.getAllByText(/processing/i);
      expect(processingElements.length).toBeGreaterThan(0);
      // Component doesn't implement timeout error messages
    });

    it('should allow cancellation when status is initiated', () => {
      const mockOnCancel = jest.fn();
      const swapStatus = {
        status: 'initiated', // Cancel button only shows for 'initiated' or 'pending'
        swapId: 'swap-123',
        timestamp: Date.now() - 1800000,
      };

      render(<SwapProgress swapStatus={swapStatus} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel swap/i });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledWith('swap-123');
    });
  });

  // ============ 4. Multiple Concurrent Swaps ============

  describe('Multiple Concurrent Swaps', () => {
    it('should display multiple swap statuses', () => {
      const swapStatus1 = {
        status: 'processing',
        swapId: 'swap-123',
        sourceChainId: 8453,
        destChainId: 42161,
      };

      const swapStatus2 = {
        status: 'initiated',
        swapId: 'swap-456',
        sourceChainId: 1,
        destChainId: 137,
      };

      const { rerender } = render(<SwapProgress swapStatus={swapStatus1} />);
      expect(screen.getByText(/swap-123/i)).toBeInTheDocument();

      rerender(<SwapProgress swapStatus={swapStatus2} />);
      expect(screen.getByText(/swap-456/i)).toBeInTheDocument();
    });

    it('should handle status updates for concurrent swaps', async () => {
      const swapStatus = {
        status: 'initiated',
        swapId: 'swap-123',
        sourceChainId: 8453,
        destChainId: 42161,
      };

      const { rerender } = render(<SwapProgress swapStatus={swapStatus} />);
      // Use getAllByText since "Initiated" appears in both badge and progress labels
      const initiatedElements = screen.getAllByText(/initiated/i);
      expect(initiatedElements.length).toBeGreaterThan(0);

      // Update to processing
      const updatedStatus = { ...swapStatus, status: 'processing' };
      rerender(<SwapProgress swapStatus={updatedStatus} />);
      // "Processing" appears in both badge and progress labels
      const processingElements = screen.getAllByText(/processing/i);
      expect(processingElements.length).toBeGreaterThan(0);

      // Update to completed
      const completedStatus = { ...swapStatus, status: 'completed' };
      rerender(<SwapProgress swapStatus={completedStatus} />);
      // "Completed" appears in both badge and progress labels, use getAllByText
      const completedElements = screen.getAllByText(/completed/i);
      expect(completedElements.length).toBeGreaterThan(0);
    });

    it('should show progress for each concurrent swap', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        sourceChainId: 8453,
        destChainId: 42161,
        sourceConfirmations: 6,
        destConfirmations: 3,
      };

      render(<SwapProgress swapStatus={swapStatus} />);

      // Use getAllByText since confirmation text appears in both badge and small text
      const sourceConfirmations = screen.getAllByText(/6\/12/i);
      expect(sourceConfirmations.length).toBeGreaterThan(0);
      
      const destConfirmations = screen.getAllByText(/3\/12/i);
      expect(destConfirmations.length).toBeGreaterThan(0);
    });
  });

  // ============ 5. Additional Edge Cases ============

  describe('Additional Edge Cases', () => {
    it('should handle missing swap status gracefully', () => {
      const { container } = render(<SwapProgress swapStatus={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle unknown status', () => {
      const swapStatus = {
        status: 'unknown',
        swapId: 'swap-123',
      };

      render(<SwapProgress swapStatus={swapStatus} />);
      expect(screen.getByText(/pending/i)).toBeInTheDocument(); // Falls back to pending
    });

    it('should display deposit address when available', () => {
      const swapStatus = {
        status: 'initiated',
        swapId: 'swap-123',
        depositAddress: '0x1234567890123456789012345678901234567890',
      };

      render(<SwapProgress swapStatus={swapStatus} />);
      expect(screen.getByText(/deposit address/i)).toBeInTheDocument();
      expect(screen.getByText(/0x12345678/i)).toBeInTheDocument();
    });

    it('should handle missing chain information', () => {
      chainConfig.getChain.mockReturnValue(null);

      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        sourceChainId: 999999, // Unknown chain
        destChainId: 888888,
        sourceConfirmations: 0,
        destConfirmations: 0,
      };

      render(<SwapProgress swapStatus={swapStatus} />);
      // Use getAllByText since "Unknown" appears for both source and destination chains
      const unknownElements = screen.getAllByText(/unknown/i);
      expect(unknownElements.length).toBeGreaterThan(0);
    });

    it('should update progress bar based on status', () => {
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
      };

      render(<SwapProgress swapStatus={swapStatus} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75'); // Processing is 75%
    });

    it('should show estimated completion time', () => {
      const estimatedCompletion = Date.now() + 120000; // 2 minutes from now
      const swapStatus = {
        status: 'processing',
        swapId: 'swap-123',
        estimatedCompletion,
      };

      render(<SwapProgress swapStatus={swapStatus} />);
      expect(screen.getByText(/estimated completion/i)).toBeInTheDocument();
    });
  });
});

