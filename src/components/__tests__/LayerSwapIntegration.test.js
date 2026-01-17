/**
 * Tests for LayerSwapIntegration Component
 * 
 * Comprehensive tests for LayerSwap UI display, swap initiation,
 * status polling, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LayerSwapIntegration from '../LayerSwapIntegration';
import { useLayerSwap } from '../../hooks/useLayerSwap';
import chainConfig from '../../services/chainConfig';
import SwapProgress from '../SwapProgress';

// Mock dependencies
jest.mock('../../hooks/useLayerSwap');
jest.mock('../../services/chainConfig');
jest.mock('../SwapProgress', () => ({
    __esModule: true,
    default: ({ swapStatus, onCancel }) => (
        <div data-testid="swap-progress">
            Swap Progress: {swapStatus?.status}
            {onCancel && <button onClick={onCancel}>Cancel</button>}
        </div>
    ),
}));

describe('LayerSwapIntegration Component', () => {
    const mockInitiateSwap = jest.fn();
    const mockCancelSwap = jest.fn();
    const mockOnSwapComplete = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                501111: { chainId: '501111', chainName: 'Solana', type: 'SOLANA' },
                0: { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN' },
            };
            return chains[chainId];
        });
        chainConfig.requiresLayerSwap.mockImplementation((chainId) => {
            return chainId === 501111 || chainId === 0;
        });
    });

    describe('LayerSwap UI Display', () => {
        test('should render component when chains are provided', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                    amount="1.0"
                    token={{ address: '0xToken' }}
                />
            );

            expect(screen.getByText('LayerSwap Integration')).toBeInTheDocument();
        });

        test('should show info message when chains not selected', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={null}
                    destChainId={null}
                />
            );

            expect(screen.getByText('Please select source and destination chains')).toBeInTheDocument();
        });

        test('should not render when LayerSwap not required', () => {
            chainConfig.requiresLayerSwap.mockReturnValue(false);

            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            const { container } = render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={42161}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Instructions Display', () => {
        test('should show instructions by default', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            expect(screen.getByText('How LayerSwap Works')).toBeInTheDocument();
        });

        test('should toggle instructions visibility', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            const toggleButton = screen.getByText('Hide Instructions');
            fireEvent.click(toggleButton);

            expect(screen.queryByText('How LayerSwap Works')).not.toBeInTheDocument();
        });

        test('should show LayerSwap requirement warning', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            expect(screen.getByText(/requires LayerSwap integration/)).toBeInTheDocument();
        });
    });

    describe('Swap Initiation', () => {
        test('should initiate swap when button clicked', async () => {
            mockInitiateSwap.mockResolvedValue({ swapId: 'swap-123' });

            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                    amount="1.0"
                    token={{ address: '0xToken' }}
                    onSwapComplete={mockOnSwapComplete}
                />
            );

            const initiateButton = screen.getByText(/Initiate LayerSwap/);
            fireEvent.click(initiateButton);

            await waitFor(() => {
                expect(mockInitiateSwap).toHaveBeenCalledWith({
                    sourceChainId: 8453,
                    destChainId: 501111,
                    tokenIn: '0xToken',
                    tokenOut: '0xToken',
                    amountIn: '1.0',
                });
            });
        });

        test('should call onSwapComplete after successful initiation', async () => {
            const mockResult = { swapId: 'swap-123', status: 'pending' };
            mockInitiateSwap.mockResolvedValue(mockResult);

            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                    amount="1.0"
                    token={{ address: '0xToken' }}
                    onSwapComplete={mockOnSwapComplete}
                />
            );

            const initiateButton = screen.getByText(/Initiate LayerSwap/);
            fireEvent.click(initiateButton);

            await waitFor(() => {
                expect(mockOnSwapComplete).toHaveBeenCalledWith(mockResult);
            });
        });

        test('should disable button when loading', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: true,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                    amount="1.0"
                    token={{ address: '0xToken' }}
                />
            );

            const button = screen.getByText(/Initiating Swap/);
            expect(button.closest('button')).toBeDisabled();
        });

        test('should disable button when amount or token missing', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            const button = screen.getByText(/Initiate LayerSwap/);
            expect(button.closest('button')).toBeDisabled();
        });
    });

    describe('Status Polling', () => {
        test('should show swap progress when swap is in progress', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: {
                    swapId: 'swap-123',
                    status: 'processing',
                    progress: 50,
                },
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            expect(screen.getByTestId('swap-progress')).toBeInTheDocument();
            expect(screen.getByText('Swap in Progress')).toBeInTheDocument();
        });

        test('should show pending swap status', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: {
                    swapId: 'swap-123',
                    status: 'pending',
                    depositAddress: '0xDepositAddress',
                },
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            expect(screen.getByText('Swap Initiated')).toBeInTheDocument();
            expect(screen.getByText('0xDepositAddress')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        test('should display error message', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: 'Insufficient balance',
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            // Error message format: "Error:" followed by message on next line
            expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
        });

        test('should handle swap initiation errors', async () => {
            mockInitiateSwap.mockRejectedValue(new Error('Swap failed'));

            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                    amount="1.0"
                    token={{ address: '0xToken' }}
                />
            );

            const initiateButton = screen.getByText(/Initiate LayerSwap/);
            fireEvent.click(initiateButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Swap Cancellation', () => {
        test('should cancel swap when cancel button clicked', async () => {
            mockCancelSwap.mockResolvedValue(true);

            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: {
                    swapId: 'swap-123',
                    status: 'processing',
                },
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            await waitFor(() => {
                expect(mockCancelSwap).toHaveBeenCalledWith('swap-123');
            });
        });

        test('should handle cancel errors gracefully', async () => {
            mockCancelSwap.mockRejectedValue(new Error('Cancel failed'));

            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: {
                    swapId: 'swap-123',
                    status: 'processing',
                },
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Swap Details Display', () => {
        test('should display source and destination chains', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            // "Base" and "Solana" may appear multiple times (in chain selector, badge, detail rows)
            // Use getAllByText and filter to find elements within swap-details section
            const baseElements = screen.getAllByText(/Base/i);
            const solanaElements = screen.getAllByText(/Solana/i);
            
            // Verify chain names appear in the swap details section
            const swapDetailsSection = document.querySelector('.swap-details');
            expect(swapDetailsSection).toBeInTheDocument();
            
            const baseInDetails = baseElements.find(el => swapDetailsSection.contains(el));
            const solanaInDetails = solanaElements.find(el => swapDetailsSection.contains(el));
            expect(baseInDetails).toBeInTheDocument();
            expect(solanaInDetails).toBeInTheDocument();
        });

        test('should display amount when provided', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                    amount="1.5"
                />
            );

            expect(screen.getByText('1.5')).toBeInTheDocument();
        });

        test('should show LayerSwap badge for chains requiring LayerSwap', () => {
            useLayerSwap.mockReturnValue({
                initiateSwap: mockInitiateSwap,
                swapStatus: null,
                loading: false,
                error: null,
                cancelSwap: mockCancelSwap,
            });

            render(
                <LayerSwapIntegration
                    sourceChainId={8453}
                    destChainId={501111}
                />
            );

            const badges = screen.getAllByText('LayerSwap');
            expect(badges.length).toBeGreaterThan(0);
        });
    });
});

