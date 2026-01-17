/**
 * Tests for useCrossChainSwap Hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSwapRoutes, useSwapEstimate, useCrossChainSwap } from '../useCrossChainSwap';
import { swapApi } from '../../services/mangoApi';

// Mock mangoApi with swapApi
jest.mock('../../services/mangoApi', () => ({
    swapApi: {
        getRoutes: jest.fn(),
        getEstimate: jest.fn(),
        initiateCrossChainSwap: jest.fn(),
        getSwapStatus: jest.fn(),
        cancelSwap: jest.fn(),
    },
}));

// Mock wagmi
jest.mock('wagmi', () => ({
    useAccount: jest.fn(),
}));

import { useAccount } from 'wagmi';

describe('useSwapRoutes Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
  });

  test('should fetch routes successfully', async () => {
    const mockRoutes = {
      routes: [
        {
          source: 'BASE',
          destination: 'ARBITRUM',
          sourceAsset: 'ETH',
          destinationAsset: 'ETH',
          fee: '0.001',
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

  test('should not fetch when chain IDs missing', () => {
    const { result } = renderHook(() => useSwapRoutes(null, 42161));

    expect(result.current.routes).toEqual([]);
    expect(swapApi.getRoutes).not.toHaveBeenCalled();
  });
});

describe('useSwapEstimate Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
  });

  test('should fetch estimate successfully', async () => {
    const mockEstimate = {
      totalFee: '50000000000000000',
      mangoFee: '30000000000000000',
      layerswapFee: '20000000000000000',
    };

    swapApi.getEstimate.mockResolvedValue(mockEstimate);

    const estimateParams = {
      sourceChainId: 8453,
      destChainId: 42161,
      tokenIn: '0x4200...',
      tokenOut: '0x82af...',
      amountIn: '1000000000000000000',
    };

    const { result } = renderHook(() => useSwapEstimate(estimateParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.estimate).toEqual(mockEstimate);
    expect(result.current.error).toBeNull();
  });

  test('should not fetch when params missing', () => {
    const { result } = renderHook(() => useSwapEstimate(null));

    expect(result.current.estimate).toBeNull();
    expect(swapApi.getEstimate).not.toHaveBeenCalled();
  });
});

describe('useCrossChainSwap Hook', () => {
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

  test('should initiate swap successfully', async () => {
    const mockSwapOrder = {
      swapId: '550e8400-e29b-41d4-a716-446655440000',
      layerswapOrderId: 'ls_order_123',
      status: 'pending',
      depositAddress: '0xabcd...',
      sourceChainId: 8453,
      destChainId: 42161,
    };

    swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);

    const { result } = renderHook(() => useCrossChainSwap());

    await act(async () => {
      await result.current.initiateSwap({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200...',
        tokenOut: '0x82af...',
        amountIn: '1000000000000000000',
        recipient: '0x1234...',
      });
    });

    expect(swapApi.initiateCrossChainSwap).toHaveBeenCalled();
    expect(result.current.swapStatus).toEqual(mockSwapOrder);
    expect(result.current.loading).toBe(false);
  });

  test('should handle swap errors', async () => {
    const error = new Error('Swap initiation failed');
    swapApi.initiateCrossChainSwap.mockRejectedValue(error);

    const { result } = renderHook(() => useCrossChainSwap());

    await act(async () => {
      try {
        await result.current.initiateSwap({
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200...',
          tokenOut: '0x82af...',
          amountIn: '1000000000000000000',
          recipient: '0x1234...',
        });
      } catch (e) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Swap initiation failed');
    expect(result.current.loading).toBe(false);
  });

  test('should poll swap status', async () => {
    const mockSwapOrder = {
      swapId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'pending',
    };

    swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);

    const mockStatus = {
      swapId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'completed',
    };

    swapApi.getSwapStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useCrossChainSwap());

    await act(async () => {
      await result.current.initiateSwap({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200...',
        tokenOut: '0x82af...',
        amountIn: '1000000000000000000',
        recipient: '0x1234...',
      });
    });

    // Advance timers to trigger polling
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(swapApi.getSwapStatus).toHaveBeenCalled();
    });
  });

  test('should cancel swap', async () => {
    const mockSwapOrder = {
      swapId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'pending',
    };

    swapApi.cancelSwap.mockResolvedValue({ success: true, cancelled: true });
    swapApi.initiateCrossChainSwap.mockResolvedValue(mockSwapOrder);

    const { result } = renderHook(() => useCrossChainSwap());

    await act(async () => {
      await result.current.initiateSwap({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200...',
        tokenOut: '0x82af...',
        amountIn: '1000000000000000000',
        recipient: '0x1234...',
      });
    });

    const swapId = result.current.swapStatus?.swapId || '550e8400-e29b-41d4-a716-446655440000';

    await act(async () => {
      await result.current.cancelSwap(swapId);
    });

    expect(swapApi.cancelSwap).toHaveBeenCalledWith(swapId);
  });
});

