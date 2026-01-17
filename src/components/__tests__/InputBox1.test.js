/**
 * Tests for InputBox1 Component
 * 
 * Comprehensive tests for component rendering and input functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InputBox1 from '../inputBox1';

// Mock react-bootstrap components
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
  MockForm.Control = function MockFormControl({ type, placeholder, value, onChange, style }) {
    return React.createElement('input', { type, placeholder, value, onChange, style });
  };
  
  return {
    Card: MockCard,
    Form: MockForm,
    Container: ({ children }) => React.createElement('div', {}, children),
    Button: ({ children, onClick, className, style }) => React.createElement('button', { onClick, className, style }, children),
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
    default: MockSelectTokenButton
  };
});

describe('InputBox1 Component', () => {
  const mockOnChange = jest.fn();
  const mockOnClick = jest.fn();

  const mockProps = {
    placeHolder: '50.5',
    value: '50',
    onChange: mockOnChange,
    isSelected: true,
    token: { symbol: 'USDC', address: '0x...', empty: false },
    onClick: mockOnClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render component correctly', () => {
      render(<InputBox1 {...mockProps} />);
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });

    it('should render input field', () => {
      render(<InputBox1 {...mockProps} />);
      const input = screen.getByDisplayValue('50');
      expect(input).toBeInTheDocument();
    });

    it('should render token selection button', () => {
      render(<InputBox1 {...mockProps} />);
      expect(screen.getByTestId('select-token')).toBeInTheDocument();
    });

    it('should display placeholder when provided', () => {
      render(<InputBox1 {...mockProps} value="" />);
      expect(screen.getByPlaceholderText('50.5')).toBeInTheDocument();
    });

    it('should display default placeholder when value and placeholder are empty', () => {
      render(<InputBox1 {...mockProps} value="" placeHolder="" />);
      expect(screen.getByPlaceholderText('0.0')).toBeInTheDocument();
    });
  });

  describe('Input Functionality', () => {
    it('should handle input change', () => {
      render(<InputBox1 {...mockProps} />);
      const input = screen.getByDisplayValue('50');
      fireEvent.change(input, { target: { value: '75' } });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle token button click', () => {
      render(<InputBox1 {...mockProps} />);
      const tokenButton = screen.getByTestId('select-token');
      fireEvent.click(tokenButton);
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should display selected token symbol', () => {
      render(<InputBox1 {...mockProps} />);
      expect(screen.getByText('USDC')).toBeInTheDocument();
    });

    it('should display Select Token when no token selected', () => {
      render(<InputBox1 {...mockProps} isSelected={false} token={{ empty: true }} />);
      expect(screen.getByText('Select Token')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty value', () => {
      render(<InputBox1 {...mockProps} value="" />);
      const input = screen.getByPlaceholderText('50.5');
      expect(input.value).toBe('');
    });

    it('should handle null token', () => {
      render(<InputBox1 {...mockProps} token={null} isSelected={false} />);
      expect(screen.getByText('Select Token')).toBeInTheDocument();
    });
  });
});

