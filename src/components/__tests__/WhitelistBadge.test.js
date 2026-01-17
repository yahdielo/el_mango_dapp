/**
 * Tests for WhitelistBadge Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WhitelistBadge from '../WhitelistBadge';
import { useWhitelist } from '../../hooks/useWhitelist';
import { useAccount, useChainId } from 'wagmi';
import { supportsWhitelist } from '../../utils/featureFlags';
import chainConfig from '../../services/chainConfig';

jest.mock('../../hooks/useWhitelist');
// Don't mock wagmi here - use global mock from setupTests.js
jest.mock('../../utils/featureFlags', () => ({
  supportsWhitelist: jest.fn(),
  getFeatureMessage: jest.fn(),
  FEATURE_FLAGS: {},
}));
jest.mock('../../services/chainConfig');

describe('WhitelistBadge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks for wagmi hooks
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    useChainId.mockReturnValue(8453); // Return number, not object
    
    // Mock whitelist support
    supportsWhitelist.mockReturnValue(true);
  });

  test('should render loading state', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: null,
      loading: true,
      error: null,
    });

    render(<WhitelistBadge />);

    // Should not crash, badge should handle loading state
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  test('should render None tier badge', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: {
        address: '0x1234...',
        isWhitelisted: false,
        tier: 'None',
        tierLevel: 0,
      },
      loading: false,
      error: null,
    });

    render(<WhitelistBadge />);

    expect(screen.queryByText(/none/i)).not.toBeInTheDocument(); // None tier might not show badge
  });

  test('should render Standard tier badge', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: {
        address: '0x1234...',
        isWhitelisted: true,
        tier: 'Standard',
        tierLevel: 1,
      },
      loading: false,
      error: null,
    });

    render(<WhitelistBadge />);

    expect(screen.getByText(/standard/i)).toBeInTheDocument();
  });

  test('should render VIP tier badge', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: {
        address: '0x1234...',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      },
      loading: false,
      error: null,
    });

    render(<WhitelistBadge />);

    expect(screen.getByText(/vip/i)).toBeInTheDocument();
  });

  test('should render Premium tier badge', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: {
        address: '0x1234...',
        isWhitelisted: true,
        tier: 'Premium',
        tierLevel: 3,
      },
      loading: false,
      error: null,
    });

    render(<WhitelistBadge />);

    expect(screen.getByText(/premium/i)).toBeInTheDocument();
  });

  test('should render different sizes', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: {
        address: '0x1234...',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      },
      loading: false,
      error: null,
    });

    const { rerender } = render(<WhitelistBadge size="sm" />);
    expect(screen.getByText(/vip/i)).toBeInTheDocument();

    rerender(<WhitelistBadge size="lg" />);
    expect(screen.getByText(/vip/i)).toBeInTheDocument();
  });

  test('should handle missing whitelist status', () => {
    useWhitelist.mockReturnValue({
      whitelistStatus: null,
      loading: false,
      error: null,
    });

    render(<WhitelistBadge />);

    // Should not crash
    expect(screen.queryByText(/vip|premium|standard/i)).not.toBeInTheDocument();
  });
});

