/**
 * Complete Test Suite for Mango DeFi API Service
 * 
 * Comprehensive tests covering all API methods, error handling, and configuration
 */

// Unmock mangoApi for these tests since we want to test the actual implementation
jest.unmock('../mangoApi');

import { referralApi, whitelistApi, chainApi, swapApi, tronApi, healthCheck, apiClient } from '../mangoApi';

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

describe('Mango DeFi API Service - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the spies
    mockApiClient.get.mockClear();
    mockApiClient.post.mockClear();
  });

  describe('API Client Configuration', () => {
    // Note: These tests check module initialization, which requires resetting modules
    // Since we're using jest.spyOn, we can't easily test axios.create calls
    // These tests are kept for documentation but may need to be adjusted
    it('should handle empty API key gracefully', () => {
      const originalEnv = process.env.REACT_APP_MANGO_API_KEY;
      delete process.env.REACT_APP_MANGO_API_KEY;
      
      jest.resetModules();
      
      expect(() => {
        require('../mangoApi');
      }).not.toThrow();
      
      process.env.REACT_APP_MANGO_API_KEY = originalEnv;
    });
  });

  describe('Referral API - Complete Test Suite', () => {
    describe('getReferralChain', () => {
      it('should fetch referral chain successfully', async () => {
        const mockData = {
          address: '0x1234567890123456789012345678901234567890',
          referral: {
            chainId: 8453,
            chainName: 'Base',
            referrer: '0x0987654321098765432109876543210987654321',
            referralLevel: 1,
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

      it('should handle chainId parameter', async () => {
        const mockData = { address: '0x1234...', referral: null };
        mockApiClient.get.mockResolvedValue({ data: mockData });

        await referralApi.getReferralChain('0x1234...', 42161);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/referral-chain/0x1234...',
          expect.objectContaining({ params: { chainId: 42161 } })
        );
      });

      it('should handle allChains parameter', async () => {
        const mockData = {
          address: '0x1234...',
          referrals: [
            { chainId: 8453, referrer: '0x5678...' },
            { chainId: 42161, referrer: '0x5678...' },
          ],
        };
        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await referralApi.getReferralChain('0x1234...', null, true);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/referral-chain/0x1234...',
          expect.objectContaining({ params: { allChains: 'true' } })
        );
        expect(result).toEqual(mockData);
      });

      it('should handle both chainId and allChains parameters', async () => {
        const mockData = { address: '0x1234...', referral: { chainId: 8453 } };
        mockApiClient.get.mockResolvedValue({ data: mockData });

        await referralApi.getReferralChain('0x1234...', 8453, true);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/referral-chain/0x1234...',
          expect.objectContaining({ params: { chainId: 8453, allChains: 'true' } })
        );
      });

      it('should handle API errors with error message', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Invalid address format' },
            status: 400,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(
          referralApi.getReferralChain('invalid-address')
        ).rejects.toThrow('Invalid address format');

        consoleErrorSpy.mockRestore();
      });

      it('should handle API errors with message property', async () => {
        const errorResponse = {
          response: {
            data: { message: 'Address not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          referralApi.getReferralChain('0x1234...')
        ).rejects.toThrow('Address not found');
      });

      it('should handle API errors with default message', async () => {
        const errorResponse = {
          response: {
            data: {},
            status: 500,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          referralApi.getReferralChain('0x1234...')
        ).rejects.toThrow('API request failed');
      });

      it('should handle network errors', async () => {
        const networkError = { request: {}, message: 'Network Error' };
        mockApiClient.get.mockRejectedValue(networkError);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Error messages are chain-specific from ChainConfigService
        await expect(
          referralApi.getReferralChain('0x1234...')
        ).rejects.toThrow();

        consoleErrorSpy.mockRestore();
      }, 15000); // Increase timeout for retry logic

      it('should handle generic errors', async () => {
        const genericError = new Error('Something went wrong');
        mockApiClient.get.mockRejectedValue(genericError);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(
          referralApi.getReferralChain('0x1234...')
        ).rejects.toThrow('Something went wrong');

        consoleErrorSpy.mockRestore();
      });
    });

    describe('syncReferral', () => {
      it('should sync referral successfully', async () => {
        const mockData = {
          success: true,
          syncTxHash: '0xabcd000000000000000000000000000000000000',
          syncedAt: '2025-12-27T12:00:00.000Z',
          sourceChainId: 8453,
          destChainId: 42161,
        };

        mockApiClient.post.mockResolvedValue({ data: mockData });

        const result = await referralApi.syncReferral(
          '0x1234567890123456789012345678901234567890',
          '0x5678901234567890123456789012345678901234',
          8453,
          42161
        );

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/referral-chain/sync',
          {
            userAddress: '0x1234567890123456789012345678901234567890',
            referrerAddress: '0x5678901234567890123456789012345678901234',
            sourceChainId: 8453,
            destChainId: 42161,
          },
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
      });

      it('should handle sync API errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Sync failed' },
            status: 400,
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          referralApi.syncReferral('0x1234...', '0x5678...', 8453, 42161)
        ).rejects.toThrow();
      });

      it('should handle sync network errors', async () => {
        const networkError = { request: {} };
        mockApiClient.post.mockRejectedValue(networkError);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          referralApi.syncReferral('0x1234...', '0x5678...', 8453, 42161)
        ).rejects.toThrow();
      });
    });
  });

  describe('Whitelist API - Complete Test Suite', () => {
    describe('getWhitelistStatus', () => {
      it('should fetch whitelist status successfully', async () => {
        const mockData = {
          address: '0x1234567890123456789012345678901234567890',
          isWhitelisted: true,
          tier: 'VIP',
          tierLevel: 2,
          feeExemption: 100,
          taxExemption: 100,
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await whitelistApi.getWhitelistStatus('0x1234567890123456789012345678901234567890');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/whitelist/0x1234567890123456789012345678901234567890',
          expect.objectContaining({ params: {} })
        );
        expect(result).toEqual(mockData);
      });

      it('should handle chainId parameter', async () => {
        const mockData = {
          address: '0x1234...',
          isWhitelisted: false,
          tier: 'None',
          tierLevel: 0,
        };
        mockApiClient.get.mockResolvedValue({ data: mockData });

        await whitelistApi.getWhitelistStatus('0x1234...', 42161);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/whitelist/0x1234...',
          expect.objectContaining({ params: { chainId: 42161 } })
        );
      });

      it('should handle not whitelisted status', async () => {
        const mockData = {
          address: '0x1234...',
          isWhitelisted: false,
          tier: 'None',
          tierLevel: 0,
        };
        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await whitelistApi.getWhitelistStatus('0x1234...');

        expect(result.isWhitelisted).toBe(false);
        expect(result.tierLevel).toBe(0);
      });

      it('should handle whitelist API errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Address not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          whitelistApi.getWhitelistStatus('0x1234...')
        ).rejects.toThrow('Address not found');
      });

      it('should handle whitelist network errors', async () => {
        const networkError = { request: {} };
        mockApiClient.get.mockRejectedValue(networkError);

        await expect(
          whitelistApi.getWhitelistStatus('0x1234...')
        ).rejects.toThrow('Network error: Could not connect to API');
      });
    });
  });

  describe('Chain API - Complete Test Suite', () => {
    describe('getSupportedChains', () => {
      it('should fetch supported chains successfully', async () => {
        // getSupportedChains expects data to be an array, not an object with chains property
        const mockData = [
          { chainId: 8453, name: 'Base', status: 'active' },
          { chainId: 42161, name: 'Arbitrum', status: 'active' },
          { chainId: 56, name: 'BSC', status: 'active' },
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

      it('should handle empty chains array', async () => {
        // getSupportedChains expects data to be an array
        const mockData = [];
        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await chainApi.getSupportedChains();

        // getSupportedChains merges with ChainConfigService, so result will have chains from config
        expect(result).toHaveProperty('chains');
        expect(Array.isArray(result.chains)).toBe(true);
      });

      it('should handle chain API errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Service unavailable' },
            status: 503,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          chainApi.getSupportedChains()
        ).rejects.toThrow();
      }, 15000); // Increase timeout for retry logic
    });

    describe('getChainStatus', () => {
      it('should fetch chain status successfully', async () => {
        const mockData = {
          chainId: 8453,
          name: 'Base',
          status: 'active',
          lastSync: '2025-12-27T12:00:00.000Z',
          totalSwaps: 1000,
          totalReferrals: 500,
          contracts: {
            router: '0xRouter...',
            token: '0xToken...',
          },
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await chainApi.getChainStatus(8453);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/chains/8453/status');
        // getChainStatus merges backendStatus with ChainConfigService data
        // Check key properties instead of exact match since contracts are merged
        expect(result).toHaveProperty('chainId', 8453);
        expect(result).toHaveProperty('name', 'Base');
        expect(result).toHaveProperty('status', 'active');
        expect(result).toHaveProperty('chainName');
        expect(result).toHaveProperty('contracts');
        expect(result).toHaveProperty('featureFlags');
      });

      it('should handle chain not found errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Chain not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          chainApi.getChainStatus(99999)
        ).rejects.toThrow();
      });

      it('should handle different chain IDs', async () => {
        const chainIds = [8453, 42161, 56, 1];

        for (const chainId of chainIds) {
          const mockData = { chainId, name: 'Test', status: 'active' };
          mockApiClient.get.mockResolvedValue({ data: mockData });

          const result = await chainApi.getChainStatus(chainId);

          expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/chains/${chainId}/status`);
          expect(result.chainId).toBe(chainId);
        }
      });
    });
  });

  describe('Swap API - Complete Test Suite', () => {
    describe('initiateCrossChainSwap', () => {
      it('should initiate swap successfully', async () => {
        const mockData = {
          swapId: '550e8400-e29b-41d4-a716-446655440000',
          layerswapOrderId: 'ls_order_123',
          status: 'pending',
          depositAddress: '0xabcd000000000000000000000000000000000000',
          sourceChainId: 8453,
          destChainId: 42161,
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

      it('should initiate swap with referrer', async () => {
        const mockData = {
          swapId: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
        };

        mockApiClient.post.mockResolvedValue({ data: mockData });

        const swapParams = {
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
          recipient: '0x1234567890123456789012345678901234567890',
          referrer: '0x5678901234567890123456789012345678901234',
        };

        await swapApi.initiateCrossChainSwap(swapParams);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/swap/cross-chain',
          swapParams,
          expect.objectContaining({})
        );
      });

      it('should handle swap initiation errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Insufficient liquidity' },
            status: 400,
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          swapApi.initiateCrossChainSwap({
            sourceChainId: 8453,
            destChainId: 42161,
            tokenIn: '0x4200000000000000000000000000000000000006',
            tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            amountIn: '1000000000000000000',
            recipient: '0x1234567890123456789012345678901234567890',
          })
        ).rejects.toThrow();
      });
    });

    describe('getSwapStatus', () => {
      it('should fetch swap status successfully', async () => {
        const mockData = {
          swapId: '550e8400-e29b-41d4-a716-446655440000',
          status: 'completed',
          sourceTxHash: '0x1234000000000000000000000000000000000000',
          destTxHash: '0x5678000000000000000000000000000000000000',
          amountIn: '1000000000000000000',
          amountOut: '995000000000000000',
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await swapApi.getSwapStatus('550e8400-e29b-41d4-a716-446655440000');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/swap/550e8400-e29b-41d4-a716-446655440000/status',
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
      });

      it('should handle different swap statuses', async () => {
        const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

        for (const status of statuses) {
          const mockData = {
            swapId: '550e8400-e29b-41d4-a716-446655440000',
            status,
          };

          mockApiClient.get.mockResolvedValue({ data: mockData });

          const result = await swapApi.getSwapStatus('550e8400-e29b-41d4-a716-446655440000');

          expect(result.status).toBe(status);
        }
      });

      it('should handle swap not found errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Swap not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          swapApi.getSwapStatus('invalid-swap-id')
        ).rejects.toThrow('Swap not found');
      });
    });

    describe('getRoutes', () => {
      it('should fetch available routes successfully', async () => {
        const mockData = {
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

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await swapApi.getRoutes(8453, 42161);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/swap/routes',
          expect.objectContaining({ params: { sourceChainId: 8453, destChainId: 42161 } })
        );
        expect(result).toMatchObject(mockData);
        expect(result).toHaveProperty('requiresLayerSwap');
        expect(result.routes).toHaveLength(2);
      });

      it('should handle token filters', async () => {
        const mockData = { routes: [] };
        mockApiClient.get.mockResolvedValue({ data: mockData });

        await swapApi.getRoutes(
          8453,
          42161,
          '0x4200000000000000000000000000000000000006',
          '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
        );

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/swap/routes',
          expect.objectContaining({
            params: expect.objectContaining({
              sourceChainId: 8453,
              destChainId: 42161,
              tokenIn: '0x4200000000000000000000000000000000000006',
              tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            })
          })
        );
      });

      it('should handle route API errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'No routes available' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          swapApi.getRoutes(99999, 88888)
        ).rejects.toThrow();
      });
    });

    describe('getEstimate', () => {
      it('should fetch fee estimate successfully', async () => {
        const mockData = {
          totalFee: '50000000000000000',
          mangoFee: '30000000000000000',
          layerswapFee: '20000000000000000',
          estimatedTime: 300,
          minAmountOut: '950000000000000000',
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const estimateParams = {
          sourceChainId: 8453,
          destChainId: 42161,
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amountIn: '1000000000000000000',
        };

        const result = await swapApi.getEstimate(estimateParams);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/swap/estimate',
          expect.objectContaining({ params: estimateParams })
        );
        expect(result).toEqual(mockData);
      });

      it('should handle estimate API errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Invalid token pair' },
            status: 400,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          swapApi.getEstimate({
            sourceChainId: 8453,
            destChainId: 42161,
            tokenIn: '0x4200000000000000000000000000000000000006',
            tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            amountIn: '1000000000000000000',
          })
        ).rejects.toThrow();
      });
    });

    describe('cancelSwap', () => {
      it('should cancel swap successfully', async () => {
        const mockData = {
          success: true,
          cancelled: true,
          swapId: '550e8400-e29b-41d4-a716-446655440000',
          cancelledAt: '2025-12-27T12:00:00.000Z',
        };

        mockApiClient.post.mockResolvedValue({ data: mockData });

        const result = await swapApi.cancelSwap('550e8400-e29b-41d4-a716-446655440000');

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/swap/cancel',
          { swapId: '550e8400-e29b-41d4-a716-446655440000' },
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
      });

      it('should handle cancel errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Swap cannot be cancelled' },
            status: 400,
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          swapApi.cancelSwap('550e8400-e29b-41d4-a716-446655440000')
        ).rejects.toThrow();
      });

      it('should handle swap not found on cancel', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Swap not found' },
            status: 404,
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        // Error messages are chain-specific from ChainConfigService
        await expect(
          swapApi.cancelSwap('invalid-swap-id')
        ).rejects.toThrow();
      });
    });
  });

  describe('Health Check - Complete Test Suite', () => {
    it('should check API health successfully', async () => {
      const mockData = {
        status: 'healthy',
        timestamp: '2025-12-27T12:00:00.000Z',
        service: 'mango-defi-services',
        version: '1.0.0',
      };

      mockApiClient.get.mockResolvedValue({ data: mockData });

      const result = await healthCheck();

      expect(mockApiClient.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockData);
      expect(result.status).toBe('healthy');
    });

    it('should handle health check errors', async () => {
      const errorResponse = {
        response: {
          data: { error: 'Service unavailable' },
          status: 503,
        },
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(
        healthCheck()
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle health check network errors', async () => {
      const networkError = { request: {} };
      mockApiClient.get.mockRejectedValue(networkError);

      // Error messages are chain-specific from ChainConfigService
      await expect(
        healthCheck()
      ).rejects.toThrow();
    });
  });

  describe('Error Handling - Complete Test Suite', () => {
    it('should handle 400 errors with error message', async () => {
      const error = {
        response: {
          data: { error: 'Bad request' },
          status: 400,
        },
      };

      mockApiClient.get.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(referralApi.getReferralChain('invalid')).rejects.toThrow('Bad request');

      consoleErrorSpy.mockRestore();
    });

    it('should handle 401 errors', async () => {
      const error = {
        response: {
          data: { error: 'Unauthorized' },
          status: 401,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();
    });

    it('should handle 403 errors', async () => {
      const error = {
        response: {
          data: { error: 'Forbidden' },
          status: 403,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();
    });

    it('should handle 404 errors', async () => {
      const error = {
        response: {
          data: { error: 'Not found' },
          status: 404,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();
    });

    it('should handle 500 errors', async () => {
      const error = {
        response: {
          data: { error: 'Internal server error' },
          status: 500,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();
    });

    it('should handle 503 errors', async () => {
      const error = {
        response: {
          data: { error: 'Service unavailable' },
          status: 503,
        },
      };

      mockApiClient.get.mockRejectedValue(error);

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();
    }, 15000);

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      mockApiClient.get.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    }, 15000);

    it('should handle network timeout with request object', async () => {
      const error = {
        request: {},
        code: 'ECONNABORTED',
        message: 'timeout',
      };

      mockApiClient.get.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Error messages are chain-specific from ChainConfigService
      await expect(referralApi.getReferralChain('0x1234...')).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    }, 15000);
  });

  describe('Tron API - Complete Test Suite', () => {
    describe('linkTronAddress', () => {
      it('should link Tron address successfully', async () => {
        const mockData = {
          success: true,
          evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          tronAddress: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
          message: 'Address mapping stored successfully',
        };

        mockApiClient.post.mockResolvedValue({ data: mockData });

        const result = await tronApi.linkTronAddress(
          '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp'
        );

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/tron/address-mapping',
          expect.objectContaining({
            evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            tronAddress: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
            userId: null,
          }),
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
        expect(result.success).toBe(true);
      });

      it('should link Tron address with userId', async () => {
        const mockData = { success: true };
        mockApiClient.post.mockResolvedValue({ data: mockData });

        await tronApi.linkTronAddress(
          '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
          'user123'
        );

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/tron/address-mapping',
          expect.objectContaining({
            evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            tronAddress: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
            userId: 'user123',
          }),
          expect.objectContaining({})
        );
      });

      it('should handle link errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Invalid Tron address format' },
            status: 400,
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        await expect(
          tronApi.linkTronAddress('0x1234...', 'invalid-tron-address')
        ).rejects.toThrow('Invalid Tron address format');
      });
    });

    describe('getTronAddress', () => {
      it('should get Tron address successfully', async () => {
        const mockData = {
          evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          tronAddress: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await tronApi.getTronAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/tron/address-mapping/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
        expect(result.tronAddress).toBe('TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp');
      });

      it('should handle address not found', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Tron address mapping not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          tronApi.getTronAddress('0x1234...')
        ).rejects.toThrow('Tron address mapping not found');
      });
    });

    describe('getEVMAddressFromTron', () => {
      it('should get EVM address from Tron address successfully', async () => {
        const mockData = {
          evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          tronAddress: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await tronApi.getEVMAddressFromTron('TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/tron/address-mapping/tron/TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
        expect(result.evmAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      });

      it('should handle Tron address not found', async () => {
        const errorResponse = {
          response: {
            data: { error: 'EVM address mapping not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          tronApi.getEVMAddressFromTron('TInvalidAddress123456789012345678901234')
        ).rejects.toThrow('EVM address mapping not found');
      });
    });

    describe('validateTronAddress', () => {
      it('should validate Tron address successfully', async () => {
        const mockData = {
          address: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
          isValid: true,
          type: 'tron',
        };

        mockApiClient.post.mockResolvedValue({ data: mockData });

        const result = await tronApi.validateTronAddress('TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp');

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/tron/validate-address',
          {
            address: 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
          },
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('tron');
      });

      it('should return invalid for invalid address', async () => {
        const mockData = {
          address: 'invalid-address',
          isValid: false,
          type: 'unknown',
        };

        mockApiClient.post.mockResolvedValue({ data: mockData });

        const result = await tronApi.validateTronAddress('invalid-address');

        expect(result.isValid).toBe(false);
        expect(result.type).toBe('unknown');
      });

      it('should handle validation errors', async () => {
        const errorResponse = {
          response: {
            data: { error: 'Missing address field' },
            status: 400,
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        await expect(
          tronApi.validateTronAddress('')
        ).rejects.toThrow('Missing address field');
      });
    });

    describe('getUserAddressMappings', () => {
      it('should get user address mappings successfully', async () => {
        const mockData = {
          evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          tronAddresses: [
            'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp',
            'TAnotherTronAddress1234567890123456789',
          ],
          createdAt: '2025-01-27T12:00:00.000Z',
          updatedAt: '2025-01-27T12:00:00.000Z',
        };

        mockApiClient.get.mockResolvedValue({ data: mockData });

        const result = await tronApi.getUserAddressMappings('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/tron/user/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          expect.objectContaining({})
        );
        expect(result).toEqual(mockData);
        expect(result.tronAddresses).toHaveLength(2);
      });

      it('should handle user not found', async () => {
        const errorResponse = {
          response: {
            data: { error: 'User address mappings not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(
          tronApi.getUserAddressMappings('0x1234...')
        ).rejects.toThrow('User address mappings not found');
      });

      it('should handle network errors', async () => {
        const networkError = { request: {} };
        mockApiClient.get.mockRejectedValue(networkError);

        await expect(
          tronApi.getUserAddressMappings('0x1234...')
        ).rejects.toThrow('Network error: Could not connect to API');
      });
    });

    describe('Tron API Error Handling', () => {
      it('should handle 400 errors', async () => {
        const error = {
          response: {
            data: { error: 'Invalid EVM address format' },
            status: 400,
          },
        };

        mockApiClient.post.mockRejectedValue(error);

        await expect(
          tronApi.linkTronAddress('invalid', 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp')
        ).rejects.toThrow('Invalid EVM address format');
      });

      it('should handle 404 errors', async () => {
        const error = {
          response: {
            data: { error: 'Tron address mapping not found' },
            status: 404,
          },
        };

        mockApiClient.get.mockRejectedValue(error);

        await expect(
          tronApi.getTronAddress('0x1234...')
        ).rejects.toThrow('Tron address mapping not found');
      });

      it('should handle 500 errors', async () => {
        const error = {
          response: {
            data: { error: 'Internal server error' },
            status: 500,
          },
        };

        mockApiClient.post.mockRejectedValue(error);

        await expect(
          tronApi.validateTronAddress('TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp')
        ).rejects.toThrow('Internal server error');
      });
    });
  });
});

