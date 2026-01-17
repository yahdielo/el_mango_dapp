/**
 * Tests for SwapProgress Component
 * 
 * Note: This is a basic test file. For comprehensive tests, see SwapProgressExpanded.test.js
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import SwapProgress from '../SwapProgress';
import chainConfig from '../../services/chainConfig';
import { trackConfirmations } from '../../utils/confirmationTracking';
import { formatErrorForDisplay } from '../../utils/chainErrors';

jest.mock('../../services/chainConfig');
jest.mock('../../utils/confirmationTracking');
jest.mock('../../utils/chainErrors');

describe('SwapProgress Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    chainConfig.getChain.mockReturnValue({
      chainName: 'Base',
    });

    chainConfig.getExplorerUrl = jest.fn((chainId, txHash) => {
      return `https://basescan.org/tx/${txHash}`;
    });

    trackConfirmations.mockReturnValue({
      current: 0,
      required: 12,
      progress: 0,
      status: {
        variant: 'warning',
        message: '0/12 confirmations',
      },
      estimatedTime: 60,
      formattedEstimatedTime: '1m',
    });

    formatErrorForDisplay.mockReturnValue({
      title: 'Error',
      message: 'Transaction failed',
      suggestion: 'Please try again',
    });
  });

  test('should render pending state', () => {
    render(<SwapProgress swapStatus={{ status: 'pending', swapId: 'swap-123' }} />);
    // "Pending" appears in badge
    const pendingElements = screen.getAllByText(/pending/i);
    expect(pendingElements.length).toBeGreaterThan(0);
  });

  test('should render completed state', () => {
    render(<SwapProgress swapStatus={{ status: 'completed', swapId: 'swap-123' }} />);
    // "Completed" appears in badge and success message
    const completedElements = screen.getAllByText(/completed/i);
    expect(completedElements.length).toBeGreaterThan(0);
  });

  test('should render failed state', () => {
    render(<SwapProgress swapStatus={{ 
      status: 'failed', 
      swapId: 'swap-123',
      errorMessage: 'Transaction failed',
      sourceChainId: 8453,
    }} />);
    // "Failed" appears in badge
    const failedElements = screen.getAllByText(/failed/i);
    expect(failedElements.length).toBeGreaterThan(0);
  });

  test('should display swap details', () => {
    render(<SwapProgress swapStatus={{ 
      status: 'processing', 
      swapId: 'swap-123',
      sourceChainId: 8453,
      destChainId: 42161,
    }} />);
    expect(screen.getByText(/swap-123/i)).toBeInTheDocument();
  });

  test('should display transaction hash when available', () => {
    const txHash = '0x1234567890abcdef';
    render(<SwapProgress swapStatus={{ 
      status: 'completed', 
      swapId: 'swap-123',
      sourceTxHash: txHash,
      sourceChainId: 8453,
    }} />);
    // Transaction hash appears in explorer link
    const link = screen.getByText(/view on explorer/i);
    expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining(txHash));
  });
});

