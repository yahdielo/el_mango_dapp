/**
 * Tests for AboutUs Component
 * 
 * Comprehensive tests for about page rendering and content display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutUs from '../aboutUs';

describe('AboutUs Component', () => {
  describe('About Page Rendering', () => {
    it('should render component correctly', () => {
      render(<AboutUs />);
      expect(screen.getByText(/about us/i)).toBeInTheDocument();
    });

    it('should render About Us heading', () => {
      render(<AboutUs />);
      expect(screen.getByText(/about us/i)).toBeInTheDocument();
    });

    it('should render Mango logo image', () => {
      render(<AboutUs />);
      const image = screen.getByAltText('Mango Logo');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should display about content', () => {
      render(<AboutUs />);
      expect(screen.getByText(/mangodefi es un telegram mini app/i)).toBeInTheDocument();
    });

    it('should display mission statement', () => {
      render(<AboutUs />);
      expect(screen.getByText(/not your key not your crypto/i)).toBeInTheDocument();
    });

    it('should display value proposition', () => {
      render(<AboutUs />);
      expect(screen.getByText(/mangodefi no deseamos controlar/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render with correct layout structure', () => {
      const { container } = render(<AboutUs />);
      // Should have container structure
      expect(container.querySelector('.container')).toBeInTheDocument();
    });
  });
});

