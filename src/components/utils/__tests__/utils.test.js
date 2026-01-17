/**
 * Complete Test Suite for Utility Functions
 * 
 * Comprehensive tests for isEmpty() and all utility functions
 */

import { isEmpty } from '../utils';

describe('Utility Functions - Complete Test Suite', () => {
  describe('isEmpty() Function', () => {
    describe('Null and Undefined Values', () => {
      it('should return true for null', () => {
        expect(isEmpty(null)).toBe(true);
      });

      it('should return true for undefined', () => {
        expect(isEmpty(undefined)).toBe(true);
      });

      it('should handle null explicitly', () => {
        const value = null;
        expect(isEmpty(value)).toBe(true);
      });

      it('should handle undefined explicitly', () => {
        const value = undefined;
        expect(isEmpty(value)).toBe(true);
      });
    });

    describe('String Values', () => {
      it('should return true for empty string', () => {
        expect(isEmpty('')).toBe(true);
      });

      it('should return true for whitespace-only string', () => {
        expect(isEmpty('   ')).toBe(true);
      });

      it('should return true for string with tabs', () => {
        expect(isEmpty('\t\t')).toBe(true);
      });

      it('should return true for string with newlines', () => {
        expect(isEmpty('\n\n')).toBe(true);
      });

      it('should return true for string with mixed whitespace', () => {
        expect(isEmpty(' \t\n ')).toBe(true);
      });

      it('should return false for non-empty string', () => {
        expect(isEmpty('hello')).toBe(false);
      });

      it('should return false for string with content and whitespace', () => {
        expect(isEmpty('  hello  ')).toBe(false);
      });

      it('should return false for string with numbers', () => {
        expect(isEmpty('123')).toBe(false);
      });

      it('should return false for string with special characters', () => {
        expect(isEmpty('!@#$%')).toBe(false);
      });

      it('should return false for single character string', () => {
        expect(isEmpty('a')).toBe(false);
      });

      it('should return false for string with only zero', () => {
        expect(isEmpty('0')).toBe(false);
      });

      it('should return false for string with only false', () => {
        expect(isEmpty('false')).toBe(false);
      });
    });

    describe('Non-String, Non-Null Values', () => {
      it('should return false for number zero', () => {
        expect(isEmpty(0)).toBe(false);
      });

      it('should return false for positive numbers', () => {
        expect(isEmpty(1)).toBe(false);
        expect(isEmpty(100)).toBe(false);
        expect(isEmpty(3.14)).toBe(false);
      });

      it('should return false for negative numbers', () => {
        expect(isEmpty(-1)).toBe(false);
        expect(isEmpty(-100)).toBe(false);
      });

      it('should return false for boolean true', () => {
        expect(isEmpty(true)).toBe(false);
      });

      it('should return false for boolean false', () => {
        expect(isEmpty(false)).toBe(false);
      });

      it('should return false for empty array', () => {
        expect(isEmpty([])).toBe(false);
      });

      it('should return false for non-empty array', () => {
        expect(isEmpty([1, 2, 3])).toBe(false);
      });

      it('should return false for empty object', () => {
        expect(isEmpty({})).toBe(false);
      });

      it('should return false for non-empty object', () => {
        expect(isEmpty({ key: 'value' })).toBe(false);
      });

      it('should return false for function', () => {
        expect(isEmpty(() => {})).toBe(false);
      });

      it('should return false for Date object', () => {
        expect(isEmpty(new Date())).toBe(false);
      });

      it('should return false for Symbol', () => {
        expect(isEmpty(Symbol('test'))).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle string "null"', () => {
        expect(isEmpty('null')).toBe(false);
      });

      it('should handle string "undefined"', () => {
        expect(isEmpty('undefined')).toBe(false);
      });

      it('should handle very long whitespace string', () => {
        const longWhitespace = ' '.repeat(1000);
        expect(isEmpty(longWhitespace)).toBe(true);
      });

      it('should handle string with zero-width spaces', () => {
        // Note: trim() may not remove zero-width spaces depending on implementation
        expect(isEmpty('\u200B')).toBe(false); // Zero-width space
      });

      it('should handle string with unicode whitespace', () => {
        // Non-breaking space - JavaScript's trim() removes it, so it's considered empty
        expect(isEmpty('\u00A0')).toBe(true);
      });

      it('should handle BigInt', () => {
        expect(isEmpty(BigInt(0))).toBe(false);
        expect(isEmpty(BigInt(100))).toBe(false);
      });
    });

    describe('Type Coercion Scenarios', () => {
      it('should handle loose equality with null (== null)', () => {
        // The function uses == null which matches both null and undefined
        expect(isEmpty(null)).toBe(true);
        expect(isEmpty(undefined)).toBe(true);
      });

      it('should not coerce other falsy values to empty', () => {
        expect(isEmpty(0)).toBe(false);
        expect(isEmpty(false)).toBe(false);
      });
    });
  });

  describe('Additional Utility Function Tests', () => {
    // Note: Currently only isEmpty is exported
    // These tests are placeholders for future utility functions
    
    it('should verify isEmpty is exported', () => {
      expect(typeof isEmpty).toBe('function');
    });

    it('should have consistent behavior across multiple calls', () => {
      const testValues = [
        null,
        undefined,
        '',
        '   ',
        'hello',
        0,
        false,
        [],
        {},
      ];

      testValues.forEach((value) => {
        const result1 = isEmpty(value);
        const result2 = isEmpty(value);
        expect(result1).toBe(result2);
      });
    });
  });
});

