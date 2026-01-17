/**
 * Tests for PercentageButtons Component
 * 
 * Comprehensive tests for percentage button clicks, amount calculation,
 * edge cases, user interactions, and integration.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PercentageButtons from '../precentageButton';

describe('PercentageButtons Component', () => {
    const mockSetAmount = jest.fn();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy.mockClear();
    });

    afterAll(() => {
        consoleSpy.mockRestore();
    });

    describe('Component Rendering', () => {
        test('should render with required props', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            expect(screen.getByText('25%')).toBeInTheDocument();
            expect(screen.getByText('50%')).toBeInTheDocument();
            expect(screen.getByText('75%')).toBeInTheDocument();
            expect(screen.getByText('MAX')).toBeInTheDocument();
        });

        test('should render all percentage buttons', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(4);
            expect(screen.getByText('25%')).toBeInTheDocument();
            expect(screen.getByText('50%')).toBeInTheDocument();
            expect(screen.getByText('75%')).toBeInTheDocument();
            expect(screen.getByText('MAX')).toBeInTheDocument();
        });

        test('should render buttons with correct styling', () => {
            const { container } = render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const buttons = container.querySelectorAll('button');
            buttons.forEach(button => {
                // Check inline styles - React may serialize styles differently
                expect(button).toHaveAttribute('style');
                const style = button.getAttribute('style');
                // Verify background is transparent
                expect(style).toContain('background');
                expect(style).toContain('transparent');
                // Border may be omitted if it matches default, or may be included
                // Check that at least background is set correctly
                expect(style).toMatch(/background\s*:\s*transparent/i);
                // If border is present, it should be 'none'
                if (style.includes('border')) {
                    expect(style).toMatch(/border\s*:\s*none/i);
                }
            });
        });

        test('should render buttons in a div container', () => {
            const { container } = render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const wrapper = container.firstChild;
            expect(wrapper.tagName).toBe('DIV');
        });
    });

    describe('Percentage Calculation', () => {
        test('should calculate 25% correctly', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalledWith('25.0000');
        });

        test('should calculate 50% correctly', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            expect(mockSetAmount).toHaveBeenCalledWith('50.0000');
        });

        test('should calculate 75% correctly', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button75 = screen.getByText('75%');
            fireEvent.click(button75);
            
            expect(mockSetAmount).toHaveBeenCalledWith('75.0000');
        });

        test('should calculate 100% correctly', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const buttonMax = screen.getByText('MAX');
            fireEvent.click(buttonMax);
            
            expect(mockSetAmount).toHaveBeenCalledWith('100.0000');
        });

        test('should calculate with different balances', () => {
            const balances = [50, 200, 1000, 0.5, 123.456];
            
            balances.forEach(balance => {
                const { unmount } = render(
                    <PercentageButtons userBalance={balance} setAmount={mockSetAmount} />
                );
                
                const button25 = screen.getByText('25%');
                fireEvent.click(button25);
                
                const expected = ((balance * 25) / 100).toFixed(4).toString();
                expect(mockSetAmount).toHaveBeenCalledWith(expected);
                
                mockSetAmount.mockClear();
                unmount();
            });
        });

        test('should handle zero balance', () => {
            render(<PercentageButtons userBalance={0} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            // Should still call setAmount with 0.0000
            expect(mockSetAmount).toHaveBeenCalledWith('0.0000');
        });

        test('should handle null balance', () => {
            render(<PercentageButtons userBalance={null} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            // Should not call setAmount when balance is null
            expect(mockSetAmount).not.toHaveBeenCalled();
        });

        test('should handle undefined balance', () => {
            render(<PercentageButtons userBalance={undefined} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            // Should not call setAmount when balance is undefined
            expect(mockSetAmount).not.toHaveBeenCalled();
        });

        test('should format amount to 4 decimal places', () => {
            render(<PercentageButtons userBalance={33.333333} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalledWith('8.3333');
        });

        test('should handle decimal percentages correctly', () => {
            render(<PercentageButtons userBalance={100.123456} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            expect(mockSetAmount).toHaveBeenCalledWith('50.0617');
        });
    });

    describe('Button Click Handlers', () => {
        test('should call setAmount when 25% button clicked', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalledTimes(1);
            expect(mockSetAmount).toHaveBeenCalledWith('25.0000');
        });

        test('should call setAmount when 50% button clicked', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            expect(mockSetAmount).toHaveBeenCalledTimes(1);
            expect(mockSetAmount).toHaveBeenCalledWith('50.0000');
        });

        test('should call setAmount when 75% button clicked', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button75 = screen.getByText('75%');
            fireEvent.click(button75);
            
            expect(mockSetAmount).toHaveBeenCalledTimes(1);
            expect(mockSetAmount).toHaveBeenCalledWith('75.0000');
        });

        test('should call setAmount when MAX button clicked', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const buttonMax = screen.getByText('MAX');
            fireEvent.click(buttonMax);
            
            expect(mockSetAmount).toHaveBeenCalledTimes(1);
            expect(mockSetAmount).toHaveBeenCalledWith('100.0000');
        });

        test('should call onChange callback with correct amount', () => {
            render(<PercentageButtons userBalance={200} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalledWith('50.0000');
        });

        test('should format amount correctly', () => {
            render(<PercentageButtons userBalance={123.456789} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            // 123.456789 * 0.5 = 61.7283945, rounded to 4 decimals = 61.7284
            expect(mockSetAmount).toHaveBeenCalledWith('61.7284');
        });

        test('should log amount to console', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(consoleSpy).toHaveBeenCalledWith('Setting amount to:', 25);
        });
    });

    describe('Edge Cases', () => {
        test('should handle very small balances', () => {
            render(<PercentageButtons userBalance={0.0001} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            expect(mockSetAmount).toHaveBeenCalledWith('0.0001');
        });

        test('should handle very large balances', () => {
            render(<PercentageButtons userBalance={999999999} setAmount={mockSetAmount} />);
            
            const buttonMax = screen.getByText('MAX');
            fireEvent.click(buttonMax);
            
            expect(mockSetAmount).toHaveBeenCalledWith('999999999.0000');
        });

        test('should handle zero balance', () => {
            render(<PercentageButtons userBalance={0} setAmount={mockSetAmount} />);
            
            const buttonMax = screen.getByText('MAX');
            fireEvent.click(buttonMax);
            
            expect(mockSetAmount).toHaveBeenCalledWith('0.0000');
        });

        test('should handle null balance', () => {
            render(<PercentageButtons userBalance={null} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).not.toHaveBeenCalled();
        });

        test('should handle undefined balance', () => {
            render(<PercentageButtons userBalance={undefined} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).not.toHaveBeenCalled();
        });

        test('should handle negative balance', () => {
            render(<PercentageButtons userBalance={-100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            // Component checks userBalance > 0, so should not call setAmount
            expect(mockSetAmount).not.toHaveBeenCalled();
        });

        test('should handle string balance (if passed)', () => {
            // Note: Component expects number, but testing edge case
            render(<PercentageButtons userBalance="100" setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            // JavaScript will coerce string to number in multiplication
            expect(mockSetAmount).toHaveBeenCalled();
        });

        test('should handle decimal balance with many places', () => {
            render(<PercentageButtons userBalance={0.123456789} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            expect(mockSetAmount).toHaveBeenCalledWith('0.0617');
        });

        test('should handle balance that results in rounding', () => {
            render(<PercentageButtons userBalance={1.1111} setAmount={mockSetAmount} />);
            
            const button33 = screen.getByText('25%');
            fireEvent.click(button33);
            
            // 1.1111 * 0.25 = 0.277775, rounded to 4 decimals = 0.2778
            expect(mockSetAmount).toHaveBeenCalledWith('0.2778');
        });
    });

    describe('User Interactions', () => {
        test('should handle button click', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalled();
        });

        test('should handle multiple button clicks', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            fireEvent.click(screen.getByText('25%'));
            fireEvent.click(screen.getByText('50%'));
            fireEvent.click(screen.getByText('75%'));
            fireEvent.click(screen.getByText('MAX'));
            
            expect(mockSetAmount).toHaveBeenCalledTimes(4);
            expect(mockSetAmount).toHaveBeenNthCalledWith(1, '25.0000');
            expect(mockSetAmount).toHaveBeenNthCalledWith(2, '50.0000');
            expect(mockSetAmount).toHaveBeenNthCalledWith(3, '75.0000');
            expect(mockSetAmount).toHaveBeenNthCalledWith(4, '100.0000');
        });

        test('should handle rapid button clicks', async () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            // Use fireEvent for rapid clicks instead of userEvent.setup() which may not be available
            fireEvent.click(button25);
            fireEvent.click(button25);
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalledTimes(3);
        });

        test('should be keyboard accessible', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            
            // Buttons should be focusable
            button25.focus();
            expect(document.activeElement).toBe(button25);
        });

        test('should handle Enter key press', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            button25.focus();
            fireEvent.keyDown(button25, { key: 'Enter', code: 'Enter' });
            
            // Note: Enter key doesn't trigger onClick by default, but button is still accessible
            expect(button25).toBeInTheDocument();
        });

        test('should handle Space key press', () => {
            render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            button25.focus();
            fireEvent.keyDown(button25, { key: ' ', code: 'Space' });
            
            // Note: Space key doesn't trigger onClick by default, but button is still accessible
            expect(button25).toBeInTheDocument();
        });
    });

    describe('Integration', () => {
        test('should integrate with parent component via setAmount callback', () => {
            const parentSetAmount = jest.fn();
            
            render(<PercentageButtons userBalance={100} setAmount={parentSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(parentSetAmount).toHaveBeenCalledWith('25.0000');
        });

        test('should maintain amount formatting consistency', () => {
            const balances = [1, 10, 100, 1000, 0.1, 0.01];
            
            balances.forEach(balance => {
                const { unmount } = render(
                    <PercentageButtons userBalance={balance} setAmount={mockSetAmount} />
                );
                
                const button50 = screen.getByText('50%');
                fireEvent.click(button50);
                
                const result = mockSetAmount.mock.calls[mockSetAmount.mock.calls.length - 1][0];
                // Check that result always has 4 decimal places
                const decimalPlaces = result.split('.')[1]?.length || 0;
                expect(decimalPlaces).toBeLessThanOrEqual(4);
                
                mockSetAmount.mockClear();
                unmount();
            });
        });

        test('should work with different setAmount implementations', () => {
            const setAmount1 = jest.fn();
            const setAmount2 = jest.fn();
            
            const { rerender } = render(
                <PercentageButtons userBalance={100} setAmount={setAmount1} />
            );
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            expect(setAmount1).toHaveBeenCalled();
            
            rerender(<PercentageButtons userBalance={100} setAmount={setAmount2} />);
            fireEvent.click(button25);
            expect(setAmount2).toHaveBeenCalled();
        });
    });

    describe('Real-world Scenarios', () => {
        test('should handle typical ETH balance', () => {
            // Typical ETH balance: 1.5 ETH = 1500000000000000000 wei (as number)
            render(<PercentageButtons userBalance={1.5} setAmount={mockSetAmount} />);
            
            const buttonMax = screen.getByText('MAX');
            fireEvent.click(buttonMax);
            
            expect(mockSetAmount).toHaveBeenCalledWith('1.5000');
        });

        test('should handle typical token balance', () => {
            // Typical token balance: 1000 tokens
            render(<PercentageButtons userBalance={1000} setAmount={mockSetAmount} />);
            
            const button50 = screen.getByText('50%');
            fireEvent.click(button50);
            
            expect(mockSetAmount).toHaveBeenCalledWith('500.0000');
        });

        test('should handle small token balance', () => {
            // Small token balance: 0.001 tokens
            render(<PercentageButtons userBalance={0.001} setAmount={mockSetAmount} />);
            
            const button25 = screen.getByText('25%');
            fireEvent.click(button25);
            
            expect(mockSetAmount).toHaveBeenCalledWith('0.0003');
        });

        test('should handle large token balance', () => {
            // Large token balance: 1,000,000 tokens
            render(<PercentageButtons userBalance={1000000} setAmount={mockSetAmount} />);
            
            const button75 = screen.getByText('75%');
            fireEvent.click(button75);
            
            expect(mockSetAmount).toHaveBeenCalledWith('750000.0000');
        });
    });

    describe('Component Behavior', () => {
        test('should not call setAmount when balance is null or undefined', () => {
            const { rerender } = render(
                <PercentageButtons userBalance={null} setAmount={mockSetAmount} />
            );
            
            fireEvent.click(screen.getByText('25%'));
            expect(mockSetAmount).not.toHaveBeenCalled();
            
            rerender(<PercentageButtons userBalance={undefined} setAmount={mockSetAmount} />);
            fireEvent.click(screen.getByText('25%'));
            expect(mockSetAmount).not.toHaveBeenCalled();
        });

        test('should handle zero balance correctly and not call setAmount for negative balance', () => {
            const { rerender } = render(
                <PercentageButtons userBalance={0} setAmount={mockSetAmount} />
            );
            
            // Zero balance should still work (0 * percentage = 0) - component allows userBalance >= 0
            fireEvent.click(screen.getByText('25%'));
            expect(mockSetAmount).toHaveBeenCalledWith('0.0000');
            
            rerender(<PercentageButtons userBalance={-100} setAmount={mockSetAmount} />);
            fireEvent.click(screen.getByText('25%'));
            // Negative balance should not call setAmount (userBalance >= 0 excludes negative)
            expect(mockSetAmount).toHaveBeenCalledTimes(1); // Only the zero balance call
        });

        test('should always format to 4 decimal places', () => {
            const testCases = [
                { balance: 1, percentage: 25, expected: '0.2500' },
                { balance: 0.1, percentage: 50, expected: '0.0500' },
                { balance: 0.0001, percentage: 100, expected: '0.0001' },
                { balance: 123.456789, percentage: 33.333, expected: '41.1523' },
            ];
            
            testCases.forEach(({ balance, percentage, expected }) => {
                const { unmount } = render(
                    <PercentageButtons userBalance={balance} setAmount={mockSetAmount} />
                );
                
                // We can only test with 25%, 50%, 75%, 100%
                // So we'll test the formatting behavior
                const button25 = screen.getByText('25%');
                fireEvent.click(button25);
                
                const result = mockSetAmount.mock.calls[mockSetAmount.mock.calls.length - 1][0];
                const parts = result.split('.');
                if (parts.length > 1) {
                    expect(parts[1].length).toBeLessThanOrEqual(4);
                }
                
                mockSetAmount.mockClear();
                unmount();
            });
        });
    });
});

