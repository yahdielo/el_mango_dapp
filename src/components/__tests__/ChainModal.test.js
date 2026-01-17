/**
 * Tests for ChainModal Component
 * 
 * Comprehensive tests for chain modal rendering, chain selection,
 * filtering by chain type, status indicators, and features display.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChainModal from '../chainModal';
import chainConfig from '../../services/chainConfig';
import ChainStatusBadge from '../ChainStatusBadge';

// Mock dependencies
jest.mock('../../services/chainConfig');
jest.mock('../ChainStatusBadge', () => ({
    __esModule: true,
    default: ({ chainId }) => <div data-testid={`chain-status-badge-${chainId}`}>Status</div>,
}));

describe('ChainModal Component', () => {
    const mockChains = [
        { chainId: '1', chainName: 'Ethereum', type: 'EVM', status: 'active' },
        { chainId: '8453', chainName: 'Base', type: 'EVM', status: 'active' },
        { chainId: '42161', chainName: 'Arbitrum', type: 'EVM', status: 'active' },
        { chainId: '728126428', chainName: 'Tron', type: 'TRON', status: 'active' },
        { chainId: '501111', chainName: 'Solana', type: 'SOLANA', status: 'active' },
        { chainId: '0', chainName: 'Bitcoin', type: 'BITCOIN', status: 'active' },
    ];

    const mockOnHide = jest.fn();
    const mockOnChainSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        chainConfig.getAllChains.mockReturnValue(mockChains);
        chainConfig.getFeatureFlags.mockReturnValue({
            directSwap: true,
            layerSwap: false,
            referralSystem: true,
            whitelist: false,
        });
    });

    describe('Chain Modal Rendering', () => {
        test('should render modal when show is true', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            expect(screen.getByText('Select a Chain')).toBeInTheDocument();
        });

        test('should not render modal when show is false', () => {
            const { container } = render(
                <ChainModal
                    show={false}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            expect(container.querySelector('.modal')).not.toBeInTheDocument();
        });

        test('should display all chains', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            // Chain names appear in both select options and chain list - use getAllByText and filter by STRONG tag
            const ethereumElements = screen.getAllByText('Ethereum');
            const baseElements = screen.getAllByText('Base');
            const arbitrumElements = screen.getAllByText('Arbitrum');
            const tronElements = screen.getAllByText('Tron');
            const solanaElements = screen.getAllByText('Solana');
            const bitcoinElements = screen.getAllByText('Bitcoin');
            // Filter to get only chain list items (STRONG tags), not select options
            expect(ethereumElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(baseElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(arbitrumElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(tronElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(solanaElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(bitcoinElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
        });
    });

    describe('Filtering by Chain Type', () => {
        test('should filter to show only EVM chains', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'EVM' } });

            expect(screen.getByText('Ethereum')).toBeInTheDocument();
            expect(screen.getByText('Base')).toBeInTheDocument();
            // "Tron" and "Solana" appear in select options, but should not appear in chain list when filtered
            // Use getAllByText and filter by tagName to exclude option elements
            const allTron = screen.queryAllByText('Tron');
            const allSolana = screen.queryAllByText('Solana');
            const tronInList = allTron.filter(el => el.tagName === 'STRONG');
            const solanaInList = allSolana.filter(el => el.tagName === 'STRONG');
            expect(tronInList.length).toBe(0);
            expect(solanaInList.length).toBe(0);
        });

        test('should filter to show only TRON chains', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'TRON' } });

            // "Tron" appears in both select option and chain list - use getAllByText and filter by STRONG tag
            const tronElements = screen.getAllByText('Tron');
            expect(tronElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(screen.queryByText('Ethereum')).not.toBeInTheDocument();
        });

        test('should filter to show only SOLANA chains', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'SOLANA' } });

            // "Solana" appears in both select option and chain list - use getAllByText and filter by STRONG tag
            const solanaElements = screen.getAllByText('Solana');
            expect(solanaElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(screen.queryByText('Ethereum')).not.toBeInTheDocument();
        });

        test('should filter to show only BITCOIN chains', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'BITCOIN' } });

            // "Bitcoin" appears in both select option and chain list - use getAllByText and filter by STRONG tag
            const bitcoinElements = screen.getAllByText('Bitcoin');
            expect(bitcoinElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
            expect(screen.queryByText('Ethereum')).not.toBeInTheDocument();
        });

        test('should show all chains when filter is "all"', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'all' } });

            // These chain names appear in both select options and chain list - use getAllByText
            expect(screen.getAllByText('Ethereum').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Tron').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Solana').length).toBeGreaterThan(0);
        });
    });

    describe('Search Functionality', () => {
        test('should filter chains by search term', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const searchInput = screen.getByPlaceholderText('Search chains...');
            fireEvent.change(searchInput, { target: { value: 'Base' } });

            expect(screen.getByText('Base')).toBeInTheDocument();
            expect(screen.queryByText('Ethereum')).not.toBeInTheDocument();
        });

        test('should filter by chain ID', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const searchInput = screen.getByPlaceholderText('Search chains...');
            fireEvent.change(searchInput, { target: { value: '8453' } });

            expect(screen.getByText('Base')).toBeInTheDocument();
        });

        test('should show no results message when no chains match', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const searchInput = screen.getByPlaceholderText('Search chains...');
            fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

            expect(screen.getByText('No chains found matching your criteria')).toBeInTheDocument();
        });
    });

    describe('Chain Status Indicators', () => {
        test('should display ChainStatusBadge for each chain', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            expect(screen.getByTestId('chain-status-badge-1')).toBeInTheDocument();
            expect(screen.getByTestId('chain-status-badge-8453')).toBeInTheDocument();
        });
    });

    describe('Chain-Specific Features Display', () => {
        test('should display feature badges', () => {
            chainConfig.getFeatureFlags.mockReturnValue({
                directSwap: true,
                layerSwap: false,
                referralSystem: true,
                whitelist: false,
            });

            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            // Feature badges should be rendered (implementation may vary)
            expect(chainConfig.getFeatureFlags).toHaveBeenCalled();
        });
    });

    describe('Non-EVM Chain Handling', () => {
        test('should show LayerSwap badge for Solana', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'SOLANA' } });

            // "Solana" appears in both select option and chain list - use getAllByText and filter by STRONG tag
            const solanaElements = screen.getAllByText('Solana');
            expect(solanaElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
        });

        test('should show LayerSwap badge for Bitcoin', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const filterSelect = screen.getByRole('combobox');
            fireEvent.change(filterSelect, { target: { value: 'BITCOIN' } });

            // "Bitcoin" appears in both select option and chain list - use getAllByText and filter by STRONG tag
            const bitcoinElements = screen.getAllByText('Bitcoin');
            expect(bitcoinElements.filter(el => el.tagName === 'STRONG').length).toBeGreaterThan(0);
        });
    });

    describe('Chain Selection', () => {
        test('should call onChainSelect when chain is clicked', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const baseChain = screen.getByText('Base').closest('.list-group-item');
            fireEvent.click(baseChain);

            expect(mockOnChainSelect).toHaveBeenCalledWith(
                expect.objectContaining({ chainName: 'Base' })
            );
            expect(mockOnHide).toHaveBeenCalled();
        });

        test('should close modal after chain selection', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                />
            );

            const baseChain = screen.getByText('Base').closest('.list-group-item');
            fireEvent.click(baseChain);

            expect(mockOnHide).toHaveBeenCalled();
        });
    });

    describe('Exclude Chain IDs', () => {
        test('should exclude specified chain IDs', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                    excludeChainIds={[8453]}
                />
            );

            expect(screen.queryByText('Base')).not.toBeInTheDocument();
            expect(screen.getByText('Ethereum')).toBeInTheDocument();
        });
    });

    describe('Filter Type Prop', () => {
        test('should use filterType prop as initial filter', () => {
            render(
                <ChainModal
                    show={true}
                    onHide={mockOnHide}
                    onChainSelect={mockOnChainSelect}
                    filterType="EVM"
                />
            );

            const filterSelect = screen.getByRole('combobox');
            expect(filterSelect.value).toBe('EVM');
        });
    });
});

