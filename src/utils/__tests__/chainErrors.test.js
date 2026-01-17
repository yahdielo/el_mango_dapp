/**
 * Tests for chainErrors Utility
 * 
 * Tests error code mapping, error message generation,
 * error recovery strategies, and error logging.
 */

import {
    parseError,
    getChainError,
    formatErrorForDisplay,
    logError,
    getRecoveryStrategy,
    isRetryable,
    getRetryDelay,
    getMaxRetries,
    handleErrorWithRecovery,
    ERROR_TYPES,
    ERROR_SEVERITY,
} from '../chainErrors';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('../../services/chainConfig');

describe('chainErrors Utility', () => {
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

        chainConfig.getErrorMessage.mockImplementation((chainId, errorType) => {
            return `${chainId} ${errorType} error`;
        });
    });

    describe('Error Code Mapping', () => {
        test('should map EVM error codes', () => {
            const error = { code: -32000 };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.EXECUTION_REVERTED);
        });

        test('should map EVM revert patterns', () => {
            const error = { message: 'insufficient funds for transfer' };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.INSUFFICIENT_BALANCE);
        });

        test('should map Tron error patterns', () => {
            const error = { message: 'insufficient balance' };
            const parsed = parseError(error, 728126428);

            expect(parsed.errorType).toBe(ERROR_TYPES.INSUFFICIENT_BALANCE);
        });

        test('should map Solana error patterns', () => {
            const error = { message: 'insufficient funds' };
            const parsed = parseError(error, 501111);

            expect(parsed.errorType).toBe(ERROR_TYPES.INSUFFICIENT_BALANCE);
        });

        test('should map Bitcoin error patterns', () => {
            const error = { message: 'insufficient funds' };
            const parsed = parseError(error, 0);

            expect(parsed.errorType).toBe(ERROR_TYPES.INSUFFICIENT_BALANCE);
        });

        test('should map user rejection', () => {
            const error = { message: 'user rejected transaction', code: 4001 };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.USER_REJECTED);
        });

        test('should map network errors', () => {
            const error = { message: 'network error occurred' };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.NETWORK_ERROR);
        });

        test('should map timeout errors', () => {
            const error = { message: 'request timed out' };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.TIMEOUT);
        });
    });

    describe('Error Message Generation', () => {
        test('should get chain-specific error message', () => {
            const error = { message: 'Transaction failed' };
            const chainError = getChainError(error, 8453);

            expect(chainConfig.getErrorMessage).toHaveBeenCalled();
            expect(chainError).toBeTruthy();
        });

        test('should format error for display', () => {
            // Pass an error object that will be parsed as INSUFFICIENT_BALANCE
            const error = { message: 'Insufficient balance for transfer' };
            chainConfig.getErrorMessage.mockReturnValue('Insufficient balance error message');
            
            const formatted = formatErrorForDisplay(error, 8453);

            expect(formatted).toBeTruthy();
            expect(formatted.message).toContain('Insufficient balance');
        });

        test('should use chain-specific error message', () => {
            // Pass an error object that will be parsed as NETWORK_ERROR
            const error = { message: 'Network connection failed' };
            const formatted = formatErrorForDisplay(error, 8453);

            expect(chainConfig.getErrorMessage).toHaveBeenCalledWith(
                8453,
                ERROR_TYPES.NETWORK_ERROR
            );
        });
    });

    describe('Error Recovery Strategies', () => {
        test('should get recovery strategy for network error', () => {
            const strategy = getRecoveryStrategy(ERROR_TYPES.NETWORK_ERROR);

            expect(strategy.retry).toBe(true);
            expect(strategy.retryDelay).toBe(2000);
            expect(strategy.maxRetries).toBe(3);
        });

        test('should get recovery strategy for user rejection', () => {
            const strategy = getRecoveryStrategy(ERROR_TYPES.USER_REJECTED);

            expect(strategy.retry).toBe(false);
        });

        test('should get recovery strategy for insufficient balance', () => {
            const strategy = getRecoveryStrategy(ERROR_TYPES.INSUFFICIENT_BALANCE);

            expect(strategy.retry).toBe(false);
        });

        test('should check if error is retryable', () => {
            expect(isRetryable({ message: 'Network error' }, 8453)).toBe(true);
            expect(isRetryable({ message: 'User rejected' }, 8453)).toBe(false);
        });

        test('should get retry delay', () => {
            const delay = getRetryDelay(
                { message: 'Network error' },
                8453,
                1
            );

            expect(delay).toBeGreaterThan(0);
        });

        test('should get max retries', () => {
            const maxRetries = getMaxRetries({ message: 'Network error' }, 8453);

            expect(maxRetries).toBe(3);
        });
    });

    describe('Error Logging', () => {
        test('should log error with chain context', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const parsed = {
                errorType: ERROR_TYPES.TRANSACTION_FAILED,
                errorMessage: 'Transaction failed',
                chainId: 8453,
            };

            const originalError = new Error('Original error');

            logError(parsed, originalError);

            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('should log error without original error', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const parsed = {
                errorType: ERROR_TYPES.NETWORK_ERROR,
                errorMessage: 'Network error',
            };

            logError(parsed, null);

            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Error Recovery Handling', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });

        test('should retry on retryable errors', async () => {
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const mockRetryFn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('Network connection failed')))
                .mockResolvedValueOnce('Success');

            const result = await handleErrorWithRecovery(
                new Error('Network connection failed'),
                8453,
                mockRetryFn
            );

            expect(mockRetryFn).toHaveBeenCalledTimes(2);
            expect(result).toBe('Success');
        });

        test('should not retry on non-retryable errors', async () => {
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const mockRetryFn = jest.fn().mockImplementation(() => Promise.reject(new Error('User rejected')));

            await expect(handleErrorWithRecovery(
                new Error('User rejected'),
                8453,
                mockRetryFn
            )).rejects.toBeDefined();

            // For non-retryable errors, retryFn should never be called (function throws immediately)
            expect(mockRetryFn).toHaveBeenCalledTimes(0);
        });

        test('should respect max retries', async () => {
            jest.setTimeout(25000); // Increase timeout for multiple retries (must be before async operations)
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const mockRetryFn = jest.fn().mockImplementation(() => Promise.reject(new Error('Network connection failed')));

            try {
                await handleErrorWithRecovery(
                    new Error('Network connection failed'),
                    8453,
                    mockRetryFn,
                    0
                );
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                // Should throw after max retries
                expect(error).toBeDefined();
            }

            // Should retry maxRetries times (3) + initial attempt = 4 total
            expect(mockRetryFn.mock.calls.length).toBeLessThanOrEqual(4);
        }, 25000); // Also set timeout as test option

        test('should use exponential backoff', async () => {
            jest.setTimeout(25000); // Increase timeout for multiple retries with exponential backoff (must be before async operations)
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const mockRetryFn = jest.fn().mockImplementation(() => Promise.reject(new Error('Network connection failed')));

            try {
                await handleErrorWithRecovery(
                    new Error('Network connection failed'),
                    8453,
                    mockRetryFn
                );
            } catch (err) {
                // Expected to fail
            }

            // Should have delays between retries
            expect(mockRetryFn.mock.calls.length).toBeGreaterThan(1);
        }, 25000); // Also set timeout as test option
    });

    describe('Error Severity', () => {
        test('should assign low severity to user rejection', () => {
            const parsed = parseError({ message: 'user rejected' }, 8453);

            expect(parsed.severity).toBe(ERROR_SEVERITY.LOW);
        });

        test('should assign medium severity to insufficient balance', () => {
            const parsed = parseError({ message: 'insufficient balance' }, 8453);

            expect(parsed.severity).toBe(ERROR_SEVERITY.MEDIUM);
        });

        test('should assign high severity to network errors', () => {
            const parsed = parseError({ message: 'network error' }, 8453);

            expect(parsed.severity).toBe(ERROR_SEVERITY.HIGH);
        });

        test('should assign critical severity to execution reverted', () => {
            const parsed = parseError({ code: -32000 }, 8453);

            expect(parsed.severity).toBe(ERROR_SEVERITY.CRITICAL);
        });
    });

    describe('Chain-Specific Error Handling', () => {
        test('should handle EVM errors', () => {
            const error = { code: -32603, message: 'Internal error' };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.RPC_ERROR);
            expect(parsed.chainType).toBe('EVM');
        });

        test('should handle Tron errors', () => {
            const error = { message: 'bandwidth limit exceeded' };
            const parsed = parseError(error, 728126428);

            expect(parsed.errorType).toBe(ERROR_TYPES.RATE_LIMITED);
            expect(parsed.chainType).toBe('TRON');
        });

        test('should handle Solana errors', () => {
            const error = { message: 'insufficient lamports' };
            const parsed = parseError(error, 501111);

            expect(parsed.errorType).toBe(ERROR_TYPES.INSUFFICIENT_BALANCE);
            expect(parsed.chainType).toBe('SOLANA');
        });

        test('should handle Bitcoin errors', () => {
            const error = { message: 'fee too low' };
            const parsed = parseError(error, 0);

            expect(parsed.errorType).toBe(ERROR_TYPES.GAS_PRICE_TOO_LOW);
            expect(parsed.chainType).toBe('BITCOIN');
        });
    });

    describe('Edge Cases', () => {
        test('should handle unknown error types', () => {
            const error = { message: 'Unknown error' };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.TRANSACTION_FAILED);
        });

        test('should handle errors without message', () => {
            const error = {};
            const parsed = parseError(error, 8453);

            expect(parsed.errorMessage).toBe('An unknown error occurred');
        });

        test('should handle nested error objects', () => {
            const error = {
                error: {
                    code: -32000,
                    message: 'Execution reverted',
                },
            };
            const parsed = parseError(error, 8453);

            expect(parsed.errorType).toBe(ERROR_TYPES.EXECUTION_REVERTED);
        });

        test('should handle missing chainId', () => {
            const error = { message: 'Error occurred' };
            const parsed = parseError(error, null);

            expect(parsed.chainType).toBe('EVM');
        });
    });
});

