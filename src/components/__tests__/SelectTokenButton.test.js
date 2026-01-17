/**
 * Tests for SelectTokenButton Component
 * 
 * Comprehensive tests for token selection and selected state display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectTokenButton from '../selecTokenButton';

describe('SelectTokenButton Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Selection', () => {
    it('should render component correctly', () => {
      render(<SelectTokenButton isSelected={false} token={null} onClick={mockOnClick} />);
      expect(screen.getByText(/select token/i)).toBeInTheDocument();
    });

    it('should handle button click', () => {
      render(<SelectTokenButton isSelected={false} token={null} onClick={mockOnClick} />);
      const button = screen.getByText(/select token/i);
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('Selected State Display', () => {
    it('should display token symbol when selected', () => {
      const token = { symbol: 'ETH', img: 'eth.png' };
      render(<SelectTokenButton isSelected={true} token={token} onClick={mockOnClick} />);
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    it('should display token image when selected', () => {
      const token = { symbol: 'ETH', img: 'eth.png' };
      render(<SelectTokenButton isSelected={true} token={token} onClick={mockOnClick} />);
      const image = screen.getByAltText('ETH');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'eth.png');
    });

    it('should display Select Token when not selected', () => {
      render(<SelectTokenButton isSelected={false} token={null} onClick={mockOnClick} />);
      expect(screen.getByText(/select token/i)).toBeInTheDocument();
    });

    it('should have different styles when selected vs not selected', () => {
      const token = { symbol: 'ETH', img: 'eth.png' };
      
      const { rerender } = render(<SelectTokenButton isSelected={false} token={null} onClick={mockOnClick} />);
      const buttonNotSelected = screen.getByText(/select token/i);
      
      rerender(<SelectTokenButton isSelected={true} token={token} onClick={mockOnClick} />);
      const buttonSelected = screen.getByText('ETH');
      
      expect(buttonNotSelected).toBeInTheDocument();
      expect(buttonSelected).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with missing image', () => {
      const token = { symbol: 'ETH', img: null };
      render(<SelectTokenButton isSelected={true} token={token} onClick={mockOnClick} />);
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    it('should handle token with missing symbol', () => {
      const token = { symbol: null, img: 'eth.png' };
      render(<SelectTokenButton isSelected={true} token={token} onClick={mockOnClick} />);
      expect(screen.getByText('Token')).toBeInTheDocument();
    });
  });
});

