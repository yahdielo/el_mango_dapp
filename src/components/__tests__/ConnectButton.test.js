/**
 * Tests for ConnectButton Component (ConnectedButton)
 * 
 * Comprehensive tests for connection button rendering and status
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ConnectedButton from '../connectButton';

describe('ConnectButton Component', () => {
  describe('Connection Button Rendering', () => {
    it('should render component correctly', () => {
      render(<ConnectedButton />);
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('should render connected button', () => {
      render(<ConnectedButton />);
      const button = screen.getByText(/connected/i);
      expect(button).toBeInTheDocument();
    });

    it('should have correct styling', () => {
      render(<ConnectedButton />);
      const button = screen.getByText(/connected/i);
      expect(button).toHaveClass('w-100');
    });
  });

  describe('Connection Status', () => {
    it('should display connected status', () => {
      render(<ConnectedButton />);
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing chain prop', () => {
      render(<ConnectedButton chain={null} />);
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });
});

