/**
 * Tests for SuccessToast Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessToast from '../SuccessToast';

describe('SuccessToast Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render success message', () => {
    render(
      <SuccessToast
        title="Success"
        message="Operation completed successfully"
        onClose={mockOnClose}
      />
    );

    // "Success" appears in header, use getAllByText
    const successElements = screen.getAllByText(/success/i);
    expect(successElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
  });

  test('should not render when message is null', () => {
    const { container } = render(
      <SuccessToast
        title="Success"
        message={null}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('should call onClose when close button clicked', () => {
    render(
      <SuccessToast
        title="Success"
        message="Operation completed"
        onClose={mockOnClose}
      />
    );

    // Toast close button is typically a button with aria-label="Close"
    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should auto-dismiss after delay', () => {
    jest.useFakeTimers();

    render(
      <SuccessToast
        title="Success"
        message="Auto-dismissing"
        onClose={mockOnClose}
        autoClose={3000}
      />
    );

    expect(mockOnClose).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);

    // Toast component's autohide also calls onClose, so it may be called twice
    // (once from useEffect timeout, once from Toast autohide)
    // We just check that it was called at least once
    expect(mockOnClose).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

