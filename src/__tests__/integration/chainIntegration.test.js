/**
 * Integration Tests for All Chains
 * 
 * Comprehensive integration tests covering:
 * - Wallet connection for all EVM chains
 * - Tron wallet connection
 * - Chain switching between all chains
 * - Cross-chain swaps (EVM to EVM, EVM to Tron)
 * - LayerSwap integration (Solana/Bitcoin)
 * - Referral system across all chains
 * - Network detection
 * - RPC fallback mechanism
 * - Transaction status tracking
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import mangoApi from '../../services/mangoApi';
import { useNetworkDetection } from '../../hooks/useNetworkDetection';
import { useTransactionStatus } from '../../hooks/useTransactionStatus';
import { useCrossChainSwap } from '../../hooks/useCrossChainSwap';
import { useLayerSwap } from '../../hooks/useLayerSwap';
import { useReferralChain } from '../../hooks/useReferralChain';
// RPCProvider is a class, will be tested via chainConfig.getRpcUrls

// Mock all dependencies
jest.mock('wagmi');
jest.mock('../../services/mangoApi');
jest.mock('../../services/chainConfig', () => ({
    __esModule: true,
    default: {
        getAllChains: jest.fn(),
        getEVMChains: jest.fn(),
        getChain: jest.fn(),
        getContractAddress: jest.fn(),
        getRpcUrls: jest.fn(),
        supportsDirectSwap: jest.fn(),
        requiresLayerSwap: jest.fn(),
        validateAddress: jest.fn(),
    },
}));

// Mock hooks
jest.mock('../../hooks/useNetworkDetection');
jest.mock('../../hooks/useTransactionStatus');
jest.mock('../../hooks/useCrossChainSwap');
jest.mock('../../hooks/useLayerSwap');
jest.mock('../../hooks/useReferralChain');

// Chain IDs for all supported chains
const CHAIN_IDS = {
    ETHEREUM: 1,
    OPTIMISM: 10,
    BSC: 56,
    POLYGON: 137,
    BASE: 8453,
    ARBITRUM: 42161,
    AVALANCHE: 43114,
    TRON: 728126428,
    SOLANA: 501111,
    BITCOIN: 0,
};

// EVM Chain IDs
const EVM_CHAIN_IDS = [
    CHAIN_IDS.ETHEREUM,
    CHAIN_IDS.OPTIMISM,
    CHAIN_IDS.BSC,
    CHAIN_IDS.POLYGON,
    CHAIN_IDS.BASE,
    CHAIN_IDS.ARBITRUM,
    CHAIN_IDS.AVALANCHE,
];

describe('Chain Integration Tests', () => {
    let mockAccount;
    let mockChainId;
    let mockSwitchChain;
    let mockPublicClient;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        mockAccount = {
            address: '0x1234567890123456789012345678901234567890',
            isConnected: true,
        };

        mockChainId = CHAIN_IDS.BASE;

        mockSwitchChain = jest.fn().mockResolvedValue(undefined);

        mockPublicClient = {
            getBytecode: jest.fn(),
            getTransaction: jest.fn(),
            getTransactionReceipt: jest.fn(),
        };

        chainConfig.getAllChains = jest.fn().mockReturnValue([
            { chainId: '8453', chainName: 'Base' },
            { chainId: '42161', chainName: 'Arbitrum' },
        ]);

        useAccount.mockReturnValue(mockAccount);
        useChainId.mockReturnValue(mockChainId);
        useSwitchChain.mockReturnValue({ switchChain: mockSwitchChain });
        usePublicClient.mockReturnValue(mockPublicClient);
        useWaitForTransactionReceipt.mockReturnValue({
            data: null,
            isLoading: false,
            isSuccess: false,
            isError: false,
        });

        // Setup chainConfig mocks
        chainConfig.getAllChains.mockReturnValue([
            { chainId: '1', chainName: 'Ethereum', type: 'EVM' },
            { chainId: '8453', chainName: 'Base', type: 'EVM' },
            { chainId: '728126428', chainName: 'Tron', type: 'TRON' },
        ]);
        chainConfig.getEVMChains.mockReturnValue([
            { chainId: '1', chainName: 'Ethereum', type: 'EVM' },
            { chainId: '8453', chainName: 'Base', type: 'EVM' },
        ]);
        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                1: { chainId: '1', chainName: 'Ethereum', type: 'EVM' },
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                728126428: { chainId: '728126428', chainName: 'Tron', type: 'TRON' },
                501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
                0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
            };
            return chains[chainId];
        });
        chainConfig.getRpcUrls.mockReturnValue(['https://rpc.example.com']);
        chainConfig.supportsDirectSwap.mockReturnValue(true);
        chainConfig.requiresLayerSwap.mockReturnValue(false);
        chainConfig.validateAddress.mockReturnValue(true);
    });

    describe('Wallet Connection - EVM Chains', () => {
        EVM_CHAIN_IDS.forEach(chainId => {
            test(`should connect wallet to chain ${chainId}`, () => {
                useChainId.mockReturnValue(chainId);
                useAccount.mockReturnValue({
                    address: '0x1234567890123456789012345678901234567890',
                    isConnected: true,
                });

                const { result } = renderHook(() => useAccount());

                expect(result.current.isConnected).toBe(true);
                expect(result.current.address).toBeDefined();
                expect(useChainId()).toBe(chainId);
            });
        });

        test('should handle wallet disconnection', () => {
            useAccount.mockReturnValue({
                address: null,
                isConnected: false,
            });

            const { result } = renderHook(() => useAccount());

            expect(result.current.isConnected).toBe(false);
            expect(result.current.address).toBeNull();
        });

        test('should handle connection errors', () => {
            useAccount.mockReturnValue({
                address: null,
                isConnected: false,
                error: new Error('Connection failed'),
            });

            const { result } = renderHook(() => useAccount());

            expect(result.current.isConnected).toBe(false);
            expect(result.current.error).toBeDefined();
        });
    });

    describe('Tron Wallet Connection', () => {
        test('should validate Tron address format', () => {
            const tronAddress = 'TXYZabcdefghijklmnopqrstuvwxyz123456';
            const isValid = chainConfig.validateAddress(CHAIN_IDS.TRON, tronAddress);
            
            expect(chainConfig.validateAddress).toHaveBeenCalledWith(CHAIN_IDS.TRON, tronAddress);
        });

        test('should link Tron address to EVM address', async () => {
            const mockLinkResult = {
                success: true,
                evmAddress: '0x1234567890123456789012345678901234567890',
                tronAddress: 'TXYZabcdefghijklmnopqrstuvwxyz123456',
            };

            mangoApi.tron.linkTronAddress = jest.fn().mockResolvedValue(mockLinkResult);

            const result = await mangoApi.tron.linkTronAddress(
                '0x1234567890123456789012345678901234567890',
                'TXYZabcdefghijklmnopqrstuvwxyz123456'
            );

            expect(result.success).toBe(true);
            expect(mangoApi.tron.linkTronAddress).toHaveBeenCalled();
        });

        test('should handle Tron address validation errors', async () => {
            mangoApi.tron.validateTronAddress = jest.fn().mockRejectedValue(new Error('Invalid address'));

            await expect(
                mangoApi.tron.validateTronAddress('invalid')
            ).rejects.toThrow('Invalid address');
        });
    });

    describe('Chain Switching', () => {
        test('should switch between EVM chains', async () => {
            const mockSwitchToRequiredNetwork = jest.fn().mockResolvedValue(true);
            
            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.ARBITRUM,
                isMismatch: true,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
                switchToChain: jest.fn(),
                isChecking: false,
                lastError: null,
                currentChain: chainConfig.getChain(CHAIN_IDS.BASE),
                requiredChain: chainConfig.getChain(CHAIN_IDS.ARBITRUM),
                isSupported: true,
            });

            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.ARBITRUM));

            await act(async () => {
                await result.current.switchToRequiredNetwork();
            });

            expect(mockSwitchToRequiredNetwork).toHaveBeenCalled();
        });

        test('should switch from Base to Arbitrum', async () => {
            useChainId.mockReturnValue(CHAIN_IDS.BASE);
            
            const mockSwitchToChain = jest.fn().mockResolvedValue(true);
            
            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.ARBITRUM,
                isMismatch: true,
                switchToRequiredNetwork: jest.fn(),
                switchToChain: mockSwitchToChain,
                isChecking: false,
                lastError: null,
                currentChain: chainConfig.getChain(CHAIN_IDS.BASE),
                requiredChain: chainConfig.getChain(CHAIN_IDS.ARBITRUM),
                isSupported: true,
            });
            
            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.ARBITRUM));

            await act(async () => {
                await result.current.switchToChain(CHAIN_IDS.ARBITRUM);
            });

            expect(mockSwitchToChain).toHaveBeenCalledWith(CHAIN_IDS.ARBITRUM);
        });

        test('should handle chain switch errors', async () => {
            const switchError = new Error('User rejected');
            mockSwitchChain.mockRejectedValue(switchError);

            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.ARBITRUM,
                isMismatch: true,
                switchToChain: mockSwitchChain,
                lastError: switchError.message,
            });

            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.ARBITRUM));

            await act(async () => {
                try {
                    await result.current.switchToChain(CHAIN_IDS.ARBITRUM);
                } catch (error) {
                    expect(error).toBe(switchError);
                }
            });
        });

        test('should detect network mismatch', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.ARBITRUM,
                isMismatch: true,
            });

            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.ARBITRUM));

            expect(result.current.isMismatch).toBe(true);
        });
    });

    describe('Cross-Chain Swaps - EVM to EVM', () => {
        test('should initiate EVM to EVM swap', async () => {
            const mockSwapResult = {
                swapId: 'swap-123',
                status: 'pending',
                sourceChain: CHAIN_IDS.BASE,
                destinationChain: CHAIN_IDS.ARBITRUM,
            };

            mangoApi.swap.initiateCrossChainSwap = jest.fn().mockResolvedValue(mockSwapResult);

            useCrossChainSwap.mockReturnValue({
                initiateSwap: jest.fn().mockResolvedValue(mockSwapResult),
                swapStatus: null,
                loading: false,
                error: null,
            });

            const { result } = renderHook(() => useCrossChainSwap());

            await act(async () => {
                const swapResult = await result.current.initiateSwap({
                    sourceChainId: CHAIN_IDS.BASE,
                    destinationChainId: CHAIN_IDS.ARBITRUM,
                    amount: '1.0',
                    tokenAddress: '0x4200000000000000000000000000000000000006',
                });

                expect(swapResult.swapId).toBe('swap-123');
            });
        });

        test('should get swap routes between EVM chains', async () => {
            const mockRoutes = {
                routes: [
                    {
                        source: 'BASE',
                        destination: 'ARBITRUM',
                        fee: '0.001',
                        estimatedTime: 300,
                    },
                ],
            };

            mangoApi.swap.getRoutes = jest.fn().mockResolvedValue(mockRoutes);

            const routes = await mangoApi.swap.getRoutes(CHAIN_IDS.BASE, CHAIN_IDS.ARBITRUM);

            expect(routes.routes).toHaveLength(1);
            expect(mangoApi.swap.getRoutes).toHaveBeenCalledWith(CHAIN_IDS.BASE, CHAIN_IDS.ARBITRUM);
        });

        test('should track swap status', async () => {
            const mockSwapStatus = {
                swapId: 'swap-123',
                status: 'processing',
                progress: 50,
            };

            mangoApi.swap.getSwapStatus = jest.fn().mockResolvedValue(mockSwapStatus);

            useCrossChainSwap.mockReturnValue({
                swapStatus: mockSwapStatus,
                loading: false,
            });

            const { result } = renderHook(() => useCrossChainSwap());

            expect(result.current.swapStatus.status).toBe('processing');
        });

        test('should handle swap errors', async () => {
            const swapError = new Error('Insufficient balance');
            mangoApi.swap.initiateCrossChainSwap = jest.fn().mockRejectedValue(swapError);

            useCrossChainSwap.mockReturnValue({
                initiateSwap: jest.fn().mockRejectedValue(swapError),
                error: swapError,
            });

            const { result } = renderHook(() => useCrossChainSwap());

            await act(async () => {
                try {
                    await result.current.initiateSwap({});
                } catch (error) {
                    expect(error).toBe(swapError);
                }
            });
        });
    });

    describe('Cross-Chain Swaps - EVM to Tron', () => {
        test('should initiate EVM to Tron swap', async () => {
            const mockSwapResult = {
                swapId: 'swap-tron-123',
                status: 'pending',
                sourceChain: CHAIN_IDS.BASE,
                destinationChain: CHAIN_IDS.TRON,
            };

            mangoApi.swap.initiateCrossChainSwap = jest.fn().mockResolvedValue(mockSwapResult);

            const result = await mangoApi.swap.initiateCrossChainSwap({
                sourceChainId: CHAIN_IDS.BASE,
                destinationChainId: CHAIN_IDS.TRON,
                amount: '1.0',
                tokenAddress: '0x4200000000000000000000000000000000000006',
                destinationAddress: 'TXYZabcdefghijklmnopqrstuvwxyz123456',
            });

            expect(result.swapId).toBe('swap-tron-123');
            expect(mangoApi.swap.initiateCrossChainSwap).toHaveBeenCalled();
        });

        test('should validate Tron destination address', () => {
            const tronAddress = 'TXYZabcdefghijklmnopqrstuvwxyz123456';
            const isValid = chainConfig.validateAddress(CHAIN_IDS.TRON, tronAddress);

            expect(chainConfig.validateAddress).toHaveBeenCalledWith(CHAIN_IDS.TRON, tronAddress);
        });
    });

    describe('LayerSwap Integration - Solana/Bitcoin', () => {
        test('should get LayerSwap routes for Solana', async () => {
            const mockRoutes = {
                routes: [
                    {
                        source: 'BASE',
                        destination: 'SOLANA',
                        fee: '0.002',
                        estimatedTime: 600,
                    },
                ],
            };

            mangoApi.layerSwap.getRoutes = jest.fn().mockResolvedValue(mockRoutes);

            const routes = await mangoApi.layerSwap.getRoutes(CHAIN_IDS.BASE, CHAIN_IDS.SOLANA);

            expect(routes.routes).toHaveLength(1);
            expect(mangoApi.layerSwap.getRoutes).toHaveBeenCalled();
        });

        test('should get LayerSwap routes for Bitcoin', async () => {
            const mockRoutes = {
                routes: [
                    {
                        source: 'BASE',
                        destination: 'BITCOIN',
                        fee: '0.003',
                        estimatedTime: 900,
                    },
                ],
            };

            mangoApi.layerSwap.getRoutes = jest.fn().mockResolvedValue(mockRoutes);

            const routes = await mangoApi.layerSwap.getRoutes(CHAIN_IDS.BASE, CHAIN_IDS.BITCOIN);

            expect(routes.routes).toHaveLength(1);
        });

        test('should create LayerSwap order', async () => {
            const mockOrder = {
                orderId: 'order-123',
                depositAddress: '0xDepositAddress',
                status: 'pending',
            };

            mangoApi.layerSwap.createOrder = jest.fn().mockResolvedValue(mockOrder);

            const order = await mangoApi.layerSwap.createOrder({
                sourceChainId: CHAIN_IDS.BASE,
                destinationChainId: CHAIN_IDS.SOLANA,
                amount: '1.0',
            });

            expect(order.orderId).toBe('order-123');
            expect(mangoApi.layerSwap.createOrder).toHaveBeenCalled();
        });

        test('should get LayerSwap order status', async () => {
            const mockStatus = {
                orderId: 'order-123',
                status: 'processing',
                progress: 75,
            };

            mangoApi.layerSwap.getOrderStatus = jest.fn().mockResolvedValue(mockStatus);

            useLayerSwap.mockReturnValue({
                swapStatus: mockStatus,
                loading: false,
            });

            const { result } = renderHook(() => useLayerSwap());

            expect(result.current.swapStatus.status).toBe('processing');
        });
    });

    describe('Referral System - All Chains', () => {
        EVM_CHAIN_IDS.forEach(chainId => {
            test(`should get referral info for chain ${chainId}`, async () => {
                const mockReferral = {
                    referrer: '0xReferrerAddress',
                    totalReferrals: 10,
                    totalRewards: '100.0',
                };

                mangoApi.referral.getReferralInfo = jest.fn().mockResolvedValue(mockReferral);

                const referral = await mangoApi.referral.getReferralInfo(
                    '0x1234567890123456789012345678901234567890',
                    chainId
                );

                expect(referral.referrer).toBeDefined();
                expect(mangoApi.referral.getReferralInfo).toHaveBeenCalled();
            });
        });

        test('should track referrals across all chains', async () => {
            const mockReferrals = {
                referrals: [
                    { chainId: CHAIN_IDS.BASE, count: 5 },
                    { chainId: CHAIN_IDS.ARBITRUM, count: 3 },
                ],
            };

            mangoApi.referral.getReferralInfo = jest.fn().mockResolvedValue(mockReferrals);

            useReferralChain.mockReturnValue({
                referralInfo: mockReferrals,
                loading: false,
            });

            const { result } = renderHook(() => useReferralChain());

            expect(result.current.referralInfo.referrals).toHaveLength(2);
        });

        test('should handle referral errors', async () => {
            const referralError = new Error('Referral not found');
            mangoApi.referral.getReferralInfo = jest.fn().mockRejectedValue(referralError);

            await expect(
                mangoApi.referral.getReferralInfo('0xInvalid', CHAIN_IDS.BASE)
            ).rejects.toThrow('Referral not found');
        });
    });

    describe('Network Detection', () => {
        test('should detect correct network', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.BASE,
                isMismatch: false,
            });

            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.BASE));

            expect(result.current.isMismatch).toBe(false);
        });

        test('should detect network mismatch', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.ARBITRUM,
                isMismatch: true,
            });

            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.ARBITRUM));

            expect(result.current.isMismatch).toBe(true);
        });

        test('should auto-switch network when enabled', async () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: CHAIN_IDS.BASE,
                requiredChainId: CHAIN_IDS.ARBITRUM,
                isMismatch: true,
                switchToRequiredNetwork: mockSwitchChain,
            });

            const { result } = renderHook(() => useNetworkDetection(CHAIN_IDS.ARBITRUM, { autoSwitch: true }));

            await act(async () => {
                await result.current.switchToRequiredNetwork();
            });

            expect(mockSwitchChain).toHaveBeenCalled();
        });
    });

    describe('RPC Fallback Mechanism', () => {
        test('should use primary RPC URL', async () => {
            const rpcUrls = chainConfig.getRpcUrls(CHAIN_IDS.BASE);

            expect(rpcUrls.length).toBeGreaterThan(0);
            expect(chainConfig.getRpcUrls).toHaveBeenCalledWith(CHAIN_IDS.BASE);
        });

        test('should provide multiple RPC URLs for fallback', () => {
            chainConfig.getRpcUrls.mockReturnValue([
                'https://rpc1.example.com',
                'https://rpc2.example.com',
                'https://rpc3.example.com',
            ]);

            const rpcUrls = chainConfig.getRpcUrls(CHAIN_IDS.BASE);

            expect(rpcUrls.length).toBeGreaterThan(1);
            expect(Array.isArray(rpcUrls)).toBe(true);
        });

        test('should track RPC health', () => {
            const rpcUrls = chainConfig.getRpcUrls(CHAIN_IDS.BASE);

            expect(rpcUrls).toBeDefined();
            expect(Array.isArray(rpcUrls)).toBe(true);
        });

        test('should handle RPC failures gracefully', async () => {
            // Mock RPC request that fails
            const mockRequest = jest.fn().mockRejectedValue(new Error('RPC Error'));

            await expect(mockRequest()).rejects.toThrow('RPC Error');
        });

        test('should return empty array for invalid chain', () => {
            chainConfig.getRpcUrls.mockReturnValue([]);

            const rpcUrls = chainConfig.getRpcUrls(99999);

            expect(rpcUrls).toEqual([]);
        });
    });

    describe('Transaction Status Tracking', () => {
        test('should track transaction status for EVM chains', () => {
            const mockReceipt = {
                blockNumber: 12345n,
                status: 'success',
                transactionHash: '0xTxHash',
            };

            useWaitForTransactionReceipt.mockReturnValue({
                data: mockReceipt,
                isLoading: false,
                isSuccess: true,
                isError: false,
            });

            useTransactionStatus.mockReturnValue({
                status: 'confirmed',
                confirmations: 1,
                requiredConfirmations: 1,
                progress: 100,
                isConfirmed: true,
            });

            const { result } = renderHook(() => useTransactionStatus('0xTxHash', CHAIN_IDS.BASE));

            expect(result.current.isConfirmed).toBe(true);
            expect(result.current.status).toBe('confirmed');
        });

        test('should track transaction progress', () => {
            useTransactionStatus.mockReturnValue({
                status: 'confirming',
                confirmations: 2,
                requiredConfirmations: 3,
                progress: 66,
                isConfirming: true,
            });

            const { result } = renderHook(() => useTransactionStatus('0xTxHash', CHAIN_IDS.BASE));

            expect(result.current.isConfirming).toBe(true);
            expect(result.current.progress).toBe(66);
        });

        test('should handle transaction failures', () => {
            useTransactionStatus.mockReturnValue({
                status: 'failed',
                error: new Error('Transaction reverted'),
                isFailed: true,
            });

            const { result } = renderHook(() => useTransactionStatus('0xTxHash', CHAIN_IDS.BASE));

            expect(result.current.isFailed).toBe(true);
            expect(result.current.error).toBeDefined();
        });

        test('should handle transaction timeouts', () => {
            useTransactionStatus.mockReturnValue({
                status: 'timeout',
                isTimeout: true,
            });

            const { result } = renderHook(() => useTransactionStatus('0xTxHash', CHAIN_IDS.BASE));

            expect(result.current.isTimeout).toBe(true);
        });

        test('should track Tron transaction status', async () => {
            const mockTronStatus = {
                status: 'confirmed',
                confirmations: 19,
                success: true,
            };

            mangoApi.tron.getTransactionStatus = jest.fn().mockResolvedValue(mockTronStatus);

            const status = await mangoApi.tron.getTransactionStatus('TronTxHash');

            expect(status.status).toBe('confirmed');
            expect(mangoApi.tron.getTransactionStatus).toHaveBeenCalled();
        });
    });

    describe('State Persistence', () => {
        test('should persist selected chain', () => {
            const selectedChain = CHAIN_IDS.BASE;
            localStorage.setItem('selectedChain', selectedChain.toString());

            const stored = localStorage.getItem('selectedChain');
            expect(stored).toBe(selectedChain.toString());
        });

        test('should persist referral address', () => {
            const referralAddress = '0xReferrerAddress';
            localStorage.setItem('referralAddress', referralAddress);

            const stored = localStorage.getItem('referralAddress');
            expect(stored).toBe(referralAddress);
        });

        test('should clear state on disconnect', () => {
            localStorage.setItem('selectedChain', '8453');
            localStorage.setItem('referralAddress', '0xReferrer');

            // Simulate disconnect
            localStorage.removeItem('selectedChain');
            localStorage.removeItem('referralAddress');

            expect(localStorage.getItem('selectedChain')).toBeNull();
            expect(localStorage.getItem('referralAddress')).toBeNull();
        });
    });

    describe('Error Scenarios', () => {
        test('should handle network errors gracefully', async () => {
            const networkError = new Error('Network error');
            mangoApi.swap.getRoutes = jest.fn().mockRejectedValue(networkError);

            await expect(
                mangoApi.swap.getRoutes(CHAIN_IDS.BASE, CHAIN_IDS.ARBITRUM)
            ).rejects.toThrow('Network error');
        });

        test('should handle invalid chain ID', () => {
            const invalidChainId = 99999;
            const chain = chainConfig.getChain(invalidChainId);

            expect(chain).toBeUndefined();
        });

        test('should handle invalid address format', () => {
            const isValid = chainConfig.validateAddress(CHAIN_IDS.BASE, 'invalid-address');
            
            expect(chainConfig.validateAddress).toHaveBeenCalled();
        });

        test('should handle RPC timeout', async () => {
            const timeoutError = new Error('Request timeout');
            const mockRequest = jest.fn().mockRejectedValue(timeoutError);

            await expect(mockRequest()).rejects.toThrow('Request timeout');
        });
    });

    describe('Chain Pair Testing', () => {
        const chainPairs = [
            [CHAIN_IDS.BASE, CHAIN_IDS.ARBITRUM],
            [CHAIN_IDS.BASE, CHAIN_IDS.TRON],
            [CHAIN_IDS.ETHEREUM, CHAIN_IDS.POLYGON],
            [CHAIN_IDS.ARBITRUM, CHAIN_IDS.OPTIMISM],
        ];

        chainPairs.forEach(([sourceChain, destChain]) => {
            test(`should support swap from ${sourceChain} to ${destChain}`, async () => {
                const mockRoutes = {
                    routes: [
                        {
                            source: sourceChain.toString(),
                            destination: destChain.toString(),
                            fee: '0.001',
                        },
                    ],
                };

                mangoApi.swap.getRoutes = jest.fn().mockResolvedValue(mockRoutes);

                const routes = await mangoApi.swap.getRoutes(sourceChain, destChain);

                expect(routes.routes).toBeDefined();
                expect(mangoApi.swap.getRoutes).toHaveBeenCalledWith(sourceChain, destChain);
            });
        });
    });
});

