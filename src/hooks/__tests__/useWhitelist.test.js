/**
 * Tests for useWhitelist Hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAccount, useChainId } from 'wagmi';
import { whitelistApi } from '../../services/mangoApi';
import { useWhitelist } from '../useWhitelist';

jest.mock('wagmi');
jest.mock('../../services/mangoApi', () => ({
  whitelistApi: {
    getWhitelistStatus: jest.fn(),
  },
}));

describe('useWhitelist Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    useChainId.mockReturnValue(8453);
  });

  test('should fetch whitelist status on mount', async () => {
    const mockStatus = {
      address: '0x1234...',
      isWhitelisted: true,
      tier: 'VIP',
      tierLevel: 2,
    };

    whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useWhitelist());

    expect(result.current.loading).toBe(true);
    expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      8453
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.whitelistStatus).toEqual(mockStatus);
    expect(result.current.error).toBeNull();
  });

  test('should handle missing address', () => {
    useAccount.mockReturnValue({ address: null, isConnected: false });

    const { result } = renderHook(() => useWhitelist());

    expect(result.current.whitelistStatus).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(whitelistApi.getWhitelistStatus).not.toHaveBeenCalled();
  });

  test('should handle not whitelisted status', async () => {
    const mockStatus = {
      address: '0x1234...',
      isWhitelisted: false,
      tier: 'None',
      tierLevel: 0,
    };

    whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useWhitelist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.whitelistStatus).toEqual(mockStatus);
  });

  test('should handle API errors', async () => {
    const error = new Error('API Error');
    whitelistApi.getWhitelistStatus.mockRejectedValue(error);

    const { result } = renderHook(() => useWhitelist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.whitelistStatus).toBeNull();
  });

  test('should refetch on refetch call', async () => {
    const mockStatus = {
      address: '0x1234...',
      isWhitelisted: true,
      tier: 'VIP',
      tierLevel: 2,
    };

    whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useWhitelist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    jest.clearAllMocks();
    whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

    await result.current.refetch();

    expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledTimes(1);
  });

  test('should update when chain ID changes', async () => {
    const { rerender } = renderHook(() => useWhitelist());

    await waitFor(() => {
      expect(whitelistApi.getWhitelistStatus).toHaveBeenCalled();
    });

    jest.clearAllMocks();

    useChainId.mockReturnValue(42161);

    rerender();

    await waitFor(() => {
      expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        42161
      );
    });
  });
});

