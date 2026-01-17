/**
 * Complete Test Suite for useReferralChain Hooks
 * 
 * Comprehensive tests covering all referral chain operations, sync functionality, and error handling
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAccount, useChainId } from 'wagmi';
import { referralApi } from '../../services/mangoApi';
import { useReferralChain, useReferralSync } from '../useReferralChain';

jest.mock('wagmi');
jest.mock('../../services/mangoApi', () => ({
  referralApi: {
    getReferralChain: jest.fn(),
    syncReferral: jest.fn(),
  },
}));

describe('useReferralChain Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    useChainId.mockReturnValue(8453);
  });

  describe('All Referral Chain Operations', () => {
    it('should fetch referral chain on mount', async () => {
      const mockReferral = {
        address: '0x1234...',
        referral: {
          chainId: 8453,
          referrer: '0x5678...',
          referralLevel: 1,
        },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      const { result } = renderHook(() => useReferralChain());

      expect(result.current.loading).toBe(true);
      expect(referralApi.getReferralChain).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        8453,
        false
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.referral).toEqual(mockReferral);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing address', () => {
      useAccount.mockReturnValue({ address: null, isConnected: false });

      const { result } = renderHook(() => useReferralChain());

      expect(result.current.referral).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(referralApi.getReferralChain).not.toHaveBeenCalled();
    });

    it('should fetch all chains when checkAllChains is true', async () => {
      const mockReferral = {
        address: '0x1234...',
        referrals: [
          { chainId: 8453, referrer: '0x5678...', referralLevel: 1 },
          { chainId: 42161, referrer: '0x5678...', referralLevel: 1 },
          { chainId: 1, referrer: '0x5678...', referralLevel: 1 },
        ],
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      const { result } = renderHook(() => useReferralChain(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(referralApi.getReferralChain).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        null,
        true
      );
      expect(result.current.referral).toEqual(mockReferral);
    });

    it('should handle referral with multiple levels', async () => {
      const mockReferral = {
        address: '0x1234...',
        referral: {
          chainId: 8453,
          referrer: '0x5678...',
          referralLevel: 1,
          referralChain: [
            { address: '0x5678...', level: 1 },
            { address: '0x9abc...', level: 2 },
            { address: '0xdef0...', level: 3 },
          ],
        },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.referral.referral.referralChain).toHaveLength(3);
    });

    it('should handle no referral found', async () => {
      const mockReferral = {
        address: '0x1234...',
        referral: null,
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.referral.referral).toBeNull();
    });
  });

  describe('Sync Functionality', () => {
    it('should update when address changes', async () => {
      const mockReferral1 = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral1);

      const { result, rerender } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(referralApi.getReferralChain).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      useAccount.mockReturnValue({
        address: '0x9876543210987654321098765432109876543210',
        isConnected: true,
      });

      const mockReferral2 = {
        address: '0x9876...',
        referral: { chainId: 8453, referrer: '0xabcd...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral2);

      rerender();

      await waitFor(() => {
        expect(referralApi.getReferralChain).toHaveBeenCalledWith(
          '0x9876543210987654321098765432109876543210',
          8453,
          false
        );
      });
    });

    it('should update when chainId changes', async () => {
      const mockReferral1 = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral1);

      const { result, rerender } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(referralApi.getReferralChain).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          8453,
          false
        );
      });

      jest.clearAllMocks();

      useChainId.mockReturnValue(42161);

      const mockReferral2 = {
        address: '0x1234...',
        referral: { chainId: 42161, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral2);

      rerender();

      await waitFor(() => {
        expect(referralApi.getReferralChain).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          42161,
          false
        );
      });
    });

    it('should update when checkAllChains changes', async () => {
      const mockReferral = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      const { result, rerender } = renderHook(({ checkAll }) => useReferralChain(checkAll), {
        initialProps: { checkAll: false },
      });

      await waitFor(() => {
        expect(referralApi.getReferralChain).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          8453,
          false
        );
      });

      jest.clearAllMocks();

      const mockAllChainsReferral = {
        address: '0x1234...',
        referrals: [
          { chainId: 8453, referrer: '0x5678...' },
          { chainId: 42161, referrer: '0x5678...' },
        ],
      };

      referralApi.getReferralChain.mockResolvedValue(mockAllChainsReferral);

      rerender({ checkAll: true });

      await waitFor(() => {
        expect(referralApi.getReferralChain).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
          null,
          true
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const error = new Error('API Error');
      referralApi.getReferralChain.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.referral).toBeNull();
    });

    it('should recover from error on refetch', async () => {
      const error = new Error('API Error');
      referralApi.getReferralChain.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });

      const mockReferral = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.referral).toEqual(mockReferral);
      });
    });

    it('should handle network timeout errors', async () => {
      const error = new Error('Network timeout');
      referralApi.getReferralChain.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.error).toBe('Network timeout');
      });
    });

    it('should handle malformed API response', async () => {
      referralApi.getReferralChain.mockResolvedValue(null);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.referral).toBeNull();
    });
  });

  describe('Refetch Functionality', () => {
    it('should refetch referral on refetch call', async () => {
      const mockReferral1 = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral1);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();

      const mockReferral2 = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0xabcd...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral2);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.referral.referral.referrer).toBe('0xabcd...');
      });

      expect(referralApi.getReferralChain).toHaveBeenCalledTimes(1);
    });

    it('should set loading state during refetch', async () => {
      const mockReferral = {
        address: '0x1234...',
        referral: { chainId: 8453, referrer: '0x5678...' },
      };

      referralApi.getReferralChain.mockResolvedValue(mockReferral);

      const { result } = renderHook(() => useReferralChain());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const promise = result.current.refetch();
        // Loading should be true during refetch
        await promise;
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});

describe('useReferralSync Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sync Functionality', () => {
    it('should sync referral successfully', async () => {
      const mockResult = {
        success: true,
        syncTxHash: '0xabcd000000000000000000000000000000000000',
        syncedAt: '2025-12-27T12:00:00.000Z',
        sourceChainId: 8453,
        destChainId: 42161,
      };

      // Use a promise that we can control to test syncing state
      let resolveSync;
      const syncPromise = new Promise((resolve) => {
        resolveSync = resolve;
      });
      referralApi.syncReferral.mockReturnValue(syncPromise);

      const { result } = renderHook(() => useReferralSync());

      expect(result.current.syncing).toBe(false);
      expect(result.current.error).toBeNull();

      const syncCall = result.current.syncReferral(
        '0x1234567890123456789012345678901234567890',
        '0x5678901234567890123456789012345678901234',
        8453,
        42161
      );

      // Wait for syncing state to update (React state updates are async)
      await waitFor(() => {
        expect(result.current.syncing).toBe(true);
      });

      // Now resolve the promise
      resolveSync(mockResult);
      const resultData = await syncCall;

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      expect(resultData).toEqual(mockResult);
      expect(result.current.error).toBeNull();
      expect(referralApi.syncReferral).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        '0x5678901234567890123456789012345678901234',
        8453,
        42161
      );
    });

    it('should handle sync with same source and destination chain', async () => {
      const mockResult = {
        success: true,
        syncTxHash: '0xabcd...',
        syncedAt: '2025-12-27T12:00:00.000Z',
      };

      referralApi.syncReferral.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useReferralSync());

      const syncPromise = result.current.syncReferral(
        '0x1234...',
        '0x5678...',
        8453,
        8453 // Same chain
      );

      await syncPromise;

      expect(referralApi.syncReferral).toHaveBeenCalledWith(
        '0x1234...',
        '0x5678...',
        8453,
        8453
      );
    });

    it('should handle sync across multiple chains', async () => {
      const mockResult = {
        success: true,
        syncTxHash: '0xabcd...',
        syncedAt: '2025-12-27T12:00:00.000Z',
      };

      referralApi.syncReferral.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useReferralSync());

      const chainPairs = [
        [8453, 42161], // Base to Arbitrum
        [8453, 1], // Base to Ethereum
        [42161, 8453], // Arbitrum to Base
      ];

      for (const [sourceChainId, destChainId] of chainPairs) {
        jest.clearAllMocks();

        const syncPromise = result.current.syncReferral(
          '0x1234...',
          '0x5678...',
          sourceChainId,
          destChainId
        );

        await syncPromise;

        expect(referralApi.syncReferral).toHaveBeenCalledWith(
          '0x1234...',
          '0x5678...',
          sourceChainId,
          destChainId
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors', async () => {
      const error = new Error('Sync failed');
      referralApi.syncReferral.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161)
      ).rejects.toThrow('Sync failed');

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Sync failed');
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      referralApi.syncReferral.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161)
      ).rejects.toThrow('Network error');

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('should reset error state on next successful sync', async () => {
      const error = new Error('Sync failed');
      referralApi.syncReferral.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161)
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Sync failed');
      });

      const mockResult = {
        success: true,
        syncTxHash: '0xabcd...',
      };

      referralApi.syncReferral.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout');
      referralApi.syncReferral.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161)
      ).rejects.toThrow('Request timeout');

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Request timeout');
      });
    });
  });

  describe('State Management', () => {
    it('should set syncing state during sync operation', async () => {
      let resolveSync;
      const syncPromise = new Promise((resolve) => {
        resolveSync = resolve;
      });

      referralApi.syncReferral.mockReturnValue(syncPromise);

      const { result } = renderHook(() => useReferralSync());

      const syncCall = result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161);

      // Wait for syncing state to update (React state updates are async)
      await waitFor(() => {
        expect(result.current.syncing).toBe(true);
      });

      resolveSync({ success: true });

      await syncCall;

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });
    });

    it('should handle multiple sync calls sequentially', async () => {
      const mockResult = {
        success: true,
        syncTxHash: '0xabcd...',
      };

      referralApi.syncReferral.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useReferralSync());

      await act(async () => {
        await result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161);
        await result.current.syncReferral('0x1234...', '0x5678...', 42161, 1);
      });

      expect(referralApi.syncReferral).toHaveBeenCalledTimes(2);
    });

    it('should clear error on new sync attempt', async () => {
      const error = new Error('Sync failed');
      referralApi.syncReferral.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161)
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Sync failed');
      });

      const mockResult = {
        success: true,
        syncTxHash: '0xabcd...',
      };

      referralApi.syncReferral.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.syncReferral('0x1234...', '0x5678...', 8453, 42161);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid addresses', async () => {
      const error = new Error('Invalid address');
      referralApi.syncReferral.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('invalid', '0x5678...', 8453, 42161)
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid address');
      });
    });

    it('should handle invalid chain IDs', async () => {
      const error = new Error('Invalid chain ID');
      referralApi.syncReferral.mockRejectedValue(error);

      const { result } = renderHook(() => useReferralSync());

      await expect(
        result.current.syncReferral('0x1234...', '0x5678...', 99999, 42161)
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.syncing).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid chain ID');
      });
    });
  });
});

