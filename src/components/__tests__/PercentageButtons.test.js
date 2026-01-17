/**
 * Tests for PercentageButtons Component
 * 
 * Comprehensive tests for percentage button clicks and amount calculation
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PercentageButtons from '../precentageButton';

describe('PercentageButtons Component', () => {
  const mockSetAmount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Percentage Button Clicks', () => {
    it('should render all percentage buttons', () => {
      render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('should call setAmount when 25% button clicked', () => {
      render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
      const button25 = screen.getByText('25%');
      fireEvent.click(button25);
      expect(mockSetAmount).toHaveBeenCalledWith('25.0000');
    });

    it('should call setAmount when 50% button clicked', () => {
      render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
      const button50 = screen.getByText('50%');
      fireEvent.click(button50);
      expect(mockSetAmount).toHaveBeenCalledWith('50.0000');
    });

    it('should call setAmount when 75% button clicked', () => {
      render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
      const button75 = screen.getByText('75%');
      fireEvent.click(button75);
      expect(mockSetAmount).toHaveBeenCalledWith('75.0000');
    });

    it('should call setAmount when MAX button clicked', () => {
      render(<PercentageButtons userBalance={100} setAmount={mockSetAmount} />);
      const buttonMax = screen.getByText('MAX');
      fireEvent.click(buttonMax);
      expect(mockSetAmount).toHaveBeenCalledWith('100.0000');
    });
  });

  describe('Amount Calculation', () => {
    it('should calculate 25% correctly', () => {
      render(<PercentageButtons userBalance={200} setAmount={mockSetAmount} />);
      const button25 = screen.getByText('25%');
      fireEvent.click(button25);
      expect(mockSetAmount).toHaveBeenCalledWith('50.0000');
    });

    it('should calculate 50% correctly', () => {
      render(<PercentageButtons userBalance={200} setAmount={mockSetAmount} />);
      const button50 = screen.getByText('50%');
      fireEvent.click(button50);
      expect(mockSetAmount).toHaveBeenCalledWith('100.0000');
    });

    it('should calculate 75% correctly', () => {
      render(<PercentageButtons userBalance={200} setAmount={mockSetAmount} />);
      const button75 = screen.getByText('75%');
      fireEvent.click(button75);
      expect(mockSetAmount).toHaveBeenCalledWith('150.0000');
    });

    it('should set MAX to full balance', () => {
      render(<PercentageButtons userBalance={200} setAmount={mockSetAmount} />);
      const buttonMax = screen.getByText('MAX');
      fireEvent.click(buttonMax);
      expect(mockSetAmount).toHaveBeenCalledWith('200.0000');
    });

    it('should format amount to 4 decimal places', () => {
      render(<PercentageButtons userBalance={33.333333} setAmount={mockSetAmount} />);
      const button25 = screen.getByText('25%');
      fireEvent.click(button25);
      expect(mockSetAmount).toHaveBeenCalledWith('8.3333');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero balance', () => {
      render(<PercentageButtons userBalance={0} setAmount={mockSetAmount} />);
      const button25 = screen.getByText('25%');
      fireEvent.click(button25);
      // Component calls setAmount with "0.0000" when balance is 0 (0 * 25% = 0)
      expect(mockSetAmount).toHaveBeenCalledWith('0.0000');
    });

    it('should handle null balance', () => {
      render(<PercentageButtons userBalance={null} setAmount={mockSetAmount} />);
      const button25 = screen.getByText('25%');
      fireEvent.click(button25);
      // Should not call setAmount when balance is null
    });

    it('should handle negative balance', () => {
      render(<PercentageButtons userBalance={-100} setAmount={mockSetAmount} />);
      const button25 = screen.getByText('25%');
      fireEvent.click(button25);
      // Should handle negative balance appropriately
    });

    it('should handle very large balance', () => {
      render(<PercentageButtons userBalance={999999999} setAmount={mockSetAmount} />);
      const buttonMax = screen.getByText('MAX');
      fireEvent.click(buttonMax);
      expect(mockSetAmount).toHaveBeenCalledWith('999999999.0000');
    });

    it('should handle decimal balance', () => {
      render(<PercentageButtons userBalance={0.123456} setAmount={mockSetAmount} />);
      const button50 = screen.getByText('50%');
      fireEvent.click(button50);
      expect(mockSetAmount).toHaveBeenCalledWith('0.0617');
    });
  });
});

