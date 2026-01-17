/**
 * Tests for Tokenomics Component
 * 
 * Comprehensive tests for tokenomics page rendering and data display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Tokenomics from '../tokenomics';

describe('Tokenomics Component', () => {
  describe('Tokenomics Page Rendering', () => {
    it('should render component correctly', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/\$mango tokenomics/i)).toBeInTheDocument();
    });

    it('should render tokenomics heading', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/\$mango tokenomics/i)).toBeInTheDocument();
    });

    it('should render token supply heading', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/token supply:/i)).toBeInTheDocument();
    });
  });

  describe('Tokenomics Data Display', () => {
    it('should display total token supply', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/100,000,000,000/i)).toBeInTheDocument();
    });

    it('should display token distribution heading', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/token distribution:/i)).toBeInTheDocument();
    });

    it('should display dev wallet distribution', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/10% dev wallet/i)).toBeInTheDocument();
      expect(screen.getByText(/5% locked.*1\.5 years/i)).toBeInTheDocument();
    });

    it('should display burned tokens', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/10% burned/i)).toBeInTheDocument();
    });

    it('should display presale distribution', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/42% pre-sale/i)).toBeInTheDocument();
    });

    it('should display airdrop distribution', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/11% holders airdrop in phases/i)).toBeInTheDocument();
    });

    it('should display airdrop phase details', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/phase 1: 2\.75%/i)).toBeInTheDocument();
      expect(screen.getByText(/phase 2: 2\.75%/i)).toBeInTheDocument();
      expect(screen.getByText(/phase 3: 2\.75%/i)).toBeInTheDocument();
      expect(screen.getByText(/phase 4: 2\.75%/i)).toBeInTheDocument();
    });

    it('should display phase timing information', () => {
      render(<Tokenomics />);
      expect(screen.getByText(/3 months after launched/i)).toBeInTheDocument();
      expect(screen.getByText(/6 months after launched/i)).toBeInTheDocument();
      expect(screen.getByText(/1 year after launched/i)).toBeInTheDocument();
      expect(screen.getByText(/1\.5 years after launched/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render with correct layout structure', () => {
      const { container } = render(<Tokenomics />);
      // Should have container structure
      expect(container.querySelector('.container')).toBeInTheDocument();
    });

    it('should display all distribution percentages correctly', () => {
      render(<Tokenomics />);
      // Verify all percentages are displayed
      // Use getAllByText for 10% since it appears twice (Dev wallet and Burned)
      const tenPercentElements = screen.getAllByText(/10%/i);
      expect(tenPercentElements.length).toBeGreaterThanOrEqual(1); // At least one 10% should be found
      expect(screen.getByText(/42%/i)).toBeInTheDocument(); // Presale
      expect(screen.getByText(/11%/i)).toBeInTheDocument(); // Airdrop
    });
  });
});

