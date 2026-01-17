/**
 * Tests for InputBox Component (InputBoxes)
 * 
 * Comprehensive tests for input rendering, validation, and change handlers
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useChainId } from 'wagmi';
import chainConfig from '../../services/chainConfig';

// Mock dependencies - must mock wagmi before hooks that use it
const mockUseBalance = jest.fn();
const mockUseReadContract = jest.fn();
const mockUseChainId = jest.fn();

// Don't mock wagmi here - use global mock from setupTests.js

// Mock viem
jest.mock('viem', () => ({
  parseUnits: jest.fn(),
  formatUnits: jest.fn(),
  parseAbi: jest.fn(),
  isAddress: jest.fn(),
}));

jest.mock('../../services/chainConfig', () => {
  const mockChainConfig = {
    getMinimumAmounts: jest.fn(),
    getChain: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockChainConfig,
  };
});

// Mock hooks to return simple values, preventing execution of internal wagmi code
// These must be mocked before the component imports them
jest.mock('../hooks/getEthBalance', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: jest.fn(() => '1.5'),
  };
});

jest.mock('../hooks/getTokenBalance', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: jest.fn(() => '100'),
  };
});
jest.mock('../selecTokenButton', () => {
  const React = require('react');
  const MockSelectTokenButton = ({ isSelected, token, onClick }) => 
    React.createElement('button', { 'data-testid': 'select-token', onClick },
      isSelected ? (token?.symbol || 'Token') : 'Select Token'
    );
  return {
    __esModule: true,
    default: MockSelectTokenButton,
  };
});

jest.mock('../precentageButton', () => {
  const React = require('react');
  const MockPercentageButtons = ({ userBalance, setAmount }) => 
    React.createElement('div', { 'data-testid': 'percentage-buttons' },
      React.createElement('button', { onClick: () => setAmount('25') }, '25%')
    );
  return {
    __esModule: true,
    default: MockPercentageButtons,
  };
});

// Mock react-bootstrap with proper nested component structure
// This must be hoisted before component imports - using same structure as InputBox1.test.js
jest.mock('react-bootstrap', () => {
  const React = require('react');
  
  // Create Card component with Body nested component
  function MockCard({ children, className, style }) {
    return React.createElement('div', { className, style }, children);
  }
  MockCard.Body = function MockCardBody({ children }) {
    return React.createElement('div', { 'data-testid': 'card-body' }, children);
  };
  
  // Create Form component with Control nested component
  function MockForm({ children }) {
    return React.createElement('form', {}, children);
  }
  MockForm.Control = function MockFormControl({ type, placeholder, value, onChange, onBlur, style }) {
    return React.createElement('input', { type, placeholder, value, onChange, onBlur, style });
  };
  
  return {
    Card: MockCard,
    Form: MockForm,
  };
});

// Import component after mocks are set up
import InputBoxes from '../inputBox';

describe('InputBox Component', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();
  const mockOnClick = jest.fn();
  const mockSetAmount = jest.fn();

  const mockProps = {
    chainInfo: { chainId: 8453 },
    userAddress: '0x1234567890123456789012345678901234567890',
    amount1: '100',
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    isSelected: true,
    token: { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, empty: false },
    onClick: mockOnClick,
    usdAmount: 2500,
    _setAmount: mockSetAmount,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock wagmi hooks - useChainId returns a number, not an object
    const { useChainId, useBalance, useReadContract } = require('wagmi');
    // useChainId should return a number directly, not an object
    useChainId.mockReturnValue(8453);
    
    // Mock useBalance for getEthBalance hook (used internally)
    useBalance.mockReturnValue({
      data: { value: BigInt('1500000000000000000'), decimals: 18 },
      isSuccess: true,
      isLoading: false,
      isError: false,
    });
    
    // Mock useReadContract for getTokenBalance hook (used internally)
    useReadContract.mockReturnValue({
      data: BigInt('100000000000000000000'),
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    });
    
    // Mock chainConfig - ensure these return proper values, not objects that could be rendered
    // These must return plain objects/strings, not React components
    chainConfig.getMinimumAmounts.mockReturnValue({ swap: '0.001' });
    chainConfig.getChain.mockReturnValue({
      chainId: '8453',
      chainName: 'Base',
      nativeCurrency: { symbol: 'ETH' },
    });
    
    // Ensure chainConfig methods are functions
    if (typeof chainConfig.getMinimumAmounts !== 'function') {
      chainConfig.getMinimumAmounts = jest.fn().mockReturnValue({ swap: '0.001' });
    }
    if (typeof chainConfig.getChain !== 'function') {
      chainConfig.getChain = jest.fn().mockReturnValue({
        chainId: '8453',
        chainName: 'Base',
        nativeCurrency: { symbol: 'ETH' },
      });
    }
    
    // Mock hooks are set up at module level and return simple values by default
  });

  describe('Input Rendering', () => {
    it('should render component correctly', () => {
      render(<InputBoxes {...mockProps} />);
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });

    it('should render input field', () => {
      render(<InputBoxes {...mockProps} />);
      const input = screen.getByDisplayValue('100');
      expect(input).toBeInTheDocument();
    });

    it('should render token selection button', () => {
      render(<InputBoxes {...mockProps} />);
      expect(screen.getByTestId('select-token')).toBeInTheDocument();
    });

    it('should render percentage buttons', () => {
      render(<InputBoxes {...mockProps} />);
      expect(screen.getByTestId('percentage-buttons')).toBeInTheDocument();
    });

    it('should display USD amount', () => {
      render(<InputBoxes {...mockProps} />);
      expect(screen.getByText(/\$2500/)).toBeInTheDocument();
    });

    it('should display balance', () => {
      render(<InputBoxes {...mockProps} />);
      expect(screen.getByText(/balance/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('should handle input change', () => {
      render(<InputBoxes {...mockProps} />);
      const input = screen.getByDisplayValue('100');
      fireEvent.change(input, { target: { value: '200' } });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle input blur', () => {
      render(<InputBoxes {...mockProps} />);
      const input = screen.getByDisplayValue('100');
      fireEvent.blur(input);
      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should show placeholder when amount is empty', () => {
      render(<InputBoxes {...mockProps} amount1="" />);
      const input = screen.getByPlaceholderText('0.0');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Token Selection', () => {
    it('should handle token button click', () => {
      render(<InputBoxes {...mockProps} />);
      const tokenButton = screen.getByTestId('select-token');
      fireEvent.click(tokenButton);
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should display selected token symbol', () => {
      render(<InputBoxes {...mockProps} />);
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    it('should display Select Token when no token selected', () => {
      render(<InputBoxes {...mockProps} isSelected={false} token={{ empty: true }} />);
      expect(screen.getByText('Select Token')).toBeInTheDocument();
    });
  });

  describe('Balance Display', () => {
    it('should display ETH balance for ETH token', () => {
      render(<InputBoxes {...mockProps} token={{ symbol: 'ETH', empty: false }} />);
      // Hook is called internally by the component
      expect(screen.getByText(/balance/i)).toBeInTheDocument();
    });

    it('should display token balance for non-ETH token', () => {
      render(<InputBoxes {...mockProps} token={{ symbol: 'USDC', address: '0x...', empty: false }} />);
      // Hook is called internally by the component
      expect(screen.getByText(/balance/i)).toBeInTheDocument();
    });

    it('should show zero balance when token is empty', () => {
      render(<InputBoxes {...mockProps} token={{ empty: true }} />);
      expect(screen.getByText(/balance.*0\.0/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing usdAmount', () => {
      render(<InputBoxes {...mockProps} usdAmount={null} />);
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should handle zero usdAmount', () => {
      render(<InputBoxes {...mockProps} usdAmount={0} />);
      expect(screen.getByText(/\$0/)).toBeInTheDocument();
    });
  });
});

