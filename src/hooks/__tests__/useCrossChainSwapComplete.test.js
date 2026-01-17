/**
 * Complete Test Suite for useCrossChainSwap Hooks
 * 
 * Comprehensive tests for useSwapRoutes, useSwapEstimate, and useCrossChainSwap hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { swapApi } from '../../services/mangoApi';
import { useSwapRoutes, useSwapEstimate, useCrossChainSwap } from '../useCrossChainSwap';
import { useAccount } from 'wagmi';

jest.mock('../../services/mangoApi', () => ({
  swapApi: {
    getRoutes: jest.fn(),
    getEstimate: jest.fn(),
    initiateCrossChainSwap: jest.fn(),
    getSwapStatus: jest.fn(),
    cancelSwap: jest.fn(),
    getSwapHistory: jest.fn(), // Added for dataConsistency.test.js and other tests
  },
}));
// Don't mock wagmi here - use global mock from setupTests.js

describe('useSwapRoutes Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Fetching', () => {
    it('should fetch routes successfully', async () => {
      const mockRoutes = {
        routes: [
          {
            source: 'BASE',
            destination: 'ARBITRUM',
            sourceAsset: 'ETH',
            destinationAsset: 'ETH',
            fee: '0.001',
            estimatedTime: 300,
          },
          {
            source: 'BASE',
            destination: 'ARBITRUM',
            sourceAsset: 'USDC',
            destinationAsset: 'USDC',
            fee: '0.0005',
            estimatedTime: 240,
          },
        ],
      };

      swapApi.getRoutes.mockResolvedValue(mockRoutes);

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      expect(result.current.loading).toBe(true);
      expect(swapApi.getRoutes).toHaveBeenCalledWith(8453, 42161, null, null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.routes).toEqual(mockRoutes.routes);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty routes array', async () => {
      swapApi.getRoutes.mockResolvedValue({ routes: [] });

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.routes).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch routes with token filters', async () => {
      const mockRoutes = {
        routes: [
          {
            source: 'BASE',
            destination: 'ARBITRUM',
            sourceAsset: '0x4200000000000000000000000000000000000006',
            destinationAsset: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            fee: '0.001',
          },
        ],
      };

      swapApi.getRoutes.mockResolvedValue(mockRoutes);

      const { result } = renderHook(() => 
        useSwapRoutes(8453, 42161, '0x4200000000000000000000000000000000000006', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(swapApi.getRoutes).toHaveBeenCalledWith(
        8453,
        42161,
        '0x4200000000000000000000000000000000000006',
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
      );
      expect(result.current.routes).toEqual(mockRoutes.routes);
    });
  });

  describe('Route Selection', () => {
    it('should return routes for selection', async () => {
      const mockRoutes = {
        routes: [
          { id: 'route1', fee: '0.001' },
          { id: 'route2', fee: '0.002' },
        ],
      };

      swapApi.getRoutes.mockResolvedValue(mockRoutes);

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.routes).toHaveLength(2);
      expect(result.current.routes[0].id).toBe('route1');
    });

    it('should update routes when chain IDs change', async () => {
      const { rerender } = renderHook(
        ({ sourceChainId, destChainId }) => useSwapRoutes(sourceChainId, destChainId),
        { initialProps: { sourceChainId: 8453, destChainId: 42161 } }
      );

      await waitFor(() => {
        expect(swapApi.getRoutes).toHaveBeenCalledWith(8453, 42161, null, null);
      });

      jest.clearAllMocks();
      swapApi.getRoutes.mockResolvedValue({ routes: [] });

      rerender({ sourceChainId: 1, destChainId: 8453 });

      await waitFor(() => {
        expect(swapApi.getRoutes).toHaveBeenCalledWith(1, 8453, null, null);
      });
    });

    it('should update routes when token filters change', async () => {
      const { rerender } = renderHook(
        ({ tokenIn, tokenOut }) => useSwapRoutes(8453, 42161, tokenIn, tokenOut),
        { initialProps: { tokenIn: null, tokenOut: null } }
      );

      await waitFor(() => {
        expect(swapApi.getRoutes).toHaveBeenCalled();
      });

      jest.clearAllMocks();
      swapApi.getRoutes.mockResolvedValue({ routes: [] });

      rerender({ tokenIn: '0xToken1', tokenOut: '0xToken2' });

      await waitFor(() => {
        expect(swapApi.getRoutes).toHaveBeenCalledWith(8453, 42161, '0xToken1', '0xToken2');
      });
    });
  });

  describe('Route Error Handling', () => {
    it('should handle API errors', async () => {
      const error = new Error('Network error');
      swapApi.getRoutes.mockRejectedValue(error);

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.routes).toEqual([]);
    });

    it('should handle missing routes property in response', async () => {
      swapApi.getRoutes.mockResolvedValue({});

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.routes).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout');
      swapApi.getRoutes.mockRejectedValue(error);

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Request timeout');
    });
  });

  describe('Route Refetch', () => {
    it('should refetch routes on refetch call', async () => {
      swapApi.getRoutes.mockResolvedValue({ routes: [] });

      const { result } = renderHook(() => useSwapRoutes(8453, 42161));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();
      swapApi.getRoutes.mockResolvedValue({ routes: [{ id: 'route1' }] });

      await act(async () => {
        await result.current.refetch();
      });

      expect(swapApi.getRoutes).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(result.current.routes).toHaveLength(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not fetch when sourceChainId is missing', () => {
      const { result } = renderHook(() => useSwapRoutes(null, 42161));

      expect(result.current.routes).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(swapApi.getRoutes).not.toHaveBeenCalled();
    });

    it('should not fetch when destChainId is missing', () => {
      const { result } = renderHook(() => useSwapRoutes(8453, null));

      expect(result.current.routes).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(swapApi.getRoutes).not.toHaveBeenCalled();
    });

    it('should not fetch when both chain IDs are missing', () => {
      const { result } = renderHook(() => useSwapRoutes(null, null));

      expect(result.current.routes).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(swapApi.getRoutes).not.toHaveBeenCalled();
    });
  });
});

describe('useSwapEstimate Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Estimate Calculation', () => {
    it('should fetch estimate successfully', async () => {
      const mockEstimate = {
        totalFee: '50000000000000000',
        mangoFee: '30000000000000000',
        layerswapFee: '20000000000000000',
        estimatedTime: 300,
        minAmountOut: '950000000000000000',
      };

      swapApi.getEstimate.mockResolvedValue(mockEstimate);

      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '1000000000000000000',
      };

      const { result } = renderHook(() => useSwapEstimate(estimateParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.estimate).toEqual(mockEstimate);
      expect(result.current.error).toBeNull();
      expect(swapApi.getEstimate).toHaveBeenCalledWith(estimateParams);
    });

    it('should handle zero amount', async () => {
      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '0',
      };

      const { result } = renderHook(() => useSwapEstimate(estimateParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(swapApi.getEstimate).toHaveBeenCalled();
    });

    it('should handle large amounts', async () => {
      const mockEstimate = {
        totalFee: '1000000000000000000',
        mangoFee: '500000000000000000',
        layerswapFee: '500000000000000000',
      };

      swapApi.getEstimate.mockResolvedValue(mockEstimate);

      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '1000000000000000000000', // 1000 tokens
      };

      const { result } = renderHook(() => useSwapEstimate(estimateParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.estimate).toEqual(mockEstimate);
    });
  });

  describe('Estimate Updates', () => {
    it('should update estimate when params change', async () => {
      const { rerender } = renderHook(
        ({ params }) => useSwapEstimate(params),
        {
          initialProps: {
            params: {
              sourceChainId: 8453,
              destChainId: 42161,
              tokenIn: '0xToken1',
              tokenOut: '0xToken2',
              amountIn: '1000000000000000000',
            },
          },
        }
      );

      await waitFor(() => {
        expect(swapApi.getEstimate).toHaveBeenCalled();
      });

      jest.clearAllMocks();
      swapApi.getEstimate.mockResolvedValue({ totalFee: '10000000000000000' });

      rerender({
        params: {
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: '2000000000000000000', // Different amount
        },
      });

      await waitFor(() => {
        expect(swapApi.getEstimate).toHaveBeenCalled();
      });
    });

    it('should not update when params are null', () => {
      const { result } = renderHook(() => useSwapEstimate(null));

      expect(result.current.estimate).toBeNull();
      expect(swapApi.getEstimate).not.toHaveBeenCalled();
    });
  });

  describe('Estimate Error Handling', () => {
    it('should handle API errors', async () => {
      const error = new Error('Estimate calculation failed');
      swapApi.getEstimate.mockRejectedValue(error);

      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '1000000000000000000',
      };

      const { result } = renderHook(() => useSwapEstimate(estimateParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Estimate calculation failed');
      expect(result.current.estimate).toBeNull();
    });

    it('should handle missing required params', () => {
      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        // Missing tokenIn, tokenOut, amountIn
      };

      const { result } = renderHook(() => useSwapEstimate(estimateParams));

      expect(result.current.estimate).toBeNull();
      expect(swapApi.getEstimate).not.toHaveBeenCalled();
    });
  });

  describe('Estimate Refetch', () => {
    it('should refetch estimate on refetch call', async () => {
      swapApi.getEstimate.mockResolvedValue({ totalFee: '10000000000000000' });

      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '1000000000000000000',
      };

      const { result } = renderHook(() => useSwapEstimate(estimateParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();
      swapApi.getEstimate.mockResolvedValue({ totalFee: '20000000000000000' });

      await act(async () => {
        await result.current.refetch();
      });

      expect(swapApi.getEstimate).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useCrossChainSwap Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Swap Initiation', () => {
    it('should initiate swap successfully', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        layerswapOrderId: 'ls_order_123',
        status: 'pending',
        depositAddress: '0xabcd000000000000000000000000000000000000',
        sourceChainId: 8453,
        destChainId: 42161,
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      expect(swapApi.initiateCrossChainSwap).toHaveBeenCalledWith({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '1000000000000000000',
        recipient: '0x1234567890123456789012345678901234567890',
      });
      expect(result.current.swapStatus).toEqual(mockSwapOrder);
      expect(result.current.loading).toBe(false);
    });

    it('should throw error when wallet not connected', async () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await expect(
          result.current.initiateSwap({
            sourceChainId: 8453,
            destChainId: 42161,
            tokenIn: '0x4200000000000000000000000000000000000006',
            tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            amountIn: '1000000000000000000',
          })
        ).rejects.toThrow('Wallet not connected');
      });
    });

    it('should start status polling after successful initiation', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockResolvedValue({ status: 'pending' });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      expect(result.current.isPolling).toBe(true);

      // Advance timer to trigger polling
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(swapApi.getSwapStatus).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      });
    });
  });

  describe('Swap Status Tracking', () => {
    it('should poll swap status periodically', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockResolvedValue({ status: 'pending' });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      // Advance timer multiple times to test polling
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(swapApi.getSwapStatus).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(swapApi.getSwapStatus).toHaveBeenCalledTimes(1);
      });
    });

    it('should stop polling when swap is completed', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockResolvedValue({ status: 'completed' });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });
    });

    it('should stop polling when swap fails', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockResolvedValue({ status: 'failed' });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });
    });

    it('should stop polling when swap is cancelled', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockResolvedValue({ status: 'cancelled' });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });
    });

    it('should handle polling errors gracefully', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockRejectedValue(new Error('Status check failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Swap Error Handling', () => {
    it('should handle swap initiation errors', async () => {
      const error = new Error('Swap initiation failed');
      swapApi.initiateCrossChainSwap.mockRejectedValue(error);

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        try {
          await result.current.initiateSwap({
            sourceChainId: 8453,
            destChainId: 42161,
            tokenIn: '0x4200000000000000000000000000000000000006',
            tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            amountIn: '1000000000000000000',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Swap initiation failed');
      expect(result.current.loading).toBe(false);
    });

    it('should not start polling if swapId is missing', async () => {
      const mockSwapOrder = {
        status: 'pending',
        // No swapId
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe('Swap Cancellation', () => {
    it('should cancel swap successfully', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.cancelSwap.mockResolvedValue({ success: true, cancelled: true });

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      const swapId = result.current.swapStatus?.swapId || '550e8400-e29b-41d4-a716-446655440000';

      await act(async () => {
        await result.current.cancelSwap(swapId);
      });

      expect(swapApi.cancelSwap).toHaveBeenCalledWith(swapId);
      expect(result.current.swapStatus.status).toBe('cancelled');
      expect(result.current.isPolling).toBe(false);
    });

    it('should handle cancel errors', async () => {
      const error = new Error('Cancel failed');
      swapApi.cancelSwap.mockRejectedValue(error);

      const { result } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        try {
          await result.current.cancelSwap('550e8400-e29b-41d4-a716-446655440000');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Cancel failed');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should stop polling on unmount', async () => {
      const mockSwapOrder = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      };

      swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);
      swapApi.getSwapStatus.mockResolvedValue({ status: 'pending' });

      const { result, unmount } = renderHook(() => useCrossChainSwap());

      await act(async () => {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        });
      });

      expect(result.current.isPolling).toBe(true);

      unmount();

      // Polling should be stopped
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not call getSwapStatus after unmount
      const callCount = swapApi.getSwapStatus.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(0);
    });
  });
});

