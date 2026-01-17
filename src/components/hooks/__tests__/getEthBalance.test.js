/**
 * Complete Test Suite for useGetEthBalance Hook
 * 
 * Comprehensive tests for ETH balance fetching and formatting
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import useGetEthBalance from '../getEthBalance';

jest.mock('wagmi');
jest.mock('viem', () => ({
  formatUnits: jest.fn(),
}));

describe('useGetEthBalance Hook - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ETH Balance Fetching', () => {
    it('should return balance for ETH token', async () => {
      const mockBalance = {
        data: {
          value: BigInt('1500000000000000000'), // 1.5 ETH
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('1.5');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      await waitFor(() => {
        expect(useBalance).toHaveBeenCalledWith({
          address: userAddress,
          enabled: true,
        });
      });

      expect(formatUnits).toHaveBeenCalledWith(
        BigInt('1500000000000000000'),
        18
      );

      expect(result.current).toBe('1.50000');
    });

    it('should return 0.0 for non-ETH token', () => {
      useBalance.mockReturnValue({
        data: null,
        isSuccess: false,
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      expect(useBalance).toHaveBeenCalledWith({
        address: userAddress,
        enabled: false,
      });

      expect(result.current).toBe('0.0');
    });

    it('should return 0.0 when token is null', () => {
      useBalance.mockReturnValue({
        data: null,
        isSuccess: false,
      });

      const userAddress = '0x1234567890123456789012345678901234567890';

      const { result } = renderHook(() => useGetEthBalance(userAddress, null));

      expect(result.current).toBe('0.0');
    });

    it('should return 0.0 when userAddress is null', () => {
      useBalance.mockReturnValue({
        data: null,
        isSuccess: false,
      });

      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(null, token));

      expect(result.current).toBe('0.0');
    });
  });

  describe('Balance Formatting', () => {
    it('should format balance to 5 decimal places', async () => {
      const mockBalance = {
        data: {
          value: BigInt('1234567890000000000'), // 1.23456789 ETH
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('1.23456789');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1.23457');
      });
    });

    it('should handle zero balance', async () => {
      const mockBalance = {
        data: {
          value: BigInt('0'),
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('0');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('0.00000');
      });
    });

    it('should handle very small balance', async () => {
      const mockBalance = {
        data: {
          value: BigInt('1000000000000'), // 0.000001 ETH
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('0.000001');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('0.00000');
      });
    });

    it('should handle very large balance', async () => {
      const mockBalance = {
        data: {
          value: BigInt('1000000000000000000000000'), // 1,000,000 ETH
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('1000000');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1000000.00000');
      });
    });
  });

  describe('State Updates', () => {
    it('should update when balance changes', async () => {
      const mockBalance1 = {
        data: {
          value: BigInt('1000000000000000000'), // 1 ETH
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance1);
      formatUnits.mockReturnValue('1');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result, rerender } = renderHook(() => useGetEthBalance(userAddress, token));

      await waitFor(() => {
        expect(result.current).toBe('1.00000');
      });

      const mockBalance2 = {
        data: {
          value: BigInt('2000000000000000000'), // 2 ETH
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance2);
      formatUnits.mockReturnValue('2');

      rerender();

      await waitFor(() => {
        expect(result.current).toBe('2.00000');
      });
    });

    it('should update when token changes from ETH to non-ETH', () => {
      const mockBalance = {
        data: {
          value: BigInt('1000000000000000000'),
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('1');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const ethToken = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result, rerender } = renderHook(
        ({ token }) => useGetEthBalance(userAddress, token),
        { initialProps: { token: ethToken } }
      );

      const usdcToken = { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' };

      useBalance.mockReturnValue({
        data: null,
        isSuccess: false,
      });

      rerender({ token: usdcToken });

      expect(result.current).toBe('0.0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing token symbol', () => {
      useBalance.mockReturnValue({
        data: null,
        isSuccess: false,
      });

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });

    it('should handle case-insensitive ETH symbol', async () => {
      const mockBalance = {
        data: {
          value: BigInt('1000000000000000000'),
          decimals: 18,
        },
        isSuccess: true,
      };

      useBalance.mockReturnValue(mockBalance);
      formatUnits.mockReturnValue('1');

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'eth', address: '0x4200000000000000000000000000000000000006' };

      // Note: The implementation checks for exact match 'ETH'
      // This test documents current behavior
      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      expect(result.current).toBe('0.0'); // Case-sensitive
    });

    it('should handle undefined userAddress', () => {
      useBalance.mockReturnValue({
        data: null,
        isSuccess: false,
      });

      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(undefined, token));

      expect(result.current).toBe('0.0');
    });

    it('should handle when balance data is null', async () => {
      const mockBalance = {
        data: null,
        isSuccess: false,
      };

      useBalance.mockReturnValue(mockBalance);

      const userAddress = '0x1234567890123456789012345678901234567890';
      const token = { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006' };

      const { result } = renderHook(() => useGetEthBalance(userAddress, token));

      expect(result.current).toBe('0.0');
    });
  });
});

