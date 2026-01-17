/**
 * Tests for chainValidation Utility
 * 
 * Tests address validation for all chain types, amount validation,
 * minimum amount checks, token address validation, and contract address validation.
 */

import {
    validateAddress,
    validateAmount,
    checkMinimumAmount,
    validateTokenAddress,
    validateContractAddress,
    ValidationResult,
} from '../chainValidation';
import chainConfig from '../../services/chainConfig';
import mangoApi from '../../services/mangoApi';

// Mock dependencies
jest.mock('../../services/chainConfig');
jest.mock('../../services/mangoApi');

describe('chainValidation Utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                728126428: { chainId: '728126428', chainName: 'Tron', type: 'TRON' },
                501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
                0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
            };
            return chains[chainId] || null;
        });

        chainConfig.getMinimumAmounts.mockReturnValue({
            swap: '0.001',
            referral: '0.0001',
        });
    });

    describe('ValidationResult Class', () => {
        test('should create success result', () => {
            const result = ValidationResult.success('Valid');
            expect(result.isValid).toBe(true);
            expect(result.message).toBe('Valid');
            expect(result.error).toBeNull();
        });

        test('should create failure result', () => {
            const error = new Error('Test error');
            const result = ValidationResult.failure('Invalid', error);
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Invalid');
            expect(result.error).toBe(error);
        });
    });

    describe('Address Validation - All Chain Types', () => {
        test('should validate EVM address', () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = validateAddress(8453, '0x1234567890123456789012345678901234567890');

            expect(chainConfig.validateAddress).toHaveBeenCalledWith(
                8453,
                '0x1234567890123456789012345678901234567890'
            );
            expect(result.isValid).toBe(true);
        });

        test('should validate Tron address', () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = validateAddress(728126428, 'TXYZabcdefghijklmnopqrstuvwxyz123456');

            expect(chainConfig.validateAddress).toHaveBeenCalledWith(
                728126428,
                'TXYZabcdefghijklmnopqrstuvwxyz123456'
            );
            expect(result.isValid).toBe(true);
        });

        test('should validate Solana address', () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = validateAddress(501111, 'So1abcdefghijklmnopqrstuvwxyz123456789');

            expect(chainConfig.validateAddress).toHaveBeenCalledWith(
                501111,
                'So1abcdefghijklmnopqrstuvwxyz123456789'
            );
            expect(result.isValid).toBe(true);
        });

        test('should validate Bitcoin address', () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = validateAddress(0, 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');

            expect(chainConfig.validateAddress).toHaveBeenCalledWith(
                0,
                'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
            );
            expect(result.isValid).toBe(true);
        });

        test('should reject invalid address format', () => {
            chainConfig.validateAddress.mockReturnValue(false);
            chainConfig.getErrorMessage.mockReturnValue('Invalid address format');

            const result = validateAddress(8453, 'invalid-address');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Invalid address format');
        });

        test('should reject zero address for EVM', () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = validateAddress(
                8453,
                '0x0000000000000000000000000000000000000000'
            );

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Zero address is not allowed');
        });

        test('should require chainId', () => {
            const result = validateAddress(null, '0x1234...');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Chain ID is required');
        });

        test('should require address', () => {
            const result = validateAddress(8453, null);

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Address is required');
        });

        test('should trim whitespace', () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = validateAddress(8453, '  0x1234567890123456789012345678901234567890  ');

            expect(chainConfig.validateAddress).toHaveBeenCalledWith(
                8453,
                '0x1234567890123456789012345678901234567890'
            );
        });
    });

    describe('Amount Validation', () => {
        test('should validate positive amount', () => {
            const result = validateAmount(8453, '1.0');

            expect(result.isValid).toBe(true);
        });

        test('should reject zero amount', () => {
            const result = validateAmount(8453, '0');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Amount must be greater than zero');
        });

        test('should reject negative amount', () => {
            const result = validateAmount(8453, '-1.0');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Amount must be greater than zero');
        });

        test('should reject non-numeric amount', () => {
            const result = validateAmount(8453, 'abc');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Amount must be a valid number');
        });

        test('should validate amount as number', () => {
            const result = validateAmount(8453, 1.5);

            expect(result.isValid).toBe(true);
        });

        test('should require chainId', () => {
            const result = validateAmount(null, '1.0');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Chain ID is required');
        });

        test('should require amount', () => {
            const result = validateAmount(8453, null);

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Amount is required');
        });
    });

    describe('Minimum Amount Checks', () => {
        test('should pass when amount meets minimum', () => {
            const result = checkMinimumAmount(8453, '0.01', 'swap');

            expect(result.isValid).toBe(true);
            expect(chainConfig.getMinimumAmounts).toHaveBeenCalledWith(8453);
        });

        test('should fail when amount below minimum', () => {
            chainConfig.getChain.mockReturnValue({
                chainId: '8453',
                chainName: 'Base',
            });

            const result = checkMinimumAmount(8453, '0.0001', 'swap');

            expect(result.isValid).toBe(false);
            expect(result.message).toContain('Minimum amount is');
        });

        test('should check referral minimum', () => {
            const result = checkMinimumAmount(8453, '0.0001', 'referral');

            expect(result.isValid).toBe(true);
        });

        test('should handle missing minimums', () => {
            chainConfig.getMinimumAmounts.mockReturnValue(null);

            const result = checkMinimumAmount(8453, '0.01', 'swap');

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('No minimum amount requirement');
        });

        test('should handle zero minimum', () => {
            chainConfig.getMinimumAmounts.mockReturnValue({
                swap: '0',
            });

            const result = checkMinimumAmount(8453, '0.01', 'swap');

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('No minimum amount requirement');
        });
    });

    describe('Token Address Validation', () => {
        test('should validate token address format', async () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = await validateTokenAddress(8453, '0xTokenAddress');

            expect(result.isValid).toBe(true);
        });

        test('should validate token on-chain for EVM', async () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const mockPublicClient = {
                getBytecode: jest.fn().mockResolvedValue('0x6080604052...'),
            };

            const result = await validateTokenAddress(
                8453,
                '0xTokenAddress',
                { checkOnChain: true, publicClient: mockPublicClient }
            );

            expect(mockPublicClient.getBytecode).toHaveBeenCalledWith({
                address: '0xTokenAddress',
            });
            expect(result.isValid).toBe(true);
        });

        test('should fail when contract does not exist', async () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const mockPublicClient = {
                getBytecode: jest.fn().mockResolvedValue('0x'),
            };

            const result = await validateTokenAddress(
                8453,
                '0xTokenAddress',
                { checkOnChain: true, publicClient: mockPublicClient }
            );

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Token contract does not exist at this address');
        });

        test('should validate Tron token address', async () => {
            chainConfig.validateAddress.mockReturnValue(true);
            mangoApi.tron = {
                validateTronAddress: jest.fn().mockResolvedValue({ isValid: true }),
            };

            const result = await validateTokenAddress(
                728126428,
                'TXYZ...',
                { checkOnChain: true }
            );

            expect(mangoApi.tron.validateTronAddress).toHaveBeenCalled();
            expect(result.isValid).toBe(true);
        });

        test('should require publicClient for EVM on-chain validation', async () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = await validateTokenAddress(
                8453,
                '0xTokenAddress',
                { checkOnChain: true }
            );

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Public client is required for on-chain validation');
        });
    });

    describe('Contract Address Validation', () => {
        test('should validate contract address format', async () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const result = await validateContractAddress(8453, '0xContractAddress');

            expect(result.isValid).toBe(true);
        });

        test('should validate against configured contract address', async () => {
            chainConfig.validateAddress.mockReturnValue(true);
            chainConfig.getContractAddress.mockReturnValue('0xConfiguredContract');
            chainConfig.getChain.mockReturnValue({
                chainId: '8453',
                chainName: 'Base',
            });

            const result = await validateContractAddress(
                8453,
                '0xDifferentContract',
                'router'
            );

            expect(result.isValid).toBe(false);
            expect(result.message).toContain('does not match configured');
        });

        test('should pass when contract matches configured', async () => {
            chainConfig.validateAddress.mockReturnValue(true);
            chainConfig.getContractAddress.mockReturnValue('0xContractAddress');

            const result = await validateContractAddress(
                8453,
                '0xContractAddress',
                'router'
            );

            expect(result.isValid).toBe(true);
        });

        test('should validate contract on-chain for EVM', async () => {
            chainConfig.validateAddress.mockReturnValue(true);
            chainConfig.getContractAddress.mockReturnValue(null);

            const mockPublicClient = {
                getBytecode: jest.fn().mockResolvedValue('0x6080604052...'),
            };

            const result = await validateContractAddress(
                8453,
                '0xContractAddress',
                null,
                { checkOnChain: true, publicClient: mockPublicClient }
            );

            expect(result.isValid).toBe(true);
        });

        test('should handle contract validation errors', async () => {
            chainConfig.validateAddress.mockReturnValue(true);

            const mockPublicClient = {
                getBytecode: jest.fn().mockRejectedValue(new Error('RPC error')),
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await validateContractAddress(
                8453,
                '0xContractAddress',
                null,
                { checkOnChain: true, publicClient: mockPublicClient }
            );

            expect(result.isValid).toBe(false);
            expect(result.message).toContain('Error validating');

            consoleSpy.mockRestore();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty string address', () => {
            const result = validateAddress(8453, '');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Address is required');
        });

        test('should handle undefined amount', () => {
            const result = validateAmount(8453, undefined);

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Amount is required');
        });

        test('should handle very large amounts', () => {
            const result = validateAmount(8453, '999999999999999999999');

            expect(result.isValid).toBe(true);
        });

        test('should handle decimal amounts', () => {
            // Set minimum to allow very small amounts for this test
            chainConfig.getMinimumAmounts.mockReturnValue({
                swap: '0.00000000001', // Lower than test amount
                referral: '0.0001',
            });
            
            const result = validateAmount(8453, '0.0000000001');

            expect(result.isValid).toBe(true);
        });

        test('should handle case-insensitive address comparison', async () => {
            chainConfig.validateAddress.mockReturnValue(true);
            chainConfig.getContractAddress.mockReturnValue('0xCONTRACTADDRESS');

            const result = await validateContractAddress(
                8453,
                '0xcontractaddress',
                'router'
            );

            expect(result.isValid).toBe(true);
        });
    });
});

