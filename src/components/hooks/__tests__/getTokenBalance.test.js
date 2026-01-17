/**
 * Complete Test Suite for useTokenBalance Hook
 * 
 * Comprehensive tests for token balance fetching and formatting
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import useTokenBalance from '../getTokenBalance';

// Don't mock wagmi here - use global mock from setupTests.js
jest.mock('viem', () => ({
  formatUnits: jest.fn(),
  parseAbi: jest.fn(() => []),
}));

describe('useTokenBalance Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Balance Fetching', () => {
    it('should fetch token balance successfully', async () => {
      const mockBalance = BigInt('1000000000000000000'); // 1 token (18 decimals)

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1.0');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(useReadContract).toHaveBeenCalledWith(
          expect.objectContaining({
            address: token.address,
            functionName: 'balanceOf',
            args: [userAddress],
          })
        );
      });

      expect(formatUnits).toHaveBeenCalledWith(mockBalance);

      await waitFor(() => {
        expect(result.current).toBe('1.0');
      });
    });

    it('should return 0.0 when token is null', () => {
      useReadContract.mockReturnValue({
        data: null,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      const userAddress = '0x1234567890123456789012345678901234567890';

      const { result } = renderHook(() => useTokenBalance(userAddress, null));

      expect(result.current).toBe('0.0');
    });

    it('should return 0.0 when userAddress is null', () => {
      useReadContract.mockReturnValue({
        data: null,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(null, token));

      expect(result.current).toBe('0.0');
    });

    it('should return 0.0 when token address is missing', () => {
      useReadContract.mockReturnValue({
        data: null,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });
  });

  describe('Balance Formatting', () => {
    it('should format balance correctly for 18 decimals', async () => {
      const mockBalance = BigInt('1234567890000000000'); // 1.23456789 tokens

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1.23456789');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1.23456789');
      });
    });

    it('should format balance correctly for 6 decimals (USDC)', async () => {
      const mockBalance = BigInt('1234567890'); // 1234.56789 USDC (6 decimals)

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1234.56789');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1234.56789');
      });
    });

    it('should handle zero balance', async () => {
      const mockBalance = BigInt('0');

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('0');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('0.0');
      });
    });

    it('should handle very small balance', async () => {
      const mockBalance = BigInt('1000000000000'); // 0.000001 tokens (18 decimals)

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('0.000001');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('0.000001');
      });
    });

    it('should handle very large balance', async () => {
      const mockBalance = BigInt('1000000000000000000000000'); // 1,000,000 tokens

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1000000');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1000000');
      });
    });
  });

  describe('State Updates', () => {
    it('should update when balance changes', async () => {
      const mockBalance1 = BigInt('1000000000000000000'); // 1 token

      useReadContract.mockReturnValue({
        data: mockBalance1,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1.0');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result, rerender } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1.0');
      });

      const mockBalance2 = BigInt('2000000000000000000'); // 2 tokens

      useReadContract.mockReturnValue({
        data: mockBalance2,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('2.0');

      rerender();

      await waitFor(() => {
        expect(result.current).toBe('2.0');
      });
    });

    it('should update when token changes', async () => {
      const mockBalance = BigInt('1000000000000000000');

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1.0');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token1 = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result, rerender } = renderHook(
        ({ token }) => useTokenBalance(userAddress, token),
        { initialProps: { token: token1 } }
      );

      await waitFor(() => {
        expect(result.current).toBe('1.0');
      });

      const token2 = {
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        symbol: 'WETH',
      };

      rerender({ token: token2 });

      await waitFor(() => {
        expect(useReadContract).toHaveBeenCalledWith(
          expect.objectContaining({
            address: token2.address,
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle balance fetch errors', () => {
      useReadContract.mockReturnValue({
        data: null,
        isError: true,
        isLoading: false,
        refetch: jest.fn(),
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });

    it('should handle loading state', () => {
      useReadContract.mockReturnValue({
        data: null,
        isError: false,
        isLoading: true,
        refetch: jest.fn(),
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined balance data', () => {
      useReadContract.mockReturnValue({
        data: undefined,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });

    it('should handle undefined token address', () => {
      useReadContract.mockReturnValue({
        data: null,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: undefined,
        decimals: 18,
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });

    it('should handle missing decimals in token', async () => {
      const mockBalance = BigInt('1000000000000000000');

      useReadContract.mockReturnValue({
        data: mockBalance,
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
      });

      formatUnits.mockReturnValue('1.0');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
      };

      const { result } = renderHook(() => useTokenBalance(userAddress, token));

      await waitFor(() => {
        expect(formatUnits).toHaveBeenCalled();
      });
    });
  });
});

