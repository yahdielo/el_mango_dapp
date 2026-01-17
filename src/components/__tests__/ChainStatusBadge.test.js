/**
 * Tests for ChainStatusBadge Component
 * 
 * Comprehensive tests for chain status badge rendering, loading states,
 * status display, and different chain IDs.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ChainStatusBadge from '../ChainStatusBadge';
import { useChainStatus } from '../../hooks/useChainStatus';

// Mock useChainStatus hook
jest.mock('../../hooks/useChainStatus');

describe('ChainStatusBadge Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Component Rendering', () => {
        test('should render component', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        test('should apply custom className', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            const { container } = render(<ChainStatusBadge chainId={8453} className="custom-class" />);
            const badge = container.querySelector('.badge');
            expect(badge).toHaveClass('custom-class');
        });
    });

    describe('Loading State', () => {
        test('should show loading spinner when loading', () => {
            useChainStatus.mockReturnValue({
                status: null,
                loading: true,
            });

            render(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        test('should show secondary badge when loading', () => {
            useChainStatus.mockReturnValue({
                status: null,
                loading: true,
            });

            const { container } = render(<ChainStatusBadge chainId={8453} />);
            const badge = container.querySelector('.badge');
            expect(badge).toHaveClass('bg-secondary');
        });
    });

    describe('Active Status Display', () => {
        test('should display active status correctly', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Active');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-success');
        });

        test('should display operational status as active', () => {
            useChainStatus.mockReturnValue({
                status: 'operational',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Operational');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-success');
        });

        test('should handle status object format', () => {
            useChainStatus.mockReturnValue({
                status: { status: 'active' },
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });
    });

    describe('Maintenance Status Display', () => {
        test('should display maintenance status correctly', () => {
            useChainStatus.mockReturnValue({
                status: 'maintenance',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Maintenance');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-warning');
        });

        test('should display degraded status as maintenance', () => {
            useChainStatus.mockReturnValue({
                status: 'degraded',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Degraded');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-warning');
        });
    });

    describe('Inactive Status Display', () => {
        test('should display inactive status correctly', () => {
            useChainStatus.mockReturnValue({
                status: 'inactive',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Inactive');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-danger');
        });

        test('should display offline status as inactive', () => {
            useChainStatus.mockReturnValue({
                status: 'offline',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Offline');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-danger');
        });
    });

    describe('Unknown Status Handling', () => {
        test('should handle unknown status', () => {
            useChainStatus.mockReturnValue({
                status: 'unknown',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText(/unknown/i);
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-secondary');
        });

        test('should default to active when status is null', () => {
            useChainStatus.mockReturnValue({
                status: null,
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        test('should default to active when status is undefined', () => {
            useChainStatus.mockReturnValue({
                status: undefined,
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        test('should handle unrecognized status value', () => {
            useChainStatus.mockReturnValue({
                status: 'custom-status',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            const badge = screen.getByText('Custom-status');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('bg-secondary');
        });
    });

    describe('Different Chain IDs', () => {
        test('should work with Base chain (8453)', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={8453} />);
            expect(useChainStatus).toHaveBeenCalledWith(8453);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        test('should work with Arbitrum chain (42161)', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={42161} />);
            expect(useChainStatus).toHaveBeenCalledWith(42161);
        });

        test('should work with Ethereum chain (1)', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={1} />);
            expect(useChainStatus).toHaveBeenCalledWith(1);
        });

        test('should work with Tron chain (728126428)', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={728126428} />);
            expect(useChainStatus).toHaveBeenCalledWith(728126428);
        });

        test('should work with Solana chain (501111)', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={501111} />);
            expect(useChainStatus).toHaveBeenCalledWith(501111);
        });

        test('should work with Bitcoin chain (0)', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={0} />);
            expect(useChainStatus).toHaveBeenCalledWith(0);
        });
    });

    describe('Status Transitions', () => {
        test('should update when status changes', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });
            const { rerender } = render(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Active')).toBeInTheDocument();

            useChainStatus.mockReturnValue({
                status: 'maintenance',
                loading: false,
            });
            rerender(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Maintenance')).toBeInTheDocument();
        });

        test('should update when loading state changes', () => {
            useChainStatus.mockReturnValue({
                status: null,
                loading: true,
            });
            const { rerender } = render(<ChainStatusBadge chainId={8453} />);
            rerender(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });
            rerender(<ChainStatusBadge chainId={8453} />);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing chainId gracefully', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={null} />);
            expect(useChainStatus).toHaveBeenCalledWith(null);
        });

        test('should handle invalid chainId', () => {
            useChainStatus.mockReturnValue({
                status: 'active',
                loading: false,
            });

            render(<ChainStatusBadge chainId={99999} />);
            expect(useChainStatus).toHaveBeenCalledWith(99999);
        });
    });
});

