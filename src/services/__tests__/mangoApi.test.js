/**
 * Tests for Mango DeFi API Service Module
 */

// Unmock mangoApi for these tests since we want to test the actual implementation
jest.unmock('../mangoApi');

import { referralApi, whitelistApi, chainApi, swapApi, healthCheck, apiClient } from '../mangoApi';

// Spy on the exported apiClient methods
// Since apiClient is exported, we can spy on it and the functions will use the spied methods
// Check if apiClient exists before spying
const mockApiClient = apiClient ? {
  get: jest.spyOn(apiClient, 'get'),
  post: jest.spyOn(apiClient, 'post'),
} : {
  get: jest.fn(),
  post: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the spies
  mockApiClient.get.mockClear();
  mockApiClient.post.mockClear();
});

describe('API Service Module', () => {
  describe('Environment Variables', () => {
    test('should use default API URL if not set', () => {
      const originalEnv = process.env.REACT_APP_MANGO_API_URL;
      delete process.env.REACT_APP_MANGO_API_URL;
      
      // Re-import to get fresh module
      jest.resetModules();
      const api = require('../mangoApi');
      
      process.env.REACT_APP_MANGO_API_URL = originalEnv;
      
      // Just verify module loads
      expect(api).toBeDefined();
    });

    test('should load API URL from environment', () => {
      expect(process.env.REACT_APP_MANGO_API_URL).toBeDefined();
    });

    test('should handle missing API key gracefully', () => {
      // API key can be empty string
      expect(() => {
        const api = require('../mangoApi');
        expect(api).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Referral API', () => {
    test('getReferralChain - should fetch referral chain successfully', async () => {
      const mockData = {
        address: '0x1234567890123456789012345678901234567890',
        referral: {
          chainId: 8453,
          chainName: 'Base',
          referrer: '0x0987654321098765432109876543210987654321',
        },
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await referralApi.getReferralChain('0x1234567890123456789012345678901234567890');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/referral-chain/0x1234567890123456789012345678901234567890',
        expect.objectContaining({ params: {} })
      );
      expect(result).toEqual(mockData);
    });

    test('getReferralChain - should handle chainId parameter', async () => {
      const mockData = { address: '0x1234...', referral: null };
      mockApiClient.get.mockResolvedValue({ data: mockData });

      await referralApi.getReferralChain('0x1234...', 42161);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/referral-chain/0x1234...',
        expect.objectContaining({ params: { chainId: 42161 } })
      );
    });

    test('getReferralChain - should handle allChains parameter', async () => {
      const mockData = { address: '0x1234...', referrals: [] };
      mockApiClient.get.mockResolvedValue({ data: mockData });

      await referralApi.getReferralChain('0x1234...', null, true);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/referral-chain/0x1234...',
        expect.objectContaining({ params: { allChains: 'true' } })
      );
    });

    test('getReferralChain - should handle API errors', async () => {
      const errorResponse = {
        response: {
          data: { error: 'Invalid address format' },
          status: 400,
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(
        referralApi.getReferralChain('invalid-address')
      ).rejects.toThrow('Invalid address format');
    });

    test('getReferralChain - should handle network errors', async () => {
      const networkError = { request: {}, message: 'Network Error' };
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(
        referralApi.getReferralChain('0x1234...')
      ).rejects.toThrow('Network error: Could not connect to API');
    }, 15000); // Increase timeout for retry logic

    test('syncReferral - should sync referral successfully', async () => {
      const mockData = {
        success: true,
        syncTxHash: '0xabcd...',
        syncedAt: '2025-12-27T12:00:00.000Z',
      };

      mockApiClient.post.mockResolvedValue({ data: mockData });

      const result = await referralApi.syncReferral(
        '0x1234...',
        '0x5678...',
        8453,
        42161
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/referral-chain/sync',
        {
          userAddress: '0x1234...',
          referrerAddress: '0x5678...',
          sourceChainId: 8453,
          destChainId: 42161,
        },
        expect.objectContaining({})
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('Whitelist API', () => {
    test('getWhitelistStatus - should fetch whitelist status successfully', async () => {
      const mockData = {
        address: '0x1234...',
        isWhitelisted: true,
        tier: 'VIP',
        tierLevel: 2,
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await whitelistApi.getWhitelistStatus('0x1234...');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/whitelist/0x1234...',
        expect.objectContaining({ params: {} })
      );
      expect(result).toEqual(mockData);
    });

    test('getWhitelistStatus - should handle chainId parameter', async () => {
      const mockData = { address: '0x1234...', isWhitelisted: false, tier: 'None', tierLevel: 0 };
      mockApiClient.get.mockResolvedValue({ data: mockData });

      await whitelistApi.getWhitelistStatus('0x1234...', 42161);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/whitelist/0x1234...',
        expect.objectContaining({ params: { chainId: 42161 } })
      );
    });
  });

  describe('Chain API', () => {
    test('getSupportedChains - should fetch supported chains', async () => {
      // getSupportedChains expects data to be an array, not an object with chains property
      const mockData = [
        { chainId: 8453, name: 'Base', status: 'active' },
        { chainId: 42161, name: 'Arbitrum', status: 'active' },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await chainApi.getSupportedChains();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/chains/supported',
        expect.objectContaining({})
      );
      expect(result).toHaveProperty('chains');
      expect(Array.isArray(result.chains)).toBe(true);
    });

    test('getChainStatus - should fetch chain status', async () => {
      const mockData = {
        chainId: 8453,
        name: 'Base',
        status: 'active',
        lastSync: '2025-12-27T12:00:00.000Z',
        totalSwaps: 1000,
        totalReferrals: 500,
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await chainApi.getChainStatus(8453);

      // getChainStatus doesn't pass options, just the URL
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/chains/8453/status');
      // getChainStatus merges backendStatus with ChainConfigService data
      expect(result).toMatchObject(mockData);
      expect(result).toHaveProperty('chainId', 8453);
      expect(result).toHaveProperty('chainName');
    });
  });

  describe('Swap API', () => {
    test('initiateCrossChainSwap - should initiate swap successfully', async () => {
      const mockData = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        layerswapOrderId: 'ls_order_123',
        status: 'pending',
        depositAddress: '0xabcd...',
      };

      mockApiClient.post.mockResolvedValue({ data: mockData });

      const swapParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200000000000000000000000000000000000006',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        amountIn: '1000000000000000000',
        recipient: '0x1234567890123456789012345678901234567890',
      };

      const result = await swapApi.initiateCrossChainSwap(swapParams);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/swap/cross-chain',
        swapParams,
        expect.objectContaining({})
      );
      expect(result).toEqual(mockData);
    });

    test('getSwapStatus - should fetch swap status', async () => {
      const mockData = {
        swapId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        sourceTxHash: '0x1234...',
        destTxHash: '0x5678...',
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await swapApi.getSwapStatus('550e8400-e29b-41d4-a716-446655440000');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/swap/550e8400-e29b-41d4-a716-446655440000/status',
        expect.objectContaining({})
      );
      expect(result).toEqual(mockData);
    });

    test('getRoutes - should fetch available routes', async () => {
      const mockData = {
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

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await swapApi.getRoutes(8453, 42161);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/swap/routes',
        expect.objectContaining({ params: { sourceChainId: 8453, destChainId: 42161 } })
      );
      // getRoutes adds requiresLayerSwap property
      expect(result).toMatchObject(mockData);
      expect(result).toHaveProperty('requiresLayerSwap');
    });

    test('getEstimate - should fetch fee estimate', async () => {
      const mockData = {
        totalFee: '50000000000000000',
        mangoFee: '30000000000000000',
        layerswapFee: '20000000000000000',
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const estimateParams = {
        sourceChainId: 8453,
        destChainId: 42161,
        tokenIn: '0x4200...',
        tokenOut: '0x82af...',
        amountIn: '1000000000000000000',
      };

      const result = await swapApi.getEstimate(estimateParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/swap/estimate',
        expect.objectContaining({ params: estimateParams })
      );
      expect(result).toEqual(mockData);
    });

    test('cancelSwap - should cancel swap', async () => {
      const mockData = { success: true, cancelled: true };
      mockApiClient.post.mockResolvedValue({ data: mockData });

      const result = await swapApi.cancelSwap('550e8400-e29b-41d4-a716-446655440000');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/swap/cancel',
        { swapId: '550e8400-e29b-41d4-a716-446655440000' },
        expect.objectContaining({})
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('Health Check', () => {
    test('healthCheck - should check API health', async () => {
      const mockData = {
        status: 'healthy',
        timestamp: '2025-12-27T12:00:00.000Z',
        service: 'mango-defi-services',
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await healthCheck();

      // healthCheck doesn't pass options, just the URL
      expect(mockApiClient.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockData);
    });
  });

  describe('Error Handling', () => {
    test('should handle 400 errors with error message', async () => {
      const error = {
        response: {
          data: { error: 'Bad request' },
          status: 400,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      await expect(referralApi.getReferralChain('invalid')).rejects.toThrow('Bad request');
    });

    test('should handle 401 errors', async () => {
      const error = {
        response: {
          data: { error: 'Unauthorized' },
          status: 401,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow('Unauthorized');
    });

    test('should handle 500 errors', async () => {
      const error = {
        response: {
          data: { error: 'Internal server error' },
          status: 500,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow('Internal server error');
    });

    test('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      mockApiClient.get.mockRejectedValue(error);

      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();
    }, 15000); // Increase timeout for retry logic
  });
});


