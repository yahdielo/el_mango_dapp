/**
 * Tests for SwitchChain Component
 * 
 * Comprehensive tests for chain switching and error handling
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SwitchChain from '../switchChain';
import { useSwitchChain } from 'wagmi';

jest.mock('wagmi');

describe('SwitchChain Component', () => {
  const mockSwitchChain = jest.fn();

  const mockChain = {
    id: 8453,
    name: 'Base',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSwitchChain.mockReturnValue({
      switchChain: mockSwitchChain,
    });
  });

  describe('Chain Switching', () => {
    it('should render component correctly', () => {
      render(<SwitchChain chain={mockChain} />);
      expect(screen.getByText(/cambiar red a base/i)).toBeInTheDocument();
    });

    it('should call switchChain when button clicked', () => {
      render(<SwitchChain chain={mockChain} />);
      const button = screen.getByText(/cambiar red a base/i);
      fireEvent.click(button);
      expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 8453 });
    });

    it('should display correct chain name', () => {
      const arbitrumChain = { id: 42161, name: 'Arbitrum' };
      render(<SwitchChain chain={arbitrumChain} />);
      expect(screen.getByText(/cambiar red a arbitrum/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle switchChain errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSwitchChain.mockImplementation(() => {
        throw new Error('Chain switch failed');
      });

      render(<SwitchChain chain={mockChain} />);
      const button = screen.getByText(/cambiar red a base/i);
      
      // Should not crash on error - error is caught and logged
      fireEvent.click(button);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error switching chain:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing chain prop', () => {
      const { container } = render(<SwitchChain chain={null} />);
      // Component returns null when chain is missing
      expect(container.firstChild).toBeNull();
    });

    it('should handle chain with missing id', () => {
      const chainWithoutId = { name: 'Base' };
      render(<SwitchChain chain={chainWithoutId} />);
      const button = screen.getByText(/cambiar red a base/i);
      fireEvent.click(button);
      // Should handle undefined chainId
    });
  });
});

