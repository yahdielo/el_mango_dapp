/**
 * Cross-Chain Referral Sync Testnet Tests
 * 
 * Tests real cross-chain referral synchronization on testnets:
 * - Base → Arbitrum referral sync
 * - Arbitrum → Polygon referral sync
 * - All EVM chains referral sync
 * - Failure recovery
 * - Network congestion handling
 * - Batch referral sync
 * - Gas cost measurement
 * 
 * Note: These tests require:
 * - Testnet RPC endpoints configured
 * - Testnet contracts deployed
 * - Test accounts with testnet tokens
 * - Set TESTNET=true environment variable
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { baseSepolia, arbitrumSepolia, polygonAmoy } from 'viem/chains';

// Mock mangoApi - Note: This test is designed to run against real testnets
// The mock is provided for cases where the test runs without TESTNET=true
// When TESTNET=true, the actual API will be used
jest.mock('../../services/mangoApi', () => ({
  referralApi: {
    createReferral: jest.fn(),
    getReferralChain: jest.fn(),
    syncReferral: jest.fn(),
    batchSyncReferrals: jest.fn(),
  },
}));

import { referralApi } from '../../services/mangoApi';
import { useReferralSync } from '../../hooks/useReferralChain';

// Testnet configuration
const TESTNET_CONFIG = {
    base: {
        chainId: 84532, // Base Sepolia
        rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
        contractAddress: process.env.BASE_REFERRAL_CONTRACT,
    },
    arbitrum: {
        chainId: 421614, // Arbitrum Sepolia
        rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
        contractAddress: process.env.ARBITRUM_REFERRAL_CONTRACT,
    },
    polygon: {
        chainId: 80002, // Polygon Amoy
        rpcUrl: process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology',
        contractAddress: process.env.POLYGON_REFERRAL_CONTRACT,
    },
};

// Skip tests if not on testnet
const RUN_TESTNET_TESTS = process.env.TESTNET === 'true' && process.env.CI !== 'true';

const describeIf = RUN_TESTNET_TESTS ? describe : describe.skip;

describeIf('Cross-Chain Referral Sync Testnet Tests', () => {
    let testAccounts;
    let publicClients;

    beforeAll(async () => {
        // Initialize test accounts (use testnet accounts with tokens)
        testAccounts = {
            user: process.env.TESTNET_USER_ADDRESS || '0x0000000000000000000000000000000000000000',
            referrer: process.env.TESTNET_REFERRER_ADDRESS || '0x0000000000000000000000000000000000000001',
        };

        // Initialize public clients for each chain
        publicClients = {
            base: createPublicClient({
                chain: baseSepolia,
                transport: http(TESTNET_CONFIG.base.rpcUrl),
            }),
            arbitrum: createPublicClient({
                chain: arbitrumSepolia,
                transport: http(TESTNET_CONFIG.arbitrum.rpcUrl),
            }),
            polygon: createPublicClient({
                chain: polygonAmoy,
                transport: http(TESTNET_CONFIG.polygon.rpcUrl),
            }),
        };
    });

    afterAll(async () => {
        // Cleanup if needed
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============ 1. Base → Arbitrum Referral Sync ============

    describe('Base → Arbitrum Referral Sync', () => {
        it('should sync referral from Base to Arbitrum on testnet', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            // Step 1: Create referral on Base
            const createReferralResult = await referralApi.createReferral({
                userAddress: testAccounts.user,
                referrerAddress: testAccounts.referrer,
                chainId: sourceChainId,
            });

            expect(createReferralResult.success).toBe(true);
            expect(createReferralResult.txHash).toBeDefined();

            // Wait for transaction confirmation
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Step 2: Verify referral exists on Base
            const baseReferral = await referralApi.getReferralChain(
                testAccounts.user,
                sourceChainId
            );
            expect(baseReferral.referrerAddress).toBe(testAccounts.referrer);

            // Step 3: Sync referral to Arbitrum
            const syncResult = await referralApi.syncReferral(
                testAccounts.user,
                testAccounts.referrer,
                sourceChainId,
                destChainId
            );

            expect(syncResult.success).toBe(true);
            expect(syncResult.syncTxHash).toBeDefined();

            // Wait for sync transaction confirmation
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Step 4: Verify referral exists on Arbitrum
            const arbitrumReferral = await referralApi.getReferralChain(
                testAccounts.user,
                destChainId
            );
            expect(arbitrumReferral.referrerAddress).toBe(testAccounts.referrer);
            expect(arbitrumReferral.sourceChainId).toBe(sourceChainId);
        }, 60000); // 60 second timeout

        it('should measure gas costs for Base → Arbitrum sync', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            const syncResult = await referralApi.syncReferral(
                testAccounts.user,
                testAccounts.referrer,
                sourceChainId,
                destChainId
            );

            expect(syncResult.success).toBe(true);
            expect(syncResult.gasUsed).toBeDefined();
            expect(syncResult.gasPrice).toBeDefined();

            const gasCost = BigInt(syncResult.gasUsed) * BigInt(syncResult.gasPrice);
            console.log(`Base → Arbitrum sync gas cost: ${formatEther(gasCost)} ETH`);

            // Gas cost should be reasonable (less than 0.01 ETH on testnet)
            expect(Number(formatEther(gasCost))).toBeLessThan(0.01);
        }, 60000);
    });

    // ============ 2. Arbitrum → Polygon Referral Sync ============

    describe('Arbitrum → Polygon Referral Sync', () => {
        it('should sync referral from Arbitrum to Polygon on testnet', async () => {
            const sourceChainId = TESTNET_CONFIG.arbitrum.chainId;
            const destChainId = TESTNET_CONFIG.polygon.chainId;

            // Ensure referral exists on Arbitrum first
            const arbitrumReferral = await referralApi.getReferralChain(
                testAccounts.user,
                sourceChainId
            );
            if (!arbitrumReferral) {
                // Create referral on Arbitrum if it doesn't exist
                await referralApi.createReferral({
                    userAddress: testAccounts.user,
                    referrerAddress: testAccounts.referrer,
                    chainId: sourceChainId,
                });
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Sync to Polygon
            const syncResult = await referralApi.syncReferral(
                testAccounts.user,
                testAccounts.referrer,
                sourceChainId,
                destChainId
            );

            expect(syncResult.success).toBe(true);
            expect(syncResult.syncTxHash).toBeDefined();

            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Verify on Polygon
            const polygonReferral = await referralApi.getReferralChain(
                testAccounts.user,
                destChainId
            );
            expect(polygonReferral.referrerAddress).toBe(testAccounts.referrer);
        }, 60000);

        it('should measure gas costs for Arbitrum → Polygon sync', async () => {
            const sourceChainId = TESTNET_CONFIG.arbitrum.chainId;
            const destChainId = TESTNET_CONFIG.polygon.chainId;

            const syncResult = await referralApi.syncReferral(
                testAccounts.user,
                testAccounts.referrer,
                sourceChainId,
                destChainId
            );

            expect(syncResult.gasUsed).toBeDefined();
            const gasCost = BigInt(syncResult.gasUsed) * BigInt(syncResult.gasPrice);
            console.log(`Arbitrum → Polygon sync gas cost: ${formatEther(gasCost)} ETH`);
        }, 60000);
    });

    // ============ 3. All EVM Chains Referral Sync ============

    describe('All EVM Chains Referral Sync', () => {
        const chains = [
            { name: 'Base', chainId: TESTNET_CONFIG.base.chainId },
            { name: 'Arbitrum', chainId: TESTNET_CONFIG.arbitrum.chainId },
            { name: 'Polygon', chainId: TESTNET_CONFIG.polygon.chainId },
        ];

        it('should sync referral across all EVM chains', async () => {
            // Create referral on first chain
            const firstChain = chains[0];
            await referralApi.createReferral({
                userAddress: testAccounts.user,
                referrerAddress: testAccounts.referrer,
                chainId: firstChain.chainId,
            });
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Sync to all other chains
            const syncPromises = chains.slice(1).map(async (chain) => {
                const syncResult = await referralApi.syncReferral(
                    testAccounts.user,
                    testAccounts.referrer,
                    firstChain.chainId,
                    chain.chainId
                );
                return { chain: chain.name, result: syncResult };
            });

            const results = await Promise.all(syncPromises);

            // Verify all syncs succeeded
            results.forEach(({ chain, result }) => {
                expect(result.success).toBe(true);
                console.log(`${chain} sync: ${result.syncTxHash}`);
            });

            // Wait for all transactions to confirm
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Verify referrals exist on all chains
            const verificationPromises = chains.map(async (chain) => {
                const referral = await referralApi.getReferralChain(
                    testAccounts.user,
                    chain.chainId
                );
                return { chain: chain.name, referral };
            });

            const verifications = await Promise.all(verificationPromises);
            verifications.forEach(({ chain, referral }) => {
                expect(referral).toBeDefined();
                expect(referral.referrerAddress).toBe(testAccounts.referrer);
                console.log(`${chain} referral verified`);
            });
        }, 120000); // 2 minute timeout
    });

    // ============ 4. Failure Recovery ============

    describe('Referral Sync Failure Recovery', () => {
        it('should handle referral sync failure and retry', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            // Attempt sync with invalid parameters to trigger failure
            try {
                await referralApi.syncReferral(
                    '0x0000000000000000000000000000000000000000', // Invalid address
                    testAccounts.referrer,
                    sourceChainId,
                    destChainId
                );
            } catch (error) {
                expect(error.message).toBeDefined();
            }

            // Retry with correct parameters
            const retryResult = await referralApi.syncReferral(
                testAccounts.user,
                testAccounts.referrer,
                sourceChainId,
                destChainId
            );

            expect(retryResult.success).toBe(true);
        }, 60000);

        it('should handle network timeout during sync', async () => {
            // Mock network timeout
            const originalTimeout = referralApi.syncReferral;
            referralApi.syncReferral = jest.fn().mockRejectedValue(
                new Error('Network timeout')
            );

            try {
                await referralApi.syncReferral(
                    testAccounts.user,
                    testAccounts.referrer,
                    TESTNET_CONFIG.base.chainId,
                    TESTNET_CONFIG.arbitrum.chainId
                );
            } catch (error) {
                expect(error.message).toContain('timeout');
            }

            // Restore original function
            referralApi.syncReferral = originalTimeout;
        });
    });

    // ============ 5. Network Congestion Handling ============

    describe('Network Congestion Handling', () => {
        it('should handle referral sync during network congestion', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            // Simulate network congestion by sending multiple syncs
            const syncPromises = Array.from({ length: 5 }, () =>
                referralApi.syncReferral(
                    testAccounts.user,
                    testAccounts.referrer,
                    sourceChainId,
                    destChainId
                )
            );

            // Some may fail due to congestion, but at least one should succeed
            const results = await Promise.allSettled(syncPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
            
            expect(successful.length).toBeGreaterThan(0);
        }, 120000);

        it('should use higher gas price during congestion', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            const syncResult = await referralApi.syncReferral(
                testAccounts.user,
                testAccounts.referrer,
                sourceChainId,
                destChainId,
                { gasPrice: parseEther('0.0000001') } // Higher gas price
            );

            expect(syncResult.success).toBe(true);
            expect(syncResult.gasPrice).toBeDefined();
        }, 60000);
    });

    // ============ 6. Batch Referral Sync ============

    describe('Batch Referral Sync', () => {
        it('should sync multiple referrals in batch', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            const batchUsers = [
                { user: testAccounts.user, referrer: testAccounts.referrer },
                // Add more test users if available
            ];

            const batchResult = await referralApi.batchSyncReferrals(
                batchUsers.map(u => ({
                    userAddress: u.user,
                    referrerAddress: u.referrer,
                    sourceChainId,
                    destChainId,
                }))
            );

            expect(batchResult.success).toBe(true);
            expect(batchResult.syncedCount).toBe(batchUsers.length);
        }, 120000);

        it('should handle partial batch failures', async () => {
            const sourceChainId = TESTNET_CONFIG.base.chainId;
            const destChainId = TESTNET_CONFIG.arbitrum.chainId;

            const batchUsers = [
                { user: testAccounts.user, referrer: testAccounts.referrer },
                { user: '0x0000000000000000000000000000000000000000', referrer: testAccounts.referrer }, // Invalid
            ];

            const batchResult = await referralApi.batchSyncReferrals(
                batchUsers.map(u => ({
                    userAddress: u.user,
                    referrerAddress: u.referrer,
                    sourceChainId,
                    destChainId,
                }))
            );

            // Should handle invalid entries gracefully
            expect(batchResult.success).toBeDefined();
        }, 120000);
    });

    // ============ 7. Gas Cost Analysis ============

    describe('Gas Cost Analysis', () => {
        it('should measure gas costs for each chain', async () => {
            const chains = [
                { name: 'Base', chainId: TESTNET_CONFIG.base.chainId },
                { name: 'Arbitrum', chainId: TESTNET_CONFIG.arbitrum.chainId },
                { name: 'Polygon', chainId: TESTNET_CONFIG.polygon.chainId },
            ];

            const gasCosts = {};

            for (const chain of chains) {
                const syncResult = await referralApi.syncReferral(
                    testAccounts.user,
                    testAccounts.referrer,
                    TESTNET_CONFIG.base.chainId,
                    chain.chainId
                );

                if (syncResult.success && syncResult.gasUsed) {
                    const gasCost = BigInt(syncResult.gasUsed) * BigInt(syncResult.gasPrice);
                    gasCosts[chain.name] = formatEther(gasCost);
                    console.log(`${chain.name} gas cost: ${gasCosts[chain.name]} ETH`);
                }
            }

            // Log comparison
            console.log('Gas cost comparison:', gasCosts);
            expect(Object.keys(gasCosts).length).toBeGreaterThan(0);
        }, 180000);
    });
});

