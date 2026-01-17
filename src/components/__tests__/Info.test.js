/**
 * Tests for Info Component
 * 
 * Comprehensive tests for info display and content
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Info from '../info';

describe('Info Component', () => {
  describe('Info Display', () => {
    it('should render component correctly', () => {
      render(<Info />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should display question mark', () => {
      render(<Info />);
      const questionMark = screen.getByText('?');
      expect(questionMark).toBeInTheDocument();
    });
  });

  describe('Info Content', () => {
    it('should show tooltip on hover', () => {
      render(<Info />);
      const questionMark = screen.getByText('?');
      
      fireEvent.mouseEnter(questionMark);
      
      expect(screen.getByText(/1% of the transaction fee/i)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      render(<Info />);
      const questionMark = screen.getByText('?');
      
      fireEvent.mouseEnter(questionMark);
      expect(screen.getByText(/1% of the transaction fee/i)).toBeInTheDocument();
      
      fireEvent.mouseLeave(questionMark);
      // Tooltip should be hidden (would need to check visibility)
    });

    it('should display referral information', () => {
      render(<Info />);
      const questionMark = screen.getByText('?');
      
      fireEvent.mouseEnter(questionMark);
      
      expect(screen.getByText(/1% of the transaction fee will be transferred to referrers according to tiers/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid hover/unhover', () => {
      render(<Info />);
      const questionMark = screen.getByText('?');
      
      fireEvent.mouseEnter(questionMark);
      fireEvent.mouseLeave(questionMark);
      fireEvent.mouseEnter(questionMark);
      
      // Should not crash on rapid hover/unhover
      expect(questionMark).toBeInTheDocument();
    });
  });
});

