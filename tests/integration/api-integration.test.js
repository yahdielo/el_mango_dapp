/**
 * Integration Tests for API Service
 * 
 * These tests verify the API service works with the actual API structure
 * (though API calls are mocked)
 */

import axios from 'axios';
import { referralApi, whitelistApi, chainApi, swapApi } from '../../src/services/mangoApi';

// Mock axios for integration tests
jest.mock('axios');

describe('API Integration Tests', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Reset modules to get fresh API instance
    jest.resetModules();
  });

  describe('Referral API Integration', () => {
    test('should handle complete referral chain flow', async () => {
      // Mock get referral
      const mockReferral = {
        address: '0x1234...',
        referral: {
          chainId: 8453,
          referrer: '0x5678...',
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockReferral });

      const referral = await referralApi.getReferralChain('0x1234...', 8453);
      expect(referral).toEqual(mockReferral);

      // Mock sync referral
      const mockSync = {
        success: true,
        syncTxHash: '0xabcd...',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockSync });

      const syncResult = await referralApi.syncReferral(
        '0x1234...',
        '0x5678...',
        8453,
        42161
      );
      expect(syncResult).toEqual(mockSync);
    });
  });

  describe('Cross-Chain Swap Integration', () => {
    test('should handle complete swap flow', async () => {
      // Step 1: Get routes
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

      mockAxiosInstance.get.mockResolvedValue({ data: mockRoutes });
      const routes = await swapApi.getRoutes(8453, 42161);
      expect(routes).toEqual(mockRoutes);

      // Step 2: Get estimate
      const mockEstimate = {
        totalFee: '50000000000000000',
        mangoFee: '30000000000000000',
        layerswapFee: '20000000000000000',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockEstimate });
      const estimate = await swapApi.getEstimate({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200...',
        tokenOut: '0x82af...',
        amountIn: '1000000000000000000',
      });
      expect(estimate).toEqual(mockEstimate);

      // Step 3: Initiate swap
      const mockSwap = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        layerswapOrderId: 'ls_order_123',
        status: 'pending',
        depositAddress: '0xabcd...',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockSwap });
      const swap = await swapApi.initiateCrossChainSwap({
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200...',
        tokenOut: '0x82af...',
        amountIn: '1000000000000000000',
        recipient: '0x1234...',
      });
      expect(swap).toEqual(mockSwap);

      // Step 4: Check status
      const mockStatus = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });
      const status = await swapApi.getSwapStatus('550e8400-e29b-41d4-a716-446655440000');
      expect(status).toEqual(mockStatus);
    });
  });
});

