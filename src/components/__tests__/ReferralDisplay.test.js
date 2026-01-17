/**
 * Tests for ReferralDisplay Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReferralDisplay from '../ReferralDisplay';
import { useReferralChain } from '../../hooks/useReferralChain';
import { useAccount } from 'wagmi';

jest.mock('../../hooks/useReferralChain');
jest.mock('wagmi');

describe('ReferralDisplay Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
  });

  test('should render loading state', () => {
    useReferralChain.mockReturnValue({
      referral: null,
      loading: true,
      error: null,
    });

    render(<ReferralDisplay />);

    expect(screen.getByText(/loading referral information/i)).toBeInTheDocument();
  });

  test('should render error state', () => {
    useReferralChain.mockReturnValue({
      referral: null,
      loading: false,
      error: 'Failed to fetch referral',
    });

    render(<ReferralDisplay />);

    expect(screen.getByText(/error loading referral/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch referral/i)).toBeInTheDocument();
  });

  test('should render no referral state', () => {
    useReferralChain.mockReturnValue({
      referral: null, // No referral or no referrerAddress
      loading: false,
      error: null,
    });

    render(<ReferralDisplay />);

    expect(screen.getByText(/no referrer/i)).toBeInTheDocument();
  });

  test('should display referral information', () => {
    useReferralChain.mockReturnValue({
      referral: {
        referrerAddress: '0x0987654321098765432109876543210987654321',
        chainId: 8453,
        chainName: 'Base',
        createdAt: '2025-12-27T12:00:00.000Z',
      },
      loading: false,
      error: null,
    });

    render(<ReferralDisplay />);

    expect(screen.getByText(/referral information/i)).toBeInTheDocument();
    expect(screen.getByText(/0x0987...4321/i)).toBeInTheDocument();
  });

  test('should display referral benefits', () => {
    useReferralChain.mockReturnValue({
      referral: {
        referrerAddress: '0x0987654321098765432109876543210987654321',
        chainId: 8453,
      },
      loading: false,
      error: null,
    });

    render(<ReferralDisplay />);

    expect(screen.getByText(/referral benefits/i)).toBeInTheDocument();
  });
});

