/**
 * Complete Test Suite for useWhitelist Hook
 * 
 * Comprehensive tests covering all whitelist operations, tier updates, and error handling
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAccount, useChainId } from 'wagmi';
import { whitelistApi } from '../../services/mangoApi';
import { useWhitelist } from '../useWhitelist';

jest.mock('wagmi');
jest.mock('../../services/mangoApi', () => ({
  whitelistApi: {
    getWhitelistStatus: jest.fn(),
  },
}));

describe('useWhitelist Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    useChainId.mockReturnValue(8453);
  });

  describe('All Whitelist Operations', () => {
    it('should fetch whitelist status on mount', async () => {
      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
        feeExemption: 100,
        taxExemption: 100,
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

    it('should handle missing address', () => {
      useAccount.mockReturnValue({ address: null, isConnected: false });

      const { result } = renderHook(() => useWhitelist());

      expect(result.current.whitelistStatus).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(whitelistApi.getWhitelistStatus).not.toHaveBeenCalled();
    });

    it('should handle not whitelisted status', async () => {
      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: false,
        tier: 'None',
        tierLevel: 0,
        feeExemption: 0,
        taxExemption: 0,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.whitelistStatus.isWhitelisted).toBe(false);
      expect(result.current.whitelistStatus.tierLevel).toBe(0);
    });

    it('should handle all whitelist tiers', async () => {
      const tiers = [
        { tier: 'None', tierLevel: 0 },
        { tier: 'Basic', tierLevel: 1 },
        { tier: 'VIP', tierLevel: 2 },
        { tier: 'Premium', tierLevel: 3 },
        { tier: 'Elite', tierLevel: 4 },
      ];

      for (const tierData of tiers) {
        const mockStatus = {
          address: '0x1234567890123456789012345678901234567890',
          isWhitelisted: tierData.tierLevel > 0,
          ...tierData,
        };

        whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

        const { result, rerender } = renderHook(() => useWhitelist());

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.whitelistStatus.tier).toBe(tierData.tier);
        expect(result.current.whitelistStatus.tierLevel).toBe(tierData.tierLevel);

        rerender();
      }
    });

    it('should handle whitelist status with exemptions', async () => {
      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
        feeExemption: 50,
        taxExemption: 75,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.whitelistStatus.feeExemption).toBe(50);
      expect(result.current.whitelistStatus.taxExemption).toBe(75);
    });
  });

  describe('Tier Updates', () => {
    it('should update when chain ID changes', async () => {
      const mockStatus1 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus1);

      const { result, rerender } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          8453
        );
      });

      jest.clearAllMocks();

      useChainId.mockReturnValue(42161);

      const mockStatus2 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'Premium',
        tierLevel: 3,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus2);

      rerender();

      await waitFor(() => {
        expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          42161
        );
      });

      await waitFor(() => {
        expect(result.current.whitelistStatus.tier).toBe('Premium');
      });
    });

    it('should update when address changes', async () => {
      const mockStatus1 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus1);

      const { result, rerender } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(whitelistApi.getWhitelistStatus).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      useAccount.mockReturnValue({
        address: '0x9876543210987654321098765432109876543210',
        isConnected: true,
      });

      const mockStatus2 = {
        address: '0x9876543210987654321098765432109876543210',
        isWhitelisted: false,
        tier: 'None',
        tierLevel: 0,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus2);

      rerender();

      await waitFor(() => {
        expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledWith(
          '0x9876543210987654321098765432109876543210',
          8453
        );
      });
    });

    it('should handle tier upgrade scenario', async () => {
      const mockStatus1 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'Basic',
        tierLevel: 1,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus1);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.whitelistStatus.tierLevel).toBe(1);
      });

      const mockStatus2 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus2);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.whitelistStatus.tierLevel).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const error = new Error('API Error');
      whitelistApi.getWhitelistStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.whitelistStatus).toBeNull();
    });

    it('should recover from error on refetch', async () => {
      const error = new Error('API Error');
      whitelistApi.getWhitelistStatus.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });

      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.whitelistStatus).toEqual(mockStatus);
      });
    });

    it('should handle network timeout errors', async () => {
      const error = new Error('Network timeout');
      whitelistApi.getWhitelistStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.error).toBe('Network timeout');
      });
    });

    it('should handle malformed API response', async () => {
      whitelistApi.getWhitelistStatus.mockResolvedValue(null);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.whitelistStatus).toBeNull();
    });

    it('should handle multiple consecutive errors', async () => {
      const error = new Error('API Error');
      whitelistApi.getWhitelistStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useWhitelist());

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
    it('should refetch on refetch call', async () => {
      const mockStatus1 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus1);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockStatus2 = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'Premium',
        tierLevel: 3,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus2);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.whitelistStatus.tierLevel).toBe(3);
      });

      expect(whitelistApi.getWhitelistStatus).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refetch', async () => {
      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const promise = result.current.refetch();
        await promise;
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('API Error');
      whitelistApi.getWhitelistStatus.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });

      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined chainId gracefully', async () => {
      useChainId.mockReturnValue(undefined);

      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still call API even with undefined chainId
      expect(whitelistApi.getWhitelistStatus).toHaveBeenCalled();
    });

    it('should handle address change to null', async () => {
      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      const { result, rerender } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      useAccount.mockReturnValue({ address: null, isConnected: false });

      rerender();

      await waitFor(() => {
        expect(result.current.whitelistStatus).toBeNull();
      });
    });

    it('should handle zero tier level', async () => {
      const mockStatus = {
        address: '0x1234567890123456789012345678901234567890',
        isWhitelisted: false,
        tier: 'None',
        tierLevel: 0,
      };

      whitelistApi.getWhitelistStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useWhitelist());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.whitelistStatus.tierLevel).toBe(0);
      expect(result.current.whitelistStatus.isWhitelisted).toBe(false);
    });
  });
});

