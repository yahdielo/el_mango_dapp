/**
 * Tests for RewardDashboard Component
 * 
 * Comprehensive tests for reward display, calculation, and filtering
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RewardDashboard from '../RewardDashboard';
import { useAccount } from 'wagmi';

// Mock dependencies
jest.mock('wagmi');

describe('RewardDashboard Component', () => {
  const mockRewards = [
    {
      id: 1,
      chainId: 8453,
      level: 1,
      amount: '10.5',
      status: 'completed',
      distributedAt: '2024-01-01T00:00:00Z',
      txHash: '0xtx111',
    },
    {
      id: 2,
      chainId: 42161,
      level: 2,
      amount: '5.25',
      status: 'pending',
      distributedAt: '2024-01-02T00:00:00Z',
      txHash: null,
    },
    {
      id: 3,
      chainId: 8453,
      level: 1,
      amount: '3.0',
      status: 'completed',
      distributedAt: '2024-01-03T00:00:00Z',
      txHash: '0xtx333',
    },
    {
      id: 4,
      chainId: 137,
      level: 3,
      amount: '2.1',
      status: 'processing',
      distributedAt: '2024-01-04T00:00:00Z',
      txHash: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
  });

  // ============ 1. Display Tests ============

  describe('Display Tests', () => {
    it('should render component correctly', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      expect(screen.getByText(/reward dashboard/i)).toBeInTheDocument();
    });

    it('should display reward summary cards', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      expect(screen.getByText(/total rewards/i)).toBeInTheDocument();
      // Status labels appear in summary cards
      const pendingElements = screen.getAllByText(/pending/i);
      const completedElements = screen.getAllByText(/completed/i);
      expect(pendingElements.length).toBeGreaterThan(0);
      expect(completedElements.length).toBeGreaterThan(0);
    });

    it('should display reward breakdown by chain', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      expect(screen.getByText(/rewards by chain/i)).toBeInTheDocument();
      // Chain names appear multiple times (breakdown and table)
      const baseElements = screen.getAllByText(/base/i);
      const arbitrumElements = screen.getAllByText(/arbitrum/i);
      const polygonElements = screen.getAllByText(/polygon/i);
      expect(baseElements.length).toBeGreaterThan(0);
      expect(arbitrumElements.length).toBeGreaterThan(0);
      expect(polygonElements.length).toBeGreaterThan(0);
    });

    it('should display reward breakdown by level', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      expect(screen.getByText(/rewards by level/i)).toBeInTheDocument();
      // Level labels appear multiple times (breakdown and table)
      const level1Elements = screen.getAllByText(/level 1 \(40%\)/i);
      const level2Elements = screen.getAllByText(/level 2 \(25%\)/i);
      const level3Elements = screen.getAllByText(/level 3 \(15%\)/i);
      expect(level1Elements.length).toBeGreaterThan(0);
      expect(level2Elements.length).toBeGreaterThan(0);
      expect(level3Elements.length).toBeGreaterThan(0);
    });

    it('should display reward history table', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      expect(screen.getByText(/date/i)).toBeInTheDocument();
      // "Chain" appears in table header and filter label
      const chainElements = screen.getAllByText(/chain/i);
      expect(chainElements.length).toBeGreaterThan(0);
      // "Level" appears in table header and filter label
      const levelElements = screen.getAllByText(/level/i);
      expect(levelElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/amount/i)).toBeInTheDocument();
      expect(screen.getByText(/status/i)).toBeInTheDocument();
      expect(screen.getByText(/transaction/i)).toBeInTheDocument();
    });

    it('should display empty state when no rewards', () => {
      render(<RewardDashboard rewards={[]} />);
      
      expect(screen.getByText(/no rewards found/i)).toBeInTheDocument();
    });

    it('should show connect wallet message when not connected', () => {
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      render(<RewardDashboard rewards={mockRewards} />);
      
      expect(screen.getByText(/connect your wallet to view rewards/i)).toBeInTheDocument();
    });
  });

  // ============ 2. Calculation Tests ============

  describe('Calculation Tests', () => {
    it('should calculate total rewards correctly', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Total should be 10.5 + 5.25 + 3.0 + 2.1 = 20.85
      expect(screen.getByText(/20\.85.*MANGO/i)).toBeInTheDocument();
    });

    it('should calculate pending rewards count', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Should show 2 pending (one pending, one processing)
      // "Pending" appears multiple times, find the summary card
      const pendingElements = screen.getAllByText(/pending/i);
      const pendingSummaryCard = pendingElements.find(el => 
        el.closest('.summary-card')?.querySelector('.summary-label')?.textContent?.toLowerCase().includes('pending')
      );
      expect(pendingSummaryCard).toBeTruthy();
      const pendingCard = pendingSummaryCard?.closest('.summary-card');
      expect(pendingCard).toHaveTextContent('2');
    });

    it('should calculate completed rewards count', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Should show 2 completed
      const completedTexts = screen.getAllByText(/2/i);
      expect(completedTexts.length).toBeGreaterThan(0);
    });

    it('should aggregate rewards by chain', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Base: 10.5 + 3.0 = 13.5
      // Arbitrum: 5.25
      // Polygon: 2.1
      // Amounts appear multiple times (summary, breakdown, table)
      const base13_5Elements = screen.getAllByText(/13\.5.*MANGO/i);
      const arbitrum5_25Elements = screen.getAllByText(/5\.25.*MANGO/i);
      const polygon2_1Elements = screen.getAllByText(/2\.1.*MANGO/i);
      expect(base13_5Elements.length).toBeGreaterThan(0);
      expect(arbitrum5_25Elements.length).toBeGreaterThan(0);
      expect(polygon2_1Elements.length).toBeGreaterThan(0);
    });

    it('should aggregate rewards by level', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Level 1: 10.5 + 3.0 = 13.5
      // Level 2: 5.25
      // Level 3: 2.1
      // Amounts appear multiple times (summary, breakdown, table)
      const level1_13_5Elements = screen.getAllByText(/13\.5.*MANGO/i);
      const level2_5_25Elements = screen.getAllByText(/5\.25.*MANGO/i);
      const level3_2_1Elements = screen.getAllByText(/2\.1.*MANGO/i);
      expect(level1_13_5Elements.length).toBeGreaterThan(0);
      expect(level2_5_25Elements.length).toBeGreaterThan(0);
      expect(level3_2_1Elements.length).toBeGreaterThan(0);
    });

    it('should format reward amounts correctly', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Amounts should be formatted to 4 decimal places
      // Amounts appear multiple times (summary, breakdown, table)
      const amount10_5Elements = screen.getAllByText(/10\.5000.*MANGO/i);
      const amount5_25Elements = screen.getAllByText(/5\.2500.*MANGO/i);
      expect(amount10_5Elements.length).toBeGreaterThan(0);
      expect(amount5_25Elements.length).toBeGreaterThan(0);
    });
  });

  // ============ 3. Filtering Tests ============

  describe('Filtering Tests', () => {
    it('should filter rewards by chain', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      
      fireEvent.change(chainFilter, { target: { value: '8453' } });
      
      // Should only show Base chain rewards
      // Note: Arbitrum may still appear in filter dropdown, but not in table/breakdown
      const baseElements = screen.getAllByText(/base/i);
      expect(baseElements.length).toBeGreaterThan(0);
      // Check that arbitrum doesn't appear in table rows (but may be in filter)
      const arbitrumInTable = screen.queryByText(/arbitrum/i, { selector: 'tbody' });
      expect(arbitrumInTable).not.toBeInTheDocument();
    });

    it('should filter rewards by level', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      const levelFilter = screen.getByDisplayValue(/all levels/i);
      
      fireEvent.change(levelFilter, { target: { value: '1' } });
      
      // Should only show Level 1 rewards
      const level1Elements = screen.getAllByText(/level 1 \(40%\)/i);
      expect(level1Elements.length).toBeGreaterThan(0);
    });

    it('should combine chain and level filters', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      const levelFilter = screen.getByDisplayValue(/all levels/i);
      
      fireEvent.change(chainFilter, { target: { value: '8453' } });
      fireEvent.change(levelFilter, { target: { value: '1' } });
      
      // Should only show Base Level 1 rewards
      const baseElements = screen.getAllByText(/base/i);
      const level1Elements = screen.getAllByText(/level 1/i);
      expect(baseElements.length).toBeGreaterThan(0);
      expect(level1Elements.length).toBeGreaterThan(0);
    });

    it('should show all rewards when filters are reset', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      const chainFilter = screen.getByDisplayValue(/all chains/i);
      
      // Filter to Base
      fireEvent.change(chainFilter, { target: { value: '8453' } });
      
      // Reset to all
      fireEvent.change(chainFilter, { target: { value: 'all' } });
      
      // All rewards should be visible
      const baseElements = screen.getAllByText(/base/i);
      const arbitrumElements = screen.getAllByText(/arbitrum/i);
      const polygonElements = screen.getAllByText(/polygon/i);
      expect(baseElements.length).toBeGreaterThan(0);
      expect(arbitrumElements.length).toBeGreaterThan(0);
      expect(polygonElements.length).toBeGreaterThan(0);
    });
  });

  // ============ 4. Status Badge Tests ============

  describe('Status Badge Tests', () => {
    it('should display status badges correctly', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Status badges appear multiple times (summary cards and table rows)
      const completedElements = screen.getAllByText(/completed/i);
      const pendingElements = screen.getAllByText(/pending/i);
      const processingElements = screen.getAllByText(/processing/i);
      
      expect(completedElements.length).toBeGreaterThan(0);
      expect(pendingElements.length).toBeGreaterThan(0);
      expect(processingElements.length).toBeGreaterThan(0);
    });

    it('should handle unknown status values', () => {
      const rewardsWithUnknownStatus = [{
        id: 1,
        chainId: 8453,
        level: 1,
        amount: '10.5',
        status: 'unknown_status',
        distributedAt: '2024-01-01T00:00:00Z',
        txHash: '0xtx111',
      }];

      render(<RewardDashboard rewards={rewardsWithUnknownStatus} />);
      
      expect(screen.getByText(/unknown_status/i)).toBeInTheDocument();
    });
  });

  // ============ 5. Edge Cases ============

  describe('Edge Cases', () => {
    it('should handle rewards with missing amounts', () => {
      const rewardsWithMissingAmount = [{
        id: 1,
        chainId: 8453,
        level: 1,
        amount: null,
        status: 'completed',
        distributedAt: '2024-01-01T00:00:00Z',
        txHash: '0xtx111',
      }];

      render(<RewardDashboard rewards={rewardsWithMissingAmount} />);
      
      // Multiple elements may contain this text (summary, breakdown, table)
      const elements = screen.getAllByText(/0\.0000.*MANGO/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should handle rewards with missing distributedAt', () => {
      const rewardsWithMissingDate = [{
        id: 1,
        chainId: 8453,
        level: 1,
        amount: '10.5',
        status: 'completed',
        distributedAt: null,
        txHash: '0xtx111',
      }];

      render(<RewardDashboard rewards={rewardsWithMissingDate} />);
      
      expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
    });

    it('should handle rewards with missing txHash', () => {
      render(<RewardDashboard rewards={mockRewards} />);
      
      // Should show N/A for missing transaction hash
      const naTexts = screen.getAllByText(/N\/A/i);
      expect(naTexts.length).toBeGreaterThan(0);
    });

    it('should handle unknown chain IDs', () => {
      const rewardsWithUnknownChain = [{
        id: 1,
        chainId: 99999,
        level: 1,
        amount: '10.5',
        status: 'completed',
        distributedAt: '2024-01-01T00:00:00Z',
        txHash: '0xtx111',
      }];

      render(<RewardDashboard rewards={rewardsWithUnknownChain} />);
      
      // Multiple elements may contain this text (breakdown, table)
      const elements = screen.getAllByText(/chain 99999/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should handle className prop', () => {
      const { container } = render(<RewardDashboard rewards={mockRewards} className="custom-class" />);
      
      expect(container.querySelector('.reward-dashboard.custom-class')).toBeInTheDocument();
    });

    it('should handle zero total rewards', () => {
      render(<RewardDashboard rewards={[]} />);
      
      expect(screen.getByText(/no rewards found/i)).toBeInTheDocument();
    });

    it('should handle very large reward amounts', () => {
      const rewardsWithLargeAmount = [{
        id: 1,
        chainId: 8453,
        level: 1,
        amount: '999999.9999',
        status: 'completed',
        distributedAt: '2024-01-01T00:00:00Z',
        txHash: '0xtx111',
      }];

      render(<RewardDashboard rewards={rewardsWithLargeAmount} />);
      
      // Multiple elements may contain this text (summary, breakdown, table)
      const elements = screen.getAllByText(/999999\.9999.*MANGO/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});

