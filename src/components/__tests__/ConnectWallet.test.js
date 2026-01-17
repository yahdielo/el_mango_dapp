/**
 * Tests for ConnectWallet Component
 * 
 * Comprehensive tests for wallet connection UI and connection flow
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectWallet from '../connectWallet';

// Mock @reown/appkit/react - inline mock to avoid module resolution during hoisting
jest.mock('@reown/appkit/react', () => {
  const mockUseAppKit = jest.fn(() => ({
    open: jest.fn(),
    close: jest.fn(),
    subscribe: jest.fn(),
  }));
  return {
    useAppKit: mockUseAppKit,
    createAppKit: jest.fn(() => ({
      open: jest.fn(),
      close: jest.fn(),
      subscribe: jest.fn(),
    })),
    __mockUseAppKit: mockUseAppKit, // Export for test access
  };
}, { virtual: true });
const { useAppKit, __mockUseAppKit } = require('@reown/appkit/react');

describe('ConnectWallet Component', () => {
  const mockOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    __mockUseAppKit.mockReturnValue({
      open: mockOpen,
    });
  });

  describe('Wallet Connection UI', () => {
    it('should render component correctly', () => {
      render(<ConnectWallet />);
      expect(screen.getByText(/connect evm wallet/i)).toBeInTheDocument();
    });

    it('should render connect button', () => {
      render(<ConnectWallet />);
      const button = screen.getByText(/connect evm wallet/i);
      expect(button).toBeInTheDocument();
    });
  });

  describe('Connection Flow', () => {
    it('should call open when button clicked', () => {
      render(<ConnectWallet />);
      const button = screen.getByText(/connect evm wallet/i);
      fireEvent.click(button);
      expect(mockOpen).toHaveBeenCalled();
    });

    it('should handle multiple connection attempts', () => {
      render(<ConnectWallet />);
      const button = screen.getByText(/connect evm wallet/i);
      fireEvent.click(button);
      fireEvent.click(button);
      expect(mockOpen).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing open function', () => {
      __mockUseAppKit.mockReturnValue({
        open: undefined,
      });

      render(<ConnectWallet />);
      const button = screen.getByText(/connect evm wallet/i);
      // Should not crash when open is undefined
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });
});

