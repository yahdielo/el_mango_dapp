/**
 * Tests for useChainStatus Hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { chainApi } from '../../services/mangoApi';
import { useSupportedChains, useChainStatus } from '../useChainStatus';

jest.mock('../../services/mangoApi', () => ({
  chainApi: {
    getSupportedChains: jest.fn(),
    getChainStatus: jest.fn(),
  },
}));

describe('useSupportedChains Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch supported chains on mount', async () => {
    const mockChains = {
      chains: [
        { chainId: 8453, name: 'Base', status: 'active' },
        { chainId: 42161, name: 'Arbitrum', status: 'active' },
      ],
    };

    chainApi.getSupportedChains.mockResolvedValue(mockChains);

    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.loading).toBe(true);
    expect(chainApi.getSupportedChains).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.chains).toEqual(mockChains.chains);
    expect(result.current.error).toBeNull();
  });

  test('should handle API errors', async () => {
    const error = new Error('API Error');
    chainApi.getSupportedChains.mockRejectedValue(error);

    const { result } = renderHook(() => useSupportedChains());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.chains).toEqual([]);
  });

  test('should refetch chains on refetch call', async () => {
    const mockChains = {
      chains: [{ chainId: 8453, name: 'Base', status: 'active' }],
    };

    chainApi.getSupportedChains.mockResolvedValue(mockChains);

    const { result } = renderHook(() => useSupportedChains());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    jest.clearAllMocks();
    chainApi.getSupportedChains.mockResolvedValue(mockChains);

    await result.current.refetch();

    expect(chainApi.getSupportedChains).toHaveBeenCalledTimes(1);
  });
});

describe('useChainStatus Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch chain status when chainId provided', async () => {
    const mockStatus = {
      chainId: 8453,
      name: 'Base',
      status: 'active',
      lastSync: '2025-12-27T12:00:00.000Z',
      totalSwaps: 1000,
      totalReferrals: 500,
    };

    chainApi.getChainStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useChainStatus(8453));

    expect(result.current.loading).toBe(true);
    expect(chainApi.getChainStatus).toHaveBeenCalledWith(8453);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.error).toBeNull();
  });

  test('should not fetch when chainId is null', () => {
    const { result } = renderHook(() => useChainStatus(null));

    expect(result.current.status).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(chainApi.getChainStatus).not.toHaveBeenCalled();
  });

  test('should handle API errors', async () => {
    const error = new Error('Chain not found');
    chainApi.getChainStatus.mockRejectedValue(error);

    const { result } = renderHook(() => useChainStatus(8453));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Chain not found');
    expect(result.current.status).toBeNull();
  });

  test('should update when chainId changes', async () => {
    const { rerender } = renderHook(({ chainId }) => useChainStatus(chainId), {
      initialProps: { chainId: 8453 },
    });

    await waitFor(() => {
      expect(chainApi.getChainStatus).toHaveBeenCalledWith(8453);
    });

    jest.clearAllMocks();

    rerender({ chainId: 42161 });

    await waitFor(() => {
      expect(chainApi.getChainStatus).toHaveBeenCalledWith(42161);
    });
  });

  test('should refetch on refetch call', async () => {
    const mockStatus = {
      chainId: 8453,
      name: 'Base',
      status: 'active',
    };

    chainApi.getChainStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useChainStatus(8453));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    jest.clearAllMocks();
    chainApi.getChainStatus.mockResolvedValue(mockStatus);

    await result.current.refetch();

    expect(chainApi.getChainStatus).toHaveBeenCalledTimes(1);
  });
});

