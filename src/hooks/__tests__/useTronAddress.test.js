/**
 * Tests for useTronAddress Hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAccount } from 'wagmi';
import useTronAddress from '../useTronAddress';
import { mangoApi } from '../../services/mangoApi';

// Don't mock wagmi here - use global mock from setupTests.js

// Mock the API
jest.mock('../../services/mangoApi', () => ({
    mangoApi: {
        tron: {
            getTronAddress: jest.fn(),
            linkTronAddress: jest.fn(),
            validateTronAddress: jest.fn(),
            getEVMAddressFromTron: jest.fn(),
            getUserAddressMappings: jest.fn(),
        },
    },
}));

describe('useTronAddress Hook', () => {
    const mockEvmAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const mockTronAddress = 'TQn9Y2khEsLMWTg1J6VgSWFdqUp2YHXjXp';

    beforeEach(() => {
        jest.clearAllMocks();
        useAccount.mockReturnValue({
            address: mockEvmAddress,
        });
    });

    describe('Initial State', () => {
        test('should return initial state when no address', () => {
            useAccount.mockReturnValue({ address: null });
            
            const { result } = renderHook(() => useTronAddress());
            
            expect(result.current.tronAddress).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.hasTronAddress).toBe(false);
        });

        test('should fetch Tron address on mount when address exists', async () => {
            mangoApi.tron.getTronAddress.mockResolvedValue({
                tronAddress: mockTronAddress,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            expect(result.current.isLoading).toBe(true);
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            expect(result.current.tronAddress).toBe(mockTronAddress);
            expect(result.current.hasTronAddress).toBe(true);
            expect(mangoApi.tron.getTronAddress).toHaveBeenCalledWith(mockEvmAddress);
        });
    });

    describe('fetchTronAddress', () => {
        test('should fetch Tron address successfully', async () => {
            mangoApi.tron.getTronAddress.mockResolvedValue({
                tronAddress: mockTronAddress,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            await result.current.fetchTronAddress();
            
            expect(result.current.tronAddress).toBe(mockTronAddress);
            expect(mangoApi.tron.getTronAddress).toHaveBeenCalled();
        });

        test('should handle fetch error', async () => {
            const errorMessage = 'Failed to fetch';
            mangoApi.tron.getTronAddress.mockRejectedValue(new Error(errorMessage));
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            await result.current.fetchTronAddress();
            
            expect(result.current.error).toBe(errorMessage);
            expect(result.current.tronAddress).toBeNull();
        });

        test('should set tronAddress to null when no mapping found', async () => {
            mangoApi.tron.getTronAddress.mockResolvedValue({});
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            expect(result.current.tronAddress).toBeNull();
        });
    });

    describe('linkTronAddress', () => {
        test('should link Tron address successfully', async () => {
            mangoApi.tron.linkTronAddress.mockResolvedValue({
                success: true,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            const success = await result.current.linkTronAddress(mockTronAddress);
            
            expect(success).toBe(true);
            await waitFor(() => {
                expect(result.current.tronAddress).toBe(mockTronAddress);
            });
            expect(result.current.isLinking).toBe(false);
            expect(mangoApi.tron.linkTronAddress).toHaveBeenCalledWith(
                mockEvmAddress,
                mockTronAddress,
                null
            );
        });

        test('should link with userId', async () => {
            const userId = 'user123';
            mangoApi.tron.linkTronAddress.mockResolvedValue({
                success: true,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            await result.current.linkTronAddress(mockTronAddress, userId);
            
            expect(mangoApi.tron.linkTronAddress).toHaveBeenCalledWith(
                mockEvmAddress,
                mockTronAddress,
                userId
            );
        });

        test('should handle link error', async () => {
            const errorMessage = 'Failed to link';
            mangoApi.tron.linkTronAddress.mockResolvedValue({
                success: false,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            const success = await result.current.linkTronAddress(mockTronAddress);
            
            expect(success).toBe(false);
            await waitFor(() => {
                expect(result.current.error).toBe('Failed to link Tron address');
            });
            expect(result.current.isLinking).toBe(false);
        });

        test('should return false when no EVM address', async () => {
            useAccount.mockReturnValue({ address: null });
            
            const { result } = renderHook(() => useTronAddress());
            
            const success = await result.current.linkTronAddress(mockTronAddress);
            
            expect(success).toBe(false);
            await waitFor(() => {
                expect(result.current.error).toBe('No EVM address available');
            });
        });
    });

    describe('validateTronAddress', () => {
        test('should validate Tron address successfully', async () => {
            mangoApi.tron.validateTronAddress.mockResolvedValue({
                isValid: true,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            const isValid = await result.current.validateTronAddress(mockTronAddress);
            
            expect(isValid).toBe(true);
            expect(mangoApi.tron.validateTronAddress).toHaveBeenCalledWith(mockTronAddress);
        });

        test('should return false for invalid address', async () => {
            mangoApi.tron.validateTronAddress.mockResolvedValue({
                isValid: false,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            const isValid = await result.current.validateTronAddress('invalid');
            
            expect(isValid).toBe(false);
        });

        test('should return false for empty address', async () => {
            const { result } = renderHook(() => useTronAddress());
            
            const isValid = await result.current.validateTronAddress('');
            
            expect(isValid).toBe(false);
            expect(mangoApi.tron.validateTronAddress).not.toHaveBeenCalled();
        });

        test('should handle validation error', async () => {
            mangoApi.tron.validateTronAddress.mockRejectedValue(new Error('API Error'));
            
            const { result } = renderHook(() => useTronAddress());
            
            const isValid = await result.current.validateTronAddress(mockTronAddress);
            
            expect(isValid).toBe(false);
        });
    });

    describe('getEVMAddressFromTron', () => {
        test('should get EVM address from Tron address', async () => {
            mangoApi.tron.getEVMAddressFromTron.mockResolvedValue({
                evmAddress: mockEvmAddress,
            });
            
            const { result } = renderHook(() => useTronAddress());
            
            const evmAddr = await result.current.getEVMAddressFromTron(mockTronAddress);
            
            expect(evmAddr).toBe(mockEvmAddress);
            expect(mangoApi.tron.getEVMAddressFromTron).toHaveBeenCalledWith(mockTronAddress);
        });

        test('should return null when no mapping found', async () => {
            mangoApi.tron.getEVMAddressFromTron.mockResolvedValue({});
            
            const { result } = renderHook(() => useTronAddress());
            
            const evmAddr = await result.current.getEVMAddressFromTron(mockTronAddress);
            
            expect(evmAddr).toBeNull();
        });

        test('should return null for empty address', async () => {
            const { result } = renderHook(() => useTronAddress());
            
            const evmAddr = await result.current.getEVMAddressFromTron('');
            
            expect(evmAddr).toBeNull();
            expect(mangoApi.tron.getEVMAddressFromTron).not.toHaveBeenCalled();
        });

        test('should handle API error', async () => {
            mangoApi.tron.getEVMAddressFromTron.mockRejectedValue(new Error('API Error'));
            
            const { result } = renderHook(() => useTronAddress());
            
            const evmAddr = await result.current.getEVMAddressFromTron(mockTronAddress);
            
            expect(evmAddr).toBeNull();
        });
    });

    describe('getUserMappings', () => {
        test('should get user mappings successfully', async () => {
            const mockMappings = {
                evmAddress: mockEvmAddress,
                tronAddresses: [mockTronAddress],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            mangoApi.tron.getUserAddressMappings.mockResolvedValue(mockMappings);
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            const mappings = await result.current.getUserMappings();
            
            expect(mappings).toEqual(mockMappings);
            expect(mangoApi.tron.getUserAddressMappings).toHaveBeenCalledWith(mockEvmAddress);
        });

        test('should return null when no address', async () => {
            useAccount.mockReturnValue({ address: null });
            
            const { result } = renderHook(() => useTronAddress());
            
            const mappings = await result.current.getUserMappings();
            
            expect(mappings).toBeNull();
            expect(mangoApi.tron.getUserAddressMappings).not.toHaveBeenCalled();
        });

        test('should handle API error', async () => {
            mangoApi.tron.getUserAddressMappings.mockRejectedValue(new Error('API Error'));
            
            const { result } = renderHook(() => useTronAddress());
            
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
            
            const mappings = await result.current.getUserMappings();
            
            expect(mappings).toBeNull();
        });
    });

    describe('Address Changes', () => {
        test('should refetch when EVM address changes', async () => {
            const { rerender } = renderHook(
                ({ address }) => useTronAddress(address),
                {
                    initialProps: { address: mockEvmAddress },
                }
            );
            
            await waitFor(() => {
                expect(mangoApi.tron.getTronAddress).toHaveBeenCalledWith(mockEvmAddress);
            });
            
            const newAddress = '0x1234567890123456789012345678901234567890';
            mangoApi.tron.getTronAddress.mockResolvedValue({
                tronAddress: mockTronAddress,
            });
            
            rerender({ address: newAddress });
            
            await waitFor(() => {
                expect(mangoApi.tron.getTronAddress).toHaveBeenCalledWith(newAddress);
            });
        });

        test('should clear Tron address when EVM address is cleared', () => {
            const { rerender } = renderHook(
                ({ address }) => useTronAddress(address),
                {
                    initialProps: { address: mockEvmAddress },
                }
            );
            
            rerender({ address: null });
            
            const { result } = renderHook(() => useTronAddress(null));
            
            expect(result.current.tronAddress).toBeNull();
        });
    });
});

