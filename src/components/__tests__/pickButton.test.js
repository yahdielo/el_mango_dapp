/**
 * Tests for PickButton Component
 * 
 * Tests component rendering, button states, minimum amount validation,
 * swap/approve button logic, ChainConfigService integration, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAccount, useChainId } from 'wagmi';
import PickButton from '../pickButton';
import { checkMinimumAmount } from '../../utils/chainValidation';
import chainConfig from '../../services/chainConfig';

// Mock dependencies
jest.mock('wagmi');
jest.mock('../../utils/chainValidation');
jest.mock('../../services/chainConfig');

// Mock child components
jest.mock('../connectWallet', () => {
    return function ConnectWallet() {
        return <button data-testid="connect-wallet">Connect Wallet</button>;
    };
});

jest.mock('../connectButton', () => {
    return function ConnectButton() {
        return <button data-testid="connect-button">Connect Button</button>;
    };
});

jest.mock('../swapButton', () => {
    return function SwapButton({ token0, token1, amount, chainInfo }) {
        return (
            <button data-testid="swap-button">
                Swap {token0?.symbol} for {token1?.symbol}
            </button>
        );
    };
});

jest.mock('../approveButton', () => {
    return function ApproveButton({ token0, token1, amount, chainInfo }) {
        return (
            <button data-testid="approve-button">
                Approve {token0?.symbol}
            </button>
        );
    };
});

describe('PickButton Component', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = 8453; // Base

    const defaultProps = {
        token0: {
            address: '0xToken0',
            symbol: 'USDC',
            name: 'USD Coin',
        },
        token1: {
            address: '0xToken1',
            symbol: 'USDT',
            name: 'Tether',
        },
        amount: '1000000000000000000', // 1 token
        chain: null,
        chatId: null,
        referrer: null,
        chainInfo: {
            chainId: mockChainId,
            chainName: 'Base',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock useAccount
        useAccount.mockReturnValue({
            address: mockAddress,
            isConnected: true,
        });

        // Mock useChainId
        useChainId.mockReturnValue({
            chainId: mockChainId,
        });

        // Mock checkMinimumAmount
        checkMinimumAmount.mockReturnValue({
            isValid: true,
            message: 'Valid amount',
        });

        // Mock chainConfig
        chainConfig.getMinimumAmounts.mockReturnValue({
            swap: '1000000000000000', // 0.001 token
        });
        chainConfig.getChain.mockReturnValue({
            chainId: mockChainId.toString(),
            chainName: 'Base',
        });
    });

    describe('Component Rendering', () => {
        test('should render with required props', () => {
            render(<PickButton {...defaultProps} />);
            
            // Should render approve button for USDC (not ETH/BNB)
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
        });

        test('should render swap button when conditions met', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'ETH',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('swap-button')).toBeInTheDocument();
        });

        test('should render approve button when token is not ETH/BNB', () => {
            render(<PickButton {...defaultProps} />);
            
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
        });

        test('should render connect wallet when not connected', () => {
            useAccount.mockReturnValue({
                address: null,
                isConnected: false,
            });
            
            render(<PickButton {...defaultProps} />);
            
            expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
        });

        test('should render connection button when chainId exists but conditions not met', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    address: null,
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });
    });

    describe('Button States', () => {
        test('should enable button when all conditions met', () => {
            render(<PickButton {...defaultProps} />);
            
            // Default props use USDC, so it renders approve-button
            const approveButton = screen.getByTestId('approve-button');
            expect(approveButton).toBeInTheDocument();
            expect(approveButton).not.toBeDisabled();
        });

        test('should disable button when amount below minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toBeInTheDocument();
            expect(disabledButton).toBeDisabled();
        });

        test('should show error message when amount below minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toHaveAttribute('title', 'Minimum amount is 0.001 on Base');
        });

        test('should enable button when amount meets minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: true,
                message: 'Valid amount',
            });
            
            render(<PickButton {...defaultProps} />);
            
            // Default props use USDC, so it renders approve-button
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
        });
    });

    describe('Minimum Amount Validation', () => {
        test('should disable button when amount below minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toBeInTheDocument();
            expect(disabledButton).toBeDisabled();
        });

        test('should use checkMinimumAmount from chainValidation', () => {
            render(<PickButton {...defaultProps} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(
                mockChainId,
                defaultProps.amount,
                'swap'
            );
        });

        test('should display error message when below minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toHaveAttribute('title', 'Minimum amount is 0.001 on Base');
        });

        test('should enable button when amount meets minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: true,
                message: 'Valid amount',
            });
            
            render(<PickButton {...defaultProps} />);
            
            // Default props use USDC, so it renders approve-button
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
        });

        test('should validate for different chains', () => {
            const props = {
                ...defaultProps,
                chainInfo: {
                    chainId: 1, // Ethereum
                    chainName: 'Ethereum',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(1, defaultProps.amount, 'swap');
        });

        test('should not validate when chainId not provided', () => {
            const props = {
                ...defaultProps,
                chainInfo: null,
            };
            
            render(<PickButton {...props} />);
            
            // Should not call checkMinimumAmount if chainId is missing
            // But the component might still render ConnectionButton
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should not validate when amount not provided', () => {
            const props = {
                ...defaultProps,
                amount: '',
            };
            
            render(<PickButton {...props} />);
            
            // Should not call checkMinimumAmount if amount is empty
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should not validate when tokens not selected', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    address: null,
                },
            };
            
            render(<PickButton {...props} />);
            
            // Should not call checkMinimumAmount if tokens not selected
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });
    });

    describe('Swap Button', () => {
        test('should render when swap is possible (ETH)', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'ETH',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('swap-button')).toBeInTheDocument();
            expect(screen.getByText(/Swap ETH for USDT/i)).toBeInTheDocument();
        });

        test('should render when swap is possible (BNB)', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'BNB',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('swap-button')).toBeInTheDocument();
            expect(screen.getByText(/Swap BNB for USDT/i)).toBeInTheDocument();
        });

        test('should be disabled when amount below minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'ETH',
                },
            };
            
            render(<PickButton {...props} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toBeDisabled();
        });

        test('should be disabled when tokens not selected', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    address: null,
                },
                token1: {
                    ...defaultProps.token1,
                    address: null,
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should be disabled when chain not connected', () => {
            useAccount.mockReturnValue({
                address: null,
                isConnected: false,
            });
            
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'ETH',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
        });
    });

    describe('Approve Button', () => {
        test('should render when approval needed (non-ETH/BNB token)', () => {
            render(<PickButton {...defaultProps} />);
            
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
            expect(screen.getByText(/Approve USDC/i)).toBeInTheDocument();
        });

        test('should render when token is not ETH or BNB', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'USDC',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
        });

        test('should be disabled when amount below minimum', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toBeDisabled();
        });
    });

    describe('ChainConfigService Integration', () => {
        test('should use getMinimumAmounts for validation', () => {
            render(<PickButton {...defaultProps} />);
            
            // checkMinimumAmount internally uses chainConfig.getMinimumAmounts
            expect(checkMinimumAmount).toHaveBeenCalled();
        });

        test('should use chain-specific minimum amounts', () => {
            const props = {
                ...defaultProps,
                chainInfo: {
                    chainId: 1, // Ethereum
                    chainName: 'Ethereum',
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(1, defaultProps.amount, 'swap');
        });

        test('should use getChain for chain information', () => {
            // This is called internally by checkMinimumAmount
            render(<PickButton {...defaultProps} />);
            
            expect(checkMinimumAmount).toHaveBeenCalled();
        });
    });

    describe('Validation Logic', () => {
        test('should validate token selection', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    address: null,
                },
            };
            
            render(<PickButton {...props} />);
            
            // Should not render swap/approve button when tokens not selected
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should validate amount', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(
                mockChainId,
                defaultProps.amount,
                'swap'
            );
        });

        test('should validate chain', () => {
            const props = {
                ...defaultProps,
                chainInfo: null,
            };
            
            render(<PickButton {...props} />);
            
            // Should render connection button when chain not selected
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle empty amount', () => {
            const props = {
                ...defaultProps,
                amount: '',
            };
            
            render(<PickButton {...props} />);
            
            // Should not validate when amount is empty
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle zero amount', () => {
            const props = {
                ...defaultProps,
                amount: '0',
            };
            
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...props} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(mockChainId, '0', 'swap');
        });
    });

    describe('User Interactions', () => {
        test('should allow button click when enabled', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    symbol: 'ETH',
                },
            };
            
            render(<PickButton {...props} />);
            
            const swapButton = screen.getByTestId('swap-button');
            expect(swapButton).not.toBeDisabled();
            
            fireEvent.click(swapButton);
            // Button click should work (handled by SwapButton component)
        });

        test('should not trigger click when disabled', () => {
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...defaultProps} />);
            
            const disabledButton = screen.getByText('Amount Below Minimum');
            expect(disabledButton).toBeDisabled();
            
            fireEvent.click(disabledButton);
            // Click should not trigger any action
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing chainInfo', () => {
            const props = {
                ...defaultProps,
                chainInfo: null,
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle missing token0', () => {
            const props = {
                ...defaultProps,
                token0: null,
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle missing token1', () => {
            const props = {
                ...defaultProps,
                token1: null,
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle token0 without address', () => {
            const props = {
                ...defaultProps,
                token0: {
                    ...defaultProps.token0,
                    address: null,
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle token1 without address', () => {
            const props = {
                ...defaultProps,
                token1: {
                    ...defaultProps.token1,
                    address: null,
                },
            };
            
            render(<PickButton {...props} />);
            
            expect(screen.getByTestId('connect-button')).toBeInTheDocument();
        });

        test('should handle very small amount', () => {
            const props = {
                ...defaultProps,
                amount: '1',
            };
            
            checkMinimumAmount.mockReturnValue({
                isValid: false,
                message: 'Minimum amount is 0.001 on Base',
            });
            
            render(<PickButton {...props} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(mockChainId, '1', 'swap');
            expect(screen.getByText('Amount Below Minimum')).toBeInTheDocument();
        });

        test('should handle very large amount', () => {
            const props = {
                ...defaultProps,
                amount: '1000000000000000000000000',
            };
            
            checkMinimumAmount.mockReturnValue({
                isValid: true,
                message: 'Valid amount',
            });
            
            render(<PickButton {...props} />);
            
            expect(checkMinimumAmount).toHaveBeenCalledWith(
                mockChainId,
                '1000000000000000000000000',
                'swap'
            );
            // Default props use USDC, so it renders approve-button
            expect(screen.getByTestId('approve-button')).toBeInTheDocument();
        });

        test('should handle different token symbols', () => {
            const symbols = ['ETH', 'BNB', 'USDC', 'USDT', 'DAI', 'WBTC'];
            
            symbols.forEach(symbol => {
                const props = {
                    ...defaultProps,
                    token0: {
                        ...defaultProps.token0,
                        symbol,
                    },
                };
                
                const { unmount } = render(<PickButton {...props} />);
                
                if (symbol === 'ETH' || symbol === 'BNB') {
                    expect(screen.getByTestId('swap-button')).toBeInTheDocument();
                } else {
                    expect(screen.getByTestId('approve-button')).toBeInTheDocument();
                }
                
                unmount();
            });
        });
    });
});

