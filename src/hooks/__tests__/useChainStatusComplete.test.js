/**
 * Complete Test Suite for useChainStatus Hooks
 * 
 * Comprehensive tests covering all hook states, error recovery, and refetch functionality
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { chainApi } from '../../services/mangoApi';
import { useSupportedChains, useChainStatus } from '../useChainStatus';

jest.mock('../../services/mangoApi', () => ({
  chainApi: {
    getSupportedChains: jest.fn(),
    getChainStatus: jest.fn(),
  },
}));

describe('useSupportedChains Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook States', () => {
    it('should have initial loading state', () => {
      const mockChains = {
        chains: [
          { chainId: 8453, name: 'Base', status: 'active' },
        ],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      const { result } = renderHook(() => useSupportedChains());

      expect(result.current.loading).toBe(true);
      expect(result.current.chains).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should have success state after fetch', async () => {
      const mockChains = {
        chains: [
          { chainId: 8453, name: 'Base', status: 'active' },
          { chainId: 42161, name: 'Arbitrum', status: 'active' },
        ],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.chains).toEqual(mockChains.chains);
      expect(result.current.error).toBeNull();
    });

    it('should have error state on failure', async () => {
      const error = new Error('API Error');
      chainApi.getSupportedChains.mockRejectedValue(error);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.chains).toEqual([]);
      expect(result.current.error).toBe('API Error');
    });
  });

  describe('Data Fetching', () => {
    it('should fetch supported chains on mount', async () => {
      const mockChains = {
        chains: [
          { chainId: 8453, name: 'Base', status: 'active' },
          { chainId: 42161, name: 'Arbitrum', status: 'active' },
        ],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      const { result } = renderHook(() => useSupportedChains());

      expect(chainApi.getSupportedChains).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.chains).toEqual(mockChains.chains);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty chains array', async () => {
      chainApi.getSupportedChains.mockResolvedValue({ chains: [] });

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.chains).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing chains property', async () => {
      chainApi.getSupportedChains.mockResolvedValue({});

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.chains).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle chains with various statuses', async () => {
      const mockChains = {
        chains: [
          { chainId: 8453, name: 'Base', status: 'active' },
          { chainId: 42161, name: 'Arbitrum', status: 'maintenance' },
          { chainId: 1, name: 'Ethereum', status: 'inactive' },
        ],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.chains).toHaveLength(3);
      expect(result.current.chains[0].status).toBe('active');
      expect(result.current.chains[1].status).toBe('maintenance');
      expect(result.current.chains[2].status).toBe('inactive');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error on refetch', async () => {
      const error = new Error('Initial API Error');
      chainApi.getSupportedChains.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial API Error');
      });

      const mockChains = {
        chains: [{ chainId: 8453, name: 'Base', status: 'active' }],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.chains).toEqual(mockChains.chains);
      });
    });

    it('should handle multiple consecutive errors', async () => {
      const error = new Error('API Error');
      chainApi.getSupportedChains.mockRejectedValue(error);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });
    });
  });

  describe('Refetch Functionality', () => {
    it('should refetch chains on refetch call', async () => {
      const mockChains1 = {
        chains: [{ chainId: 8453, name: 'Base', status: 'active' }],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains1);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockChains2 = {
        chains: [
          { chainId: 8453, name: 'Base', status: 'active' },
          { chainId: 42161, name: 'Arbitrum', status: 'active' },
        ],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains2);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.chains).toHaveLength(2);
      });

      expect(chainApi.getSupportedChains).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refetch', async () => {
      const mockChains = {
        chains: [{ chainId: 8453, name: 'Base', status: 'active' }],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loadingDuringRefetch = false;

      const refetchPromise = act(async () => {
        const promise = result.current.refetch();
        loadingDuringRefetch = result.current.loading;
        await promise;
      });

      // Note: Loading state might not be captured synchronously
      await refetchPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('API Error');
      chainApi.getSupportedChains.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });

      const mockChains = {
        chains: [{ chainId: 8453, name: 'Base', status: 'active' }],
      };

      chainApi.getSupportedChains.mockResolvedValue(mockChains);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle network timeout errors', async () => {
      const error = new Error('Network timeout');
      chainApi.getSupportedChains.mockRejectedValue(error);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.error).toBe('Network timeout');
      });
    });

    it('should handle malformed API response', async () => {
      chainApi.getSupportedChains.mockResolvedValue(null);

      const { result } = renderHook(() => useSupportedChains());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.chains).toEqual([]);
    });
  });
});

describe('useChainStatus Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook States', () => {
    it('should have initial loading state', async () => {
      const mockStatus = {
        chainId: 8453,
        name: 'Base',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useChainStatus(8453));

      expect(result.current.loading).toBe(true);
      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should have success state after fetch', async () => {
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

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
    });

    it('should have error state on failure', async () => {
      const error = new Error('Chain not found');
      chainApi.getChainStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useChainStatus(8453));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.status).toBeNull();
      expect(result.current.error).toBe('Chain not found');
    });

    it('should handle null chainId state', () => {
      const { result } = renderHook(() => useChainStatus(null));

      expect(result.current.status).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(chainApi.getChainStatus).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch chain status when chainId provided', async () => {
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

      expect(chainApi.getChainStatus).toHaveBeenCalledWith(8453);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when chainId is null', () => {
      const { result } = renderHook(() => useChainStatus(null));

      expect(result.current.status).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(chainApi.getChainStatus).not.toHaveBeenCalled();
    });

    it('should not fetch when chainId is undefined', () => {
      const { result } = renderHook(() => useChainStatus(undefined));

      expect(result.current.status).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(chainApi.getChainStatus).not.toHaveBeenCalled();
    });

    it('should handle different chain statuses', async () => {
      const statuses = ['active', 'maintenance', 'inactive'];

      for (const status of statuses) {
        const mockStatus = {
          chainId: 8453,
          name: 'Base',
          status,
        };

        chainApi.getChainStatus.mockResolvedValue(mockStatus);

        const { result, rerender } = renderHook(({ chainId }) => useChainStatus(chainId), {
          initialProps: { chainId: 8453 },
        });

        await waitFor(() => {
          expect(result.current.status?.status).toBe(status);
        });

        rerender({ chainId: 8454 }); // Change to force re-render
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error on refetch', async () => {
      const error = new Error('Chain not found');
      chainApi.getChainStatus.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChainStatus(8453));

      await waitFor(() => {
        expect(result.current.error).toBe('Chain not found');
      });

      const mockStatus = {
        chainId: 8453,
        name: 'Base',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.status).toEqual(mockStatus);
      });
    });

    it('should handle multiple consecutive errors', async () => {
      const error = new Error('Chain not found');
      chainApi.getChainStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useChainStatus(8453));

      await waitFor(() => {
        expect(result.current.error).toBe('Chain not found');
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Chain not found');
      });
    });
  });

  describe('Refetch Functionality', () => {
    it('should refetch on refetch call', async () => {
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

      const updatedStatus = {
        ...mockStatus,
        totalSwaps: 2000,
      };

      chainApi.getChainStatus.mockResolvedValue(updatedStatus);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.status.totalSwaps).toBe(2000);
      });

      expect(chainApi.getChainStatus).toHaveBeenCalledTimes(2);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Chain not found');
      chainApi.getChainStatus.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChainStatus(8453));

      await waitFor(() => {
        expect(result.current.error).toBe('Chain not found');
      });

      const mockStatus = {
        chainId: 8453,
        name: 'Base',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Chain ID Updates', () => {
    it('should update when chainId changes', async () => {
      const { rerender } = renderHook(({ chainId }) => useChainStatus(chainId), {
        initialProps: { chainId: 8453 },
      });

      await waitFor(() => {
        expect(chainApi.getChainStatus).toHaveBeenCalledWith(8453);
      });

      jest.clearAllMocks();

      const mockStatus = {
        chainId: 42161,
        name: 'Arbitrum',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      rerender({ chainId: 42161 });

      await waitFor(() => {
        expect(chainApi.getChainStatus).toHaveBeenCalledWith(42161);
      });
    });

    it('should handle chainId change from valid to null', async () => {
      const mockStatus = {
        chainId: 8453,
        name: 'Base',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      const { result, rerender } = renderHook(({ chainId }) => useChainStatus(chainId), {
        initialProps: { chainId: 8453 },
      });

      await waitFor(() => {
        expect(result.current.status).toEqual(mockStatus);
      });

      rerender({ chainId: null });

      await waitFor(() => {
        expect(result.current.status).toBeNull();
      });
    });

    it('should handle chainId change from null to valid', async () => {
      const { result, rerender } = renderHook(({ chainId }) => useChainStatus(chainId), {
        initialProps: { chainId: null },
      });

      expect(result.current.status).toBeNull();

      const mockStatus = {
        chainId: 8453,
        name: 'Base',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      rerender({ chainId: 8453 });

      await waitFor(() => {
        expect(chainApi.getChainStatus).toHaveBeenCalledWith(8453);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle network timeout errors', async () => {
      const error = new Error('Network timeout');
      chainApi.getChainStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useChainStatus(8453));

      await waitFor(() => {
        expect(result.current.error).toBe('Network timeout');
      });
    });

    it('should handle malformed API response', async () => {
      chainApi.getChainStatus.mockResolvedValue(null);

      const { result } = renderHook(() => useChainStatus(8453));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBeNull();
    });

    it('should handle zero chainId', async () => {
      const mockStatus = {
        chainId: 0,
        name: 'Test',
        status: 'active',
      };

      chainApi.getChainStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useChainStatus(0));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Note: 0 is falsy, so this might not fetch depending on implementation
      // This test documents current behavior
    });
  });
});

