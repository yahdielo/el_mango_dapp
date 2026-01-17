import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, parseAbi } from 'viem';
import SwapButton from './swapButton.js';
import { useEffect, useState } from 'react';
import { formatErrorForDisplay } from '../utils/chainErrors';
import dotenv from 'dotenv';
dotenv.config();

const ApproveButton = ({ token0, token1, amount, chatId, referrer,chainInfo }) => {
    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    // This is required by React's Rules of Hooks
    
    // State management
    const [status, setTxStatus] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [isApproving, setIsApproving] = useState(false);

    // Validation to ensure required props are provided
    const { address, isConnected } = useAccount();
    // Add null checks for chainInfo structure
    const spender = chainInfo?.[chainInfo?.chainId]?.mangoRouterAdd || null;

    // ERC-20 ABI for the approve function
    const erc20Abi = parseAbi([
        'function approve(address spender, uint256 amount) public returns (bool)',
        'function balanceOf(address account) public view returns (uint256)',
        'function decimals() public view returns (uint8)',
    ]);

    // Read user's token balance
    const {
        data: userBalance,
        isError: balanceError,
        isLoading: balanceLoading,
        refetch: refetchBalance,
    } = useReadContract({
        address: token0?.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
        query: {
            enabled: !!address && !!token0?.address && isConnected && !!token0,
        },
    });
    console.log('user balance',userBalance && token0?.decimals ? formatUnits(userBalance, token0.decimals) : 0)

    // Write contract hook for approval
    const { writeContract, error } = useWriteContract();

    // Wait for transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash) {
            console.log('Approval successful!');
            alert('Tokens approved successfully!');
            setTxStatus(true);
            setIsApproving(false);
        }
    }, [isConfirmed, txHash]);

    // Handle errors
    useEffect(() => {
        if (error) {
            console.error('Approval error:', error);
            alert('Approval failed! Please try again.');
            setIsApproving(false);
        }
    }, [error]);

    // NOW we can do conditional returns after all hooks are called
    if (!token0 || !token1 || !amount || !chainInfo) {
        return null;
    }


    const handleTxStatus = (hash) => {
        setTxHash(hash);
    };

    // Function to handle the approval process
    const handleApprove = async (e) => {
        try {
            e.preventDefault();
            console.log('Starting approval process...');
            setIsApproving(true);

            if (!address || !isConnected) {
                alert('Please connect your wallet first.');
                setIsApproving(false);
                return;
            }

            // If balance is still loading, wait a bit or refetch
            if (balanceLoading) {
                console.log('Balance is loading, trying to refetch...');
                await refetchBalance();
            }

            // Check for balance errors
            if (balanceError) {
                console.error('Error fetching balance:', balanceError);
                alert('Unable to fetch token balance. Please try again.');
                setIsApproving(false);
                return;
            }

            // Check if we have balance data
            if (userBalance === undefined || userBalance === null) {
                console.log('User balance is undefined, trying to refetch...');
                const { data: freshBalance } = await refetchBalance();

                if (!freshBalance && freshBalance !== 0n) {
                    alert('Unable to fetch your token balance. Please ensure you have the token in your wallet.');
                    setIsApproving(false);
                    return;
                }
            }

            // Format the user balance - add null check for token0.decimals
            if (!token0?.decimals) {
                return; // Cannot proceed without decimals
            }
            const formatUserBalance = formatUnits(userBalance, token0.decimals);
            console.log('format user balance', formatUserBalance,'this is amount',amount);

            const approveAmount = parseUnits(amount, token0.decimals);
            if (approveAmount <= userBalance) {
                // Check if spender is available
                if (!spender) {
                    console.error('Spender address not available');
                    return;
                }

                // Call the approve function using wagmi
                writeContract(
                    {
                        address: token0.address,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [spender, approveAmount],
                    },
                    {
                        onSuccess: (hash) => {
                            console.log('Approval transaction submitted:', hash);
                            handleTxStatus(hash);
                        },
                        onError: (error) => {
                            console.error('Approval transaction failed:', error);
                            // Format error using ChainConfigService
                            const formattedError = formatErrorForDisplay(error, chainInfo?.chainId);
                            alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                            setIsApproving(false);
                        },
                    }
                );
            } else {
                alert('fondos insifucientes!');
                setIsApproving(false);
            }
        } catch (error) {
            console.error('Error during approval process:', error);
            // Format error using ChainConfigService
            const formattedError = formatErrorForDisplay(error, chainInfo?.chainId);
            alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
            setIsApproving(false);
        }
    };

    if (status === true) {
        console.log('rrreferrer',referrer)
        return <SwapButton token0={token0} token1={token1} amount={amount} /*chain={chain}*/chatId={chatId} referrer={referrer} chainInfo={chainInfo}/>;
    } else {
        return (
            <button
                onClick={handleApprove}
                disabled={isApproving || balanceLoading}
                type="submit"
                className="w-100"
                style={{
                    padding: '1rem',
                    fontSize: '1.5rem',
                    backgroundColor: isApproving || balanceLoading ? '#cccccc' : '#F26E01',
                    borderColor: isApproving || balanceLoading ? '#cccccc' : '#FFA500',
                    color: '#FFFFFF',
                    cursor: isApproving || balanceLoading ? 'not-allowed' : 'pointer',
                }}
            >
                {isApproving ? (isConfirming ? 'Processing...' : 'Confirming...') : balanceLoading ? 'Loading Balance...' : 'Approve'}
            </button>
        );
    }
};

export default ApproveButton;
