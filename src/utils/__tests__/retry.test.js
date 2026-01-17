/**
 * Tests for retry Utility
 * 
 * Tests retry logic with exponential backoff, timeout handling,
 * error classification, and integration with ChainConfigService.
 */

import {
    RETRYABLE_ERRORS,
    NON_RETRYABLE_ERRORS,
    isRetryableError,
    calculateBackoffDelay,
    retryWithBackoff,
    retryWithTimeout,
    retryForChain,
    createRetryableApiCall,
} from '../retry';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('../../services/chainConfig');

describe('retry Utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Default timeout settings
        chainConfig.getTimeoutSettings.mockReturnValue({
            transactionTimeout: 300000,
            rpcTimeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('RETRYABLE_ERRORS and NON_RETRYABLE_ERRORS constants', () => {
        test('should have all retryable error types defined', () => {
            expect(RETRYABLE_ERRORS.NETWORK_ERROR).toBe('networkError');
            expect(RETRYABLE_ERRORS.TIMEOUT).toBe('timeout');
            expect(RETRYABLE_ERRORS.RPC_ERROR).toBe('rpcError');
            expect(RETRYABLE_ERRORS.RATE_LIMITED).toBe('rateLimited');
            expect(RETRYABLE_ERRORS.SERVER_ERROR).toBe('serverError');
        });

        test('should have all non-retryable error types defined', () => {
            expect(NON_RETRYABLE_ERRORS.USER_REJECTED).toBe('userRejected');
            expect(NON_RETRYABLE_ERRORS.INVALID_ADDRESS).toBe('invalidAddress');
            expect(NON_RETRYABLE_ERRORS.INSUFFICIENT_BALANCE).toBe('insufficientBalance');
            expect(NON_RETRYABLE_ERRORS.VALIDATION_ERROR).toBe('validationError');
        });

        test('should have correct number of error types', () => {
            expect(Object.keys(RETRYABLE_ERRORS)).toHaveLength(5);
            expect(Object.keys(NON_RETRYABLE_ERRORS)).toHaveLength(4);
        });
    });

    describe('calculateBackoffDelay()', () => {
        test('should calculate exponential backoff: baseDelay * 2^attempt', () => {
            expect(calculateBackoffDelay(0, 1000)).toBe(1000); // 1000 * 2^0 = 1000
            expect(calculateBackoffDelay(1, 1000)).toBe(2000); // 1000 * 2^1 = 2000
            expect(calculateBackoffDelay(2, 1000)).toBe(4000); // 1000 * 2^2 = 4000
            expect(calculateBackoffDelay(3, 1000)).toBe(8000); // 1000 * 2^3 = 8000
            expect(calculateBackoffDelay(4, 1000)).toBe(16000); // 1000 * 2^4 = 16000
        });

        test('should work with different base delays', () => {
            expect(calculateBackoffDelay(0, 500)).toBe(500);
            expect(calculateBackoffDelay(1, 500)).toBe(1000);
            expect(calculateBackoffDelay(2, 500)).toBe(2000);
            
            expect(calculateBackoffDelay(0, 2000)).toBe(2000);
            expect(calculateBackoffDelay(1, 2000)).toBe(4000);
        });

        test('should respect maxDelay limit', () => {
            expect(calculateBackoffDelay(10, 1000, 30000)).toBe(30000); // Capped at maxDelay
            expect(calculateBackoffDelay(5, 1000, 10000)).toBe(10000); // Capped at maxDelay
        });

        test('should not exceed maxDelay', () => {
            const maxDelay = 5000;
            expect(calculateBackoffDelay(10, 1000, maxDelay)).toBe(maxDelay);
            expect(calculateBackoffDelay(20, 1000, maxDelay)).toBe(maxDelay);
        });

        test('should handle edge cases with 0 attempts', () => {
            expect(calculateBackoffDelay(0, 1000)).toBe(1000);
        });

        test('should handle negative attempts', () => {
            // Negative attempts should still calculate (though unusual)
            expect(calculateBackoffDelay(-1, 1000)).toBe(500); // 1000 * 2^-1 = 500
        });
    });

    describe('isRetryableError()', () => {
        test('should return false for user rejected errors', () => {
            expect(isRetryableError(new Error('user rejected'))).toBe(false);
            expect(isRetryableError(new Error('user denied transaction'))).toBe(false);
            expect(isRetryableError(new Error('user cancelled'))).toBe(false);
        });

        test('should return false for insufficient balance errors', () => {
            expect(isRetryableError(new Error('insufficient balance'))).toBe(false);
            expect(isRetryableError(new Error('insufficient funds'))).toBe(false);
        });

        test('should return false for invalid address errors', () => {
            expect(isRetryableError(new Error('invalid address'))).toBe(false);
            expect(isRetryableError(new Error('invalid format'))).toBe(false);
        });

        test('should return true for timeout errors', () => {
            expect(isRetryableError(new Error('timeout'))).toBe(true);
            expect(isRetryableError(new Error('timed out'))).toBe(true);
            
            const error = { code: 'ECONNABORTED' };
            expect(isRetryableError(error)).toBe(true);
            
            const error2 = { code: 'ETIMEDOUT' };
            expect(isRetryableError(error2)).toBe(true);
        });

        test('should return true for network errors', () => {
            expect(isRetryableError(new Error('network error'))).toBe(true);
            expect(isRetryableError(new Error('connection failed'))).toBe(true);
            expect(isRetryableError(new Error('fetch failed'))).toBe(true);
        });

        test('should return true for HTTP 429 (rate limited)', () => {
            const error = { response: { status: 429 } };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for HTTP 503 (service unavailable)', () => {
            const error = { response: { status: 503 } };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for HTTP 502 (bad gateway)', () => {
            const error = { response: { status: 502 } };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for HTTP 504 (gateway timeout)', () => {
            const error = { response: { status: 504 } };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should handle null error', () => {
            expect(isRetryableError(null)).toBe(false);
        });

        test('should handle undefined error', () => {
            expect(isRetryableError(undefined)).toBe(false);
        });

        test('should handle error without message', () => {
            expect(isRetryableError({})).toBe(false);
        });

        test('should handle error with code property', () => {
            const error = { code: 'ECONNABORTED' };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should handle error with response.status', () => {
            const error = { response: { status: 500 } };
            // 500 is not explicitly checked, so should return false (default)
            expect(isRetryableError(error)).toBe(false);
        });
    });

    describe('retryWithBackoff()', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        test('should return result on successful operation (no retries)', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithBackoff(fn);
            
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test('should retry on retryable errors', async () => {
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                maxRetries: 1,
                baseDelay: 100,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance timers enough for the retry delay
            jest.advanceTimersByTime(200);
            
            // Flush promise queue
            await Promise.resolve();
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        test('should stop retrying on non-retryable errors', async () => {
            const fn = jest.fn().mockRejectedValue(new Error('user rejected'));
            
            await expect(retryWithBackoff(fn, {
                maxRetries: 3,
                baseDelay: 100,
            })).rejects.toThrow('user rejected');
            
            expect(fn).toHaveBeenCalledTimes(1); // Should not retry
        });

        test('should use exponential backoff timing', async () => {
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const result = await retryWithBackoff(fn, {
                maxRetries: 2,
                baseDelay: 10, // Use very short delays for faster tests
            });
            
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        test('should respect max retry attempts', async () => {
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const fn = jest.fn().mockImplementation(() => Promise.reject(new Error('timeout')));
            
            await expect(retryWithBackoff(fn, {
                maxRetries: 2,
                baseDelay: 10, // Use very short delays for faster tests
            })).rejects.toThrow('timeout');
            
            expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        test('should use chain-specific retry settings', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: 2,
                retryDelay: 500,
            });
            
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                chainId: 8453,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (500ms)
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(chainConfig.getTimeoutSettings).toHaveBeenCalledWith(8453);
            expect(fn).toHaveBeenCalledTimes(2);
        });

        test('should fallback to defaults when chain settings not available', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: null,
                retryDelay: null,
            });
            
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithBackoff(fn, {
                chainId: 8453,
            });
            
            expect(result).toBe('success');
        });

        test('should call onError callback on each error', async () => {
            const onError = jest.fn();
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                maxRetries: 1,
                baseDelay: 100,
                onError,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (100ms)
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            await promise;
            
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(expect.any(Error), 0, 1);
        });

        test('should call onRetry callback before each retry', async () => {
            const onRetry = jest.fn();
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                maxRetries: 1,
                baseDelay: 100,
                onRetry,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (100ms)
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            await promise;
            
            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(1, 1, 100, expect.any(Error));
        });

        test('should use custom shouldRetry function', async () => {
            const shouldRetry = jest.fn().mockReturnValue(true);
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('custom error')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                maxRetries: 1,
                baseDelay: 100,
                shouldRetry,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (100ms)
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(shouldRetry).toHaveBeenCalled();
        });

        test('should propagate error after max retries', async () => {
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            const error = new Error('timeout');
            const fn = jest.fn().mockImplementation(() => Promise.reject(error));
            
            await expect(retryWithBackoff(fn, {
                maxRetries: 2,
                baseDelay: 10, // Use very short delays for faster tests
            })).rejects.toThrow('timeout');
            
            expect(fn).toHaveBeenCalledTimes(3);
        });
    });

    describe('retryWithTimeout()', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        test('should return result when operation completes within timeout', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithTimeout(fn, {
                timeout: 5000,
            });
            
            expect(result).toBe('success');
        });

        test('should throw timeout error when operation exceeds timeout', async () => {
            const fn = jest.fn(() => new Promise(resolve => setTimeout(resolve, 10000)));
            
            const promise = retryWithTimeout(fn, {
                timeout: 1000,
            });
            
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Flush promise queue
            
            await expect(promise).rejects.toThrow('Operation timed out after 1000ms');
        });

        test('should retry with timeout', async () => {
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithTimeout(fn, {
                timeout: 5000,
                maxRetries: 1,
                baseDelay: 100,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (100ms), not the timeout (5000ms)
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        test('should use chain-specific timeout settings', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                rpcTimeout: 5000,
                transactionTimeout: 300000,
            });
            
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithTimeout(fn, {
                chainId: 8453,
            });
            
            expect(result).toBe('success');
            expect(chainConfig.getTimeoutSettings).toHaveBeenCalledWith(8453);
        });

        test('should fallback to default timeout when chain settings not available', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                rpcTimeout: null,
                transactionTimeout: null,
            });
            
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithTimeout(fn, {
                chainId: 8453,
            });
            
            expect(result).toBe('success');
        });

        test('should use custom timeout when provided', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithTimeout(fn, {
                timeout: 2000,
            });
            
            expect(result).toBe('success');
        });

        test('should handle timeout before retries complete', async () => {
            const fn = jest.fn().mockRejectedValue(new Error('timeout'));
            
            const promise = retryWithTimeout(fn, {
                timeout: 500,
                maxRetries: 5,
                baseDelay: 200,
            });
            
            jest.advanceTimersByTime(500);
            await Promise.resolve(); // Flush promise queue
            
            await expect(promise).rejects.toThrow('Operation timed out after 500ms');
        });
    });

    describe('retryForChain()', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        test('should use chain-specific settings', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: 2,
                retryDelay: 500,
            });
            
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryForChain(fn, 8453);
            
            // Let the first call execute
            await Promise.resolve();
            
            // Run only pending timers (this flushes promises automatically)
            jest.runOnlyPendingTimers();
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(chainConfig.getTimeoutSettings).toHaveBeenCalledWith(8453);
        });

        test('should allow custom options override', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: 2,
                retryDelay: 500,
            });
            
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryForChain(fn, 8453, {
                maxRetries: 1,
                baseDelay: 200,
            });
            
            expect(result).toBe('success');
        });

        test('should support custom shouldRetry function', async () => {
            const shouldRetry = jest.fn().mockReturnValue(true);
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('custom')))
                .mockResolvedValueOnce('success');
            
            const promise = retryForChain(fn, 8453, {
                shouldRetry,
                maxRetries: 1,
                baseDelay: 100,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (100ms)
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(shouldRetry).toHaveBeenCalled();
        });

        test('should support onRetry and onError callbacks', async () => {
            const onRetry = jest.fn();
            const onError = jest.fn();
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryForChain(fn, 8453, {
                onRetry,
                onError,
                maxRetries: 1,
                baseDelay: 100,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (100ms)
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('success');
            expect(onError).toHaveBeenCalled();
            expect(onRetry).toHaveBeenCalled();
        });
    });

    describe('createRetryableApiCall()', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        test('should wrap API call with retry logic', async () => {
            const apiCall = jest.fn().mockResolvedValue('result');
            const wrapped = createRetryableApiCall(apiCall);
            
            const result = await wrapped('arg1', 'arg2');
            
            expect(result).toBe('result');
            expect(apiCall).toHaveBeenCalledWith('arg1', 'arg2');
        });

        test('should apply timeout', async () => {
            const apiCall = jest.fn(() => new Promise(resolve => setTimeout(resolve, 10000)));
            const wrapped = createRetryableApiCall(apiCall, null, {
                timeout: 1000,
            });
            
            const promise = wrapped();
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Flush promise queue
            
            await expect(promise).rejects.toThrow('Operation timed out');
        });

        test('should apply exponential backoff', async () => {
            const apiCall = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('result');
            
            const wrapped = createRetryableApiCall(apiCall, null, {
                maxRetries: 1,
                baseDelay: 100,
            });
            
            const promise = wrapped();
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay, not any timeout
            jest.advanceTimersByTime(200);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('result');
            expect(apiCall).toHaveBeenCalledTimes(2);
        });

        test('should handle errors', async () => {
            const apiCall = jest.fn().mockRejectedValue(new Error('user rejected'));
            const wrapped = createRetryableApiCall(apiCall);
            
            await expect(wrapped()).rejects.toThrow('user rejected');
        });

        test('should work with chain-specific settings', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                rpcTimeout: 5000,
                retryAttempts: 2,
                retryDelay: 500,
            });
            
            const apiCall = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('result');
            
            const wrapped = createRetryableApiCall(apiCall, 8453);
            
            const promise = wrapped();
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (500ms), not the timeout (5000ms)
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            
            expect(result).toBe('result');
            expect(chainConfig.getTimeoutSettings).toHaveBeenCalledWith(8453);
        });

        test('should pass arguments correctly', async () => {
            const apiCall = jest.fn().mockResolvedValue('result');
            const wrapped = createRetryableApiCall(apiCall);
            
            await wrapped('arg1', 'arg2', { key: 'value' });
            
            expect(apiCall).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
        });
    });

    describe('Integration with ChainConfigService', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        test('should call getTimeoutSettings() for chain-specific settings', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: 3,
                retryDelay: 1000,
                rpcTimeout: 10000,
            });
            
            await retryWithBackoff(() => Promise.resolve('success'), {
                chainId: 8453,
            });
            
            expect(chainConfig.getTimeoutSettings).toHaveBeenCalledWith(8453);
        });

        test('should use chain-specific retryAttempts', async () => {
            jest.useRealTimers(); // Use real timers for complex retry tests
            
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: 2,
                retryDelay: 10, // Use very short delays for faster tests
            });
            
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            await retryWithBackoff(fn, {
                chainId: 8453,
            });
            
            expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        test('should use chain-specific retryDelay', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: 1,
                retryDelay: 500,
            });
            
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                chainId: 8453,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance only the retry delay (500ms)
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Flush promise queue
            
            await promise;
            
            expect(fn).toHaveBeenCalledTimes(2);
        });

        test('should fallback to defaults when chain settings not available', async () => {
            chainConfig.getTimeoutSettings.mockReturnValue({
                retryAttempts: null,
                retryDelay: null,
            });
            
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithBackoff(fn, {
                chainId: 8453,
            });
            
            expect(result).toBe('success');
        });
    });

    describe('Edge cases and error scenarios', () => {
        jest.setTimeout(10000); // Increase timeout for async retry tests

        test('should handle null chainId', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            
            const result = await retryWithBackoff(fn, {
                chainId: null,
            });
            
            expect(result).toBe('success');
        });

        test('should handle function that throws immediately', async () => {
            const fn = jest.fn().mockRejectedValue(new Error('immediate error'));
            
            await expect(retryWithBackoff(fn, {
                maxRetries: 0,
            })).rejects.toThrow('immediate error');
        });

        test('should handle very long delays', async () => {
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                maxRetries: 1,
                baseDelay: 10000,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Advance the retry delay (10000ms)
            jest.advanceTimersByTime(11000);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            expect(result).toBe('success');
        });

        test('should handle maxDelay capping', async () => {
            const fn = jest.fn()
                .mockImplementationOnce(() => Promise.reject(new Error('timeout')))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(fn, {
                maxRetries: 1,
                baseDelay: 1000,
                maxDelay: 2000,
            });
            
            // Let the first call execute
            await Promise.resolve();
            
            // Should cap at 2000ms, advance enough for the capped delay
            jest.advanceTimersByTime(2500);
            await Promise.resolve(); // Flush promise queue
            
            const result = await promise;
            expect(result).toBe('success');
        });

        test('should handle custom shouldRetry returning false', async () => {
            const shouldRetry = jest.fn().mockReturnValue(false);
            const fn = jest.fn().mockRejectedValue(new Error('timeout'));
            
            await expect(retryWithBackoff(fn, {
                shouldRetry,
                maxRetries: 3,
            })).rejects.toThrow('timeout');
            
            expect(fn).toHaveBeenCalledTimes(1); // Should not retry
        });

        test('should handle timeout before first retry', async () => {
            const fn = jest.fn(() => new Promise(resolve => setTimeout(resolve, 10000)));
            
            const promise = retryWithTimeout(fn, {
                timeout: 100,
            });
            
            jest.advanceTimersByTime(100);
            await Promise.resolve(); // Flush promise queue
            
            await expect(promise).rejects.toThrow('Operation timed out');
        });
    });
});

