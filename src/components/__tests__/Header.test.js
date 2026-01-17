/**
 * Tests for Header Component
 * 
 * Comprehensive tests for the application header with navigation and wallet integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '../header';
import { useAccount } from 'wagmi';

// Mock react-router-dom - must be before any imports that use it
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    BrowserRouter: ({ children }) => React.createElement('div', null, children),
    Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
}, { virtual: true });

// Mock dependencies
jest.mock('wagmi');
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
jest.mock('../WhitelistBadge', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ showTooltip, size }) => React.createElement('div', { 
      'data-testid': 'whitelist-badge', 
      'data-tooltip': showTooltip, 
      'data-size': size 
    }, 'WhitelistBadge')
  };
});

// Import BrowserRouter after mock is set up
const { BrowserRouter } = require('react-router-dom');

// Mock window.location
delete window.location;
window.location = { origin: 'http://localhost:3000' };

const renderWithRouter = (component) => {
  return render(component);
};

describe('Header Component', () => {
  const mockOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useAccount.mockReturnValue({
      address: null,
      isConnected: false,
    });

    __mockUseAppKit.mockReturnValue({
      open: mockOpen,
    });
  });

  // ============ 1. Rendering Tests ============

  describe('Rendering Tests', () => {
    it('should render component correctly', () => {
      renderWithRouter(<Header />);
      
      expect(screen.getByAltText('Mango Logo')).toBeInTheDocument();
    });

    it('should render Mango logo', () => {
      renderWithRouter(<Header />);
      
      const logo = screen.getByAltText('Mango Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src');
    });

    it('should render connect button when wallet not connected', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      renderWithRouter(<Header />);
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });

    it('should render account button when wallet connected', () => {
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      });

      renderWithRouter(<Header />);
      
      // When connected, should show account button (mocked as appkit-account-button)
      // Use queryByText to check if element doesn't exist (getByText throws if not found)
      expect(screen.queryByText(/connect/i)).not.toBeInTheDocument();
    });

    it('should render whitelist badge when wallet connected', () => {
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      });

      renderWithRouter(<Header />);
      
      expect(screen.getByTestId('whitelist-badge')).toBeInTheDocument();
    });

    it('should not render whitelist badge when wallet not connected', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      renderWithRouter(<Header />);
      
      expect(screen.queryByTestId('whitelist-badge')).not.toBeInTheDocument();
    });
  });

  // ============ 2. Wallet Integration Tests ============

  describe('Wallet Integration Tests', () => {
    it('should handle wallet connection button click', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      renderWithRouter(<Header />);
      
      const connectButton = screen.getByText(/connect/i);
      
      fireEvent.click(connectButton);
      
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it('should display wallet address when connected', () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      
      useAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      renderWithRouter(<Header />);
      
      // Account button should be rendered when connected
      // (Actual address display is handled by appkit-account-button)
      expect(useAccount).toHaveBeenCalled();
    });

    it('should handle wallet disconnection', () => {
      // Initially connected
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      });

      const { rerender } = renderWithRouter(<Header />);
      
      expect(screen.queryByText(/connect/i)).not.toBeInTheDocument();
      
      // Disconnect wallet
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });
      
      rerender(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });

    it('should show whitelist badge when connected', () => {
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      });

      renderWithRouter(<Header />);
      
      const whitelistBadge = screen.getByTestId('whitelist-badge');
      expect(whitelistBadge).toBeInTheDocument();
      expect(whitelistBadge).toHaveAttribute('data-tooltip', 'true');
      expect(whitelistBadge).toHaveAttribute('data-size', 'sm');
    });

    it('should hide whitelist badge when disconnected', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      renderWithRouter(<Header />);
      
      expect(screen.queryByTestId('whitelist-badge')).not.toBeInTheDocument();
    });

    it('should handle multiple connection attempts', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      renderWithRouter(<Header />);
      
      const connectButton = screen.getByText(/connect/i);
      
      fireEvent.click(connectButton);
      fireEvent.click(connectButton);
      fireEvent.click(connectButton);
      
      expect(mockOpen).toHaveBeenCalledTimes(3);
    });
  });

  // ============ 3. Navigation Tests ============

  describe('Navigation Tests', () => {
    it('should render logo as clickable element', () => {
      renderWithRouter(<Header />);
      
      const logo = screen.getByAltText('Mango Logo');
      expect(logo).toHaveStyle({ cursor: 'pointer' });
    });

    it('should maintain header structure', () => {
      renderWithRouter(<Header />);
      
      // Header should contain logo and wallet section
      const logo = screen.getByAltText('Mango Logo');
      expect(logo).toBeInTheDocument();
      
      // Wallet section should be present
      const connectButton = screen.getByText(/connect/i);
      expect(connectButton).toBeInTheDocument();
    });
  });

  // ============ 4. Edge Cases ============

  describe('Edge Cases', () => {
    it('should handle missing wallet provider gracefully', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      useAppKit.mockReturnValue({
        open: undefined,
      });

      renderWithRouter(<Header />);
      
      // Component should still render
      expect(screen.getByAltText('Mango Logo')).toBeInTheDocument();
    });

    it('should handle wallet connection state changes', () => {
      const { rerender } = renderWithRouter(<Header />);
      
      // Start disconnected
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
      
      // Connect
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      });
      
      rerender(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );
      
      expect(screen.queryByText(/connect/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('whitelist-badge')).toBeInTheDocument();
    });

    it('should handle rapid connection/disconnection', () => {
      const { rerender } = renderWithRouter(<Header />);
      
      for (let i = 0; i < 5; i++) {
        // Connect
        useAccount.mockReturnValue({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
        });
        
        rerender(
          <BrowserRouter>
            <Header />
          </BrowserRouter>
        );
        
        // Disconnect
        useAccount.mockReturnValue({
          address: null,
          isConnected: false,
        });
        
        rerender(
          <BrowserRouter>
            <Header />
          </BrowserRouter>
        );
      }
      
      // Component should still render correctly
      expect(screen.getByAltText('Mango Logo')).toBeInTheDocument();
    });

    it('should handle empty address string', () => {
      useAccount.mockReturnValue({
        address: '',
        isConnected: false,
      });

      renderWithRouter(<Header />);
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });
  });

  // ============ 5. Accessibility Tests ============

  describe('Accessibility Tests', () => {
    it('should have proper alt text for logo', () => {
      renderWithRouter(<Header />);
      
      const logo = screen.getByAltText('Mango Logo');
      expect(logo).toBeInTheDocument();
    });

    it('should have clickable connect button', () => {
      renderWithRouter(<Header />);
      
      const connectButton = screen.getByText(/connect/i);
      expect(connectButton).toBeInTheDocument();
      
      fireEvent.click(connectButton);
      expect(mockOpen).toHaveBeenCalled();
    });
  });
});

