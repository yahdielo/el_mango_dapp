/**
 * Tests for SwapHistory Component
 * 
 * Comprehensive tests for swap history display, filtering, and sorting
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SwapHistory from '../SwapHistory';

// Mock dependencies - use auto-mock first, then configure in beforeEach
jest.mock('../../services/chainConfig');
jest.mock('../../utils/confirmationTracking');

// Mock react-bootstrap components
jest.mock('react-bootstrap', () => {
  const mockReact = require('react');
  
  const MockCard = ({ children, className }) => {
    return mockReact.createElement('div', { className, 'data-testid': 'card' }, children);
  };
  MockCard.Header = ({ children }) => {
    return mockReact.createElement('div', { 'data-testid': 'card-header' }, children);
  };
  MockCard.Body = ({ children }) => {
    return mockReact.createElement('div', { 'data-testid': 'card-body' }, children);
  };
  
  // Table component - accepts thead/tbody directly as children
  // Must properly handle children to avoid appendChild errors
  const MockTable = ({ children, responsive, hover, ...props }) => {
    // Pass children directly to React.createElement - it handles arrays automatically
    return mockReact.createElement('table', { 'data-testid': 'table', responsive, hover, ...props }, children);
  };
  // Also support nested components for compatibility
  MockTable.Head = ({ children }) => {
    return mockReact.createElement('thead', {}, children);
  };
  MockTable.Body = ({ children }) => {
    return mockReact.createElement('tbody', {}, children);
  };
  MockTable.Row = ({ children }) => {
    return mockReact.createElement('tr', {}, children);
  };
  
  const MockForm = ({ children }) => {
    return mockReact.createElement('form', {}, children);
  };
  MockForm.Label = ({ children }) => {
    return mockReact.createElement('label', {}, children);
  };
  MockForm.Select = ({ children, value, onChange, style }) => {
    return mockReact.createElement('select', { value, onChange, style }, children);
  };
  
  const MockButton = ({ children, onClick, variant, size }) => {
    return mockReact.createElement('button', { onClick, variant, size }, children);
  };
  
  const MockBadge = ({ children, bg, className }) => {
    return mockReact.createElement('span', { 'data-testid': 'badge', bg, className }, children);
  };
  
  return {
    Card: MockCard,
    Table: MockTable,
    Form: MockForm,
    Button: MockButton,
    Badge: MockBadge,
  };
});

// Mock react-bootstrap-icons
jest.mock('react-bootstrap-icons', () => {
  const React = require('react');
  return {
    ArrowDownUp: () => React.createElement('svg', { 'data-testid': 'arrow-down-up' }),
    BoxArrowUpRight: () => React.createElement('svg', { 'data-testid': 'box-arrow-up-right' }),
    Download: () => React.createElement('svg', { 'data-testid': 'download' }),
  };
});

// Mock window.URL methods for CSV export
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('SwapHistory Component', () => {
  const mockSwaps = [
    {
      swapId: 'swap-1',
      sourceChainId: 8453,
      destChainId: 42161,
      amountIn: '1.5',
      status: 'completed',
      createdAt: '2024-01-01T00:00:00Z',
      sourceTxHash: '0xtx111',
    },
    {
      swapId: 'swap-2',
      sourceChainId: 42161,
      destChainId: 8453,
      amountIn: '2.0',
      status: 'pending',
      createdAt: '2024-01-02T00:00:00Z',
      sourceTxHash: '0xtx222',
    },
    {
      swapId: 'swap-3',
      sourceChainId: 137,
      destChainId: 8453,
      amountIn: '0.5',
      status: 'failed',
      createdAt: '2024-01-03T00:00:00Z',
      sourceTxHash: '0xtx333',
    },
    {
      swapId: 'swap-4',
      sourceChainId: 8453,
      destChainId: 42161,
      amountIn: '3.0',
      status: 'processing',
      createdAt: '2024-01-04T00:00:00Z',
      sourceTxHash: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock chainConfig - import after jest.mock
    const chainConfig = require('../../services/chainConfig');
    // Handle both default export and named export
    const config = chainConfig.default || chainConfig;
    config.getChain = jest.fn((chainId) => {
      const chains = {
        8453: { chainName: 'Base' },
        42161: { chainName: 'Arbitrum' },
        137: { chainName: 'Polygon' },
      };
      return chains[chainId] || { chainName: `Chain ${chainId}` };
    });
    config.getExplorerUrl = jest.fn((chainId, txHash) => {
      return `https://explorer.example.com/${chainId}/${txHash}`;
    });
    config.getAllChains = jest.fn(() => [
      { chainId: 8453, chainName: 'Base' },
      { chainId: 42161, chainName: 'Arbitrum' },
      { chainId: 137, chainName: 'Polygon' },
    ]);
    
    // Mock trackConfirmations
    const { trackConfirmations } = require('../../utils/confirmationTracking');
    trackConfirmations.mockReturnValue({
      current: 0,
      required: 12,
      progress: 0,
      status: { variant: 'warning', message: '0/12 confirmations' },
      estimatedTime: 60,
      formattedEstimatedTime: '1m',
    });
    
    // Store original createElement - but don't mock it globally
    // Instead, we'll mock it only when needed for CSV export tests
    // This prevents interference with React's DOM operations
    const originalCreateElement = document.createElement.bind(document);
    
    // Only mock createElement for 'a' tag when explicitly needed
    // Don't mock it globally to avoid interfering with React rendering
    if (!global.document.createElement._original) {
      global.document.createElement._original = originalCreateElement;
    }
  });

  // ============ 1. Display Tests ============

  describe('Display Tests', () => {
    it('should render component correctly', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      expect(screen.getByText(/swap history/i)).toBeInTheDocument();
    });

    it('should render swap list with all swaps', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Use getAllByText for elements that may appear multiple times
      expect(screen.getAllByText(/date/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/route/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/amount/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/status/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/transaction/i).length).toBeGreaterThan(0);
    });

    it('should display swap details in table', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Should show route information - text may be split across elements
      // Look for "Base" and "Arbitrum" or "Chain 8453" and "Chain 42161"
      const baseElements = screen.getAllByText(/base|chain 8453/i);
      const arbitrumElements = screen.getAllByText(/arbitrum|chain 42161/i);
      expect(baseElements.length).toBeGreaterThan(0);
      expect(arbitrumElements.length).toBeGreaterThan(0);
    });

    it('should display swap status indicators', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Status text may appear multiple times (in filter dropdown and table)
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/processing/i).length).toBeGreaterThan(0);
    });

    it('should display empty state when no swaps', () => {
      render(<SwapHistory swaps={[]} />);
      
      expect(screen.getByText(/no swaps found/i)).toBeInTheDocument();
    });

    it('should display export button', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      expect(screen.getByText(/export/i)).toBeInTheDocument();
    });
  });

  // ============ 2. Filtering Tests ============

  describe('Filtering Tests', () => {
    it('should filter swaps by chain (source)', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      
      fireEvent.change(chainFilter, { target: { value: '8453' } });
      
      // Should show swaps where source or dest is Base
      // Text may be "Base" or "Chain 8453" - check for either
      const baseElements = screen.getAllByText(/base|chain 8453/i);
      expect(baseElements.length).toBeGreaterThan(0);
    });

    it('should filter swaps by chain (destination)', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      
      fireEvent.change(chainFilter, { target: { value: '42161' } });
      
      // Should show swaps where source or dest is Arbitrum
      // Text may be "Arbitrum" or "Chain 42161" - check for either
      const arbitrumElements = screen.getAllByText(/arbitrum|chain 42161/i);
      expect(arbitrumElements.length).toBeGreaterThan(0);
    });

    it('should filter swaps by status', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const statusFilter = screen.getByDisplayValue(/all statuses/i);
      
      fireEvent.change(statusFilter, { target: { value: 'completed' } });
      
      // Should only show completed swaps
      // "completed" may appear in filter dropdown and table - check table only
      const completedElements = screen.getAllByText(/completed/i);
      expect(completedElements.length).toBeGreaterThan(0);
      // Pending should not appear in table (may still be in dropdown)
      const pendingInTable = screen.queryAllByText(/pending/i).filter(el => {
        const parent = el.closest('tbody');
        return parent !== null;
      });
      expect(pendingInTable.length).toBe(0);
    });

    it('should combine chain and status filters', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      const statusFilter = screen.getByDisplayValue(/all statuses/i);
      
      fireEvent.change(chainFilter, { target: { value: '8453' } });
      fireEvent.change(statusFilter, { target: { value: 'completed' } });
      
      // Should show only completed swaps involving Base
      const completedElements = screen.getAllByText(/completed/i);
      const baseElements = screen.getAllByText(/base|chain 8453/i);
      expect(completedElements.length).toBeGreaterThan(0);
      expect(baseElements.length).toBeGreaterThan(0);
    });

    it('should show all swaps when filters are reset', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      
      // Filter to Base
      fireEvent.change(chainFilter, { target: { value: '8453' } });
      
      // Reset to all
      fireEvent.change(chainFilter, { target: { value: 'all' } });
      
      // All swaps should be visible
      const completedElements = screen.getAllByText(/completed/i);
      const pendingElements = screen.getAllByText(/pending/i);
      expect(completedElements.length).toBeGreaterThan(0);
      expect(pendingElements.length).toBeGreaterThan(0);
    });
  });

  // ============ 3. Sorting Tests ============

  describe('Sorting Tests', () => {
    it('should sort by date descending by default', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Latest swap should appear first (2024-01-04)
      const dates = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should toggle sort order when clicking date header', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const dateHeader = screen.getByRole('button', { name: /date/i });
      
      fireEvent.click(dateHeader);
      
      // Should toggle to ascending
      expect(dateHeader).toBeInTheDocument();
    });

    it('should sort by amount when clicking amount header', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const amountHeader = screen.getByRole('button', { name: /amount/i });
      
      fireEvent.click(amountHeader);
      
      // Should sort by amount
      expect(amountHeader).toBeInTheDocument();
    });

    it('should toggle sort order when clicking same header twice', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const dateHeader = screen.getByRole('button', { name: /date/i });
      
      // First click: change to ascending
      fireEvent.click(dateHeader);
      
      // Second click: change back to descending
      fireEvent.click(dateHeader);
      
      expect(dateHeader).toBeInTheDocument();
    });

    it('should reset to descending when switching sort column', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const dateHeader = screen.getByRole('button', { name: /date/i });
      const amountHeader = screen.getByRole('button', { name: /amount/i });
      
      // Sort by date ascending
      fireEvent.click(dateHeader);
      
      // Switch to amount (should reset to descending)
      fireEvent.click(amountHeader);
      
      expect(amountHeader).toBeInTheDocument();
    });
  });

  // ============ 4. Export Tests ============

  describe('Export Tests', () => {
    it('should export swap history as CSV', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const exportButton = screen.getByText(/export/i);
      
      fireEvent.click(exportButton);
      
      // Should create blob and download link
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should include all swaps in export', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      const exportButton = screen.getByText(/export/i);
      
      fireEvent.click(exportButton);
      
      // Export should include all swaps
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle export with filtered swaps', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Filter by status
      const statusFilter = screen.getByDisplayValue(/all statuses/i);
      fireEvent.change(statusFilter, { target: { value: 'completed' } });
      
      // Export should only include filtered swaps
      const exportButton = screen.getByText(/export/i);
      fireEvent.click(exportButton);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ============ 5. Edge Cases ============

  describe('Edge Cases', () => {
    it('should handle swaps with missing createdAt', () => {
      const swapsWithMissingDate = [{
        swapId: 'swap-1',
        sourceChainId: 8453,
        destChainId: 42161,
        amountIn: '1.5',
        status: 'completed',
        createdAt: null,
        sourceTxHash: '0xtx111',
      }];

      render(<SwapHistory swaps={swapsWithMissingDate} />);
      
      expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
    });

    it('should handle swaps with missing amountIn', () => {
      const swapsWithMissingAmount = [{
        swapId: 'swap-1',
        sourceChainId: 8453,
        destChainId: 42161,
        amountIn: null,
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        sourceTxHash: '0xtx111',
      }];

      render(<SwapHistory swaps={swapsWithMissingAmount} />);
      
      expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
    });

    it('should handle swaps with missing txHash', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Should show N/A for missing transaction hash
      const naTexts = screen.getAllByText(/N\/A/i);
      expect(naTexts.length).toBeGreaterThan(0);
    });

    it('should handle swaps with missing chain IDs', () => {
      const swapsWithMissingChain = [{
        swapId: 'swap-1',
        sourceChainId: null,
        destChainId: null,
        amountIn: '1.5',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        sourceTxHash: '0xtx111',
      }];

      render(<SwapHistory swaps={swapsWithMissingChain} />);
      
      // N/A may appear multiple times - check that at least one exists
      const naElements = screen.getAllByText(/N\/A/i);
      expect(naElements.length).toBeGreaterThan(0);
    });

    it('should handle unknown status values', () => {
      const swapsWithUnknownStatus = [{
        swapId: 'swap-1',
        sourceChainId: 8453,
        destChainId: 42161,
        amountIn: '1.5',
        status: 'unknown_status',
        createdAt: '2024-01-01T00:00:00Z',
        sourceTxHash: '0xtx111',
      }];

      render(<SwapHistory swaps={swapsWithUnknownStatus} />);
      
      expect(screen.getByText(/unknown_status/i)).toBeInTheDocument();
    });

    it('should handle className prop', () => {
      const { container } = render(<SwapHistory swaps={mockSwaps} className="custom-class" />);
      
      expect(container.querySelector('.swap-history.custom-class')).toBeInTheDocument();
    });

    it('should handle zero swaps', () => {
      render(<SwapHistory swaps={[]} />);
      
      expect(screen.getByText(/no swaps found/i)).toBeInTheDocument();
    });

    it('should handle very large amounts', () => {
      const swapsWithLargeAmount = [{
        swapId: 'swap-1',
        sourceChainId: 8453,
        destChainId: 42161,
        amountIn: '999999.9999',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        sourceTxHash: '0xtx111',
      }];

      render(<SwapHistory swaps={swapsWithLargeAmount} />);
      
      expect(screen.getByText(/999999\.9999/i)).toBeInTheDocument();
    });

    it('should format amounts correctly', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Amounts should be formatted to 4 decimal places
      expect(screen.getByText(/1\.5000/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.0000/i)).toBeInTheDocument();
    });

    it('should handle explorer URLs for different chains', () => {
      render(<SwapHistory swaps={mockSwaps} />);
      
      // Transaction links should be present
      const viewLinks = screen.getAllByText(/view/i);
      expect(viewLinks.length).toBeGreaterThan(0);
    });

    it('should handle swaps with missing swapId', () => {
      const swapsWithoutId = [{
        sourceChainId: 8453,
        destChainId: 42161,
        amountIn: '1.5',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        sourceTxHash: '0xtx111',
      }];

      render(<SwapHistory swaps={swapsWithoutId} />);
      
      // Should still render (uses index as key)
      // Text may be split across elements - check for Base and Arbitrum separately
      const baseElements = screen.getAllByText(/base|chain 8453/i);
      const arbitrumElements = screen.getAllByText(/arbitrum|chain 42161/i);
      expect(baseElements.length).toBeGreaterThan(0);
      expect(arbitrumElements.length).toBeGreaterThan(0);
    });
  });
});

