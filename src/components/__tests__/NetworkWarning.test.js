/**
 * Tests for NetworkWarning Component
 * 
 * Comprehensive tests for network mismatch detection, warning display,
 * network switching, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NetworkWarning from '../NetworkWarning';
import { useNetworkDetection } from '../../hooks/useNetworkDetection';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('../../hooks/useNetworkDetection');
jest.mock('../../services/chainConfig');

describe('NetworkWarning Component', () => {
    const mockSwitchToRequiredNetwork = jest.fn();
    const mockOnNetworkSwitch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        chainConfig.getChain.mockImplementation((chainId) => {
            const chains = {
                8453: { chainId: '8453', chainName: 'Base', type: 'EVM' },
                42161: { chainId: '42161', chainName: 'Arbitrum', type: 'EVM' },
            };
            return chains[chainId];
        });
    });

    describe('Network Mismatch Detection', () => {
        test('should detect network mismatch', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                    onNetworkSwitch={mockOnNetworkSwitch}
                />
            );

            expect(screen.getByText('Wrong Network Detected')).toBeInTheDocument();
        });

        test('should not show when networks match', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 8453,
                requiredChain: { chainId: '8453', chainName: 'Base' },
                isMismatch: false,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            const { container } = render(
                <NetworkWarning
                    requiredChainId={8453}
                    showOnlyWhenMismatch={true}
                />
            );

            expect(container.firstChild).toBeNull();
        });

        test('should show success message when on correct network', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 8453,
                requiredChain: { chainId: '8453', chainName: 'Base' },
                isMismatch: false,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={8453}
                    showOnlyWhenMismatch={false}
                />
            );

            expect(screen.getByText(/Connected to Base/)).toBeInTheDocument();
        });
    });

    describe('Warning Display', () => {
        test('should display current and required network', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                />
            );

            expect(screen.getByText('Current Network:')).toBeInTheDocument();
            expect(screen.getByText('Required Network:')).toBeInTheDocument();
            expect(screen.getByText('Base')).toBeInTheDocument();
            expect(screen.getByText('Arbitrum')).toBeInTheDocument();
        });

        test('should display warning variant correctly', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            const { container } = render(
                <NetworkWarning
                    requiredChainId={42161}
                />
            );

            const alert = container.querySelector('.alert-warning');
            expect(alert).toBeInTheDocument();
        });
    });

    describe('Network Switching', () => {
        test('should call switchToRequiredNetwork when button clicked', async () => {
            mockSwitchToRequiredNetwork.mockResolvedValue(true);

            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                    onNetworkSwitch={mockOnNetworkSwitch}
                />
            );

            const switchButton = screen.getByText(/Switch to Arbitrum/);
            fireEvent.click(switchButton);

            await waitFor(() => {
                expect(mockSwitchToRequiredNetwork).toHaveBeenCalled();
            });
        });

        test('should call onNetworkSwitch callback after successful switch', async () => {
            mockSwitchToRequiredNetwork.mockResolvedValue(true);

            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                    onNetworkSwitch={mockOnNetworkSwitch}
                />
            );

            const switchButton = screen.getByText(/Switch to Arbitrum/);
            fireEvent.click(switchButton);

            await waitFor(() => {
                expect(mockOnNetworkSwitch).toHaveBeenCalledWith(42161);
            });
        });

        test('should disable button while switching', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: true,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                />
            );

            const switchButton = screen.getByText(/Switching Network/);
            expect(switchButton.closest('button')).toBeDisabled();
        });
    });

    describe('Error Handling', () => {
        test('should display error message when switch fails', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: 'User rejected network switch',
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                />
            );

            expect(screen.getByText('User rejected network switch')).toBeInTheDocument();
        });

        test('should show unsupported network error', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 99999,
                requiredChain: null,
                isMismatch: true,
                isSupported: false,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={99999}
                />
            );

            expect(screen.getByText('Unsupported Network')).toBeInTheDocument();
        });
    });

    describe('Auto-Switch Functionality', () => {
        test('should auto-switch when enabled and mismatch detected', async () => {
            mockSwitchToRequiredNetwork.mockResolvedValue(true);

            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                    autoSwitch={true}
                    onNetworkSwitch={mockOnNetworkSwitch}
                />
            );

            await waitFor(() => {
                expect(mockSwitchToRequiredNetwork).toHaveBeenCalled();
            });
        });

        test('should not auto-switch if already attempted', async () => {
            // Mock switchToRequiredNetwork to return a Promise
            mockSwitchToRequiredNetwork.mockResolvedValue(true);

            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            const { rerender } = render(
                <NetworkWarning
                    requiredChainId={42161}
                    autoSwitch={true}
                />
            );

            // Wait for first auto-switch to complete
            await waitFor(() => {
                expect(mockSwitchToRequiredNetwork).toHaveBeenCalledTimes(1);
            });

            // Re-render should not trigger again
            rerender(
                <NetworkWarning
                    requiredChainId={42161}
                    autoSwitch={true}
                />
            );

            // Should still be called only once
            expect(mockSwitchToRequiredNetwork).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge Cases', () => {
        test('should not show when wallet not connected', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: null,
                currentChain: null,
                requiredChainId: 42161,
                requiredChain: { chainId: '42161', chainName: 'Arbitrum' },
                isMismatch: false,
                isSupported: true,
                isConnected: false,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            const { container } = render(
                <NetworkWarning
                    requiredChainId={42161}
                />
            );

            expect(container.firstChild).toBeNull();
        });

        test('should not show when requiredChainId is not provided', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: { chainId: '8453', chainName: 'Base' },
                requiredChainId: null,
                requiredChain: null,
                isMismatch: false,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            const { container } = render(
                <NetworkWarning
                    requiredChainId={null}
                />
            );

            expect(container.firstChild).toBeNull();
        });

        test('should handle missing chain names gracefully', () => {
            useNetworkDetection.mockReturnValue({
                currentChainId: 8453,
                currentChain: null,
                requiredChainId: 42161,
                requiredChain: null,
                isMismatch: true,
                isSupported: true,
                isConnected: true,
                isChecking: false,
                error: null,
                switchToRequiredNetwork: mockSwitchToRequiredNetwork,
            });

            render(
                <NetworkWarning
                    requiredChainId={42161}
                />
            );

            // "Chain 8453" appears in badge
            const chain8453Elements = screen.getAllByText(/Chain 8453/);
            expect(chain8453Elements.length).toBeGreaterThan(0);

            // "Chain 42161" appears in both badge and button - use getAllByText
            const chain42161Elements = screen.getAllByText(/Chain 42161/);
            expect(chain42161Elements.length).toBeGreaterThan(0);
            
            // Verify it appears in the button specifically - use getAllByText and filter by button
            const switchButtonElements = screen.getAllByText(/Switch to Chain 42161/);
            const switchButton = switchButtonElements.find(el => el.tagName === 'BUTTON' || el.closest('button'));
            expect(switchButton).toBeInTheDocument();
        });
    });
});

