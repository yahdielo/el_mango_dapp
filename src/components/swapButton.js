import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import axios from 'axios';
import dotenv from 'dotenv';
import { parseAbi, parseUnits, parseEther } from 'viem';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import chainConfig from '../services/chainConfig';
import { estimateGas, TRANSACTION_TYPES, handleGasEstimationError } from '../utils/gasEstimation';
import { formatErrorForDisplay } from '../utils/chainErrors';
import { getSlippageToleranceInBasisPoints } from '../utils/slippageUtils';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { saveSwapTransaction } from '../services/transactionHistory';
dotenv.config();

const SwapButton = ({ token0, token1, amount, chatId, referrer, chainInfo }) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const [showAlert, setShowAlert] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [isSwapping, setIsSwapping] = useState(false);

    // const [txStatus,setTxStatus] = useState('')
    // const [alertMessage, setAlertMessage] = useState('');
    //let chain = chains[chainId

    // const displayAlert = (message, duration) => {
    //     setAlertMessage(message);
    //     setShowAlert(true);

    //     setTimeout(() => {
    //     setShowAlert(false);
    //     }, duration);
    // };
    // Wagmi hooks
    const { writeContract, error } = useWriteContract(); // isPending,
    const { isLoading: isSuccess } = useWaitForTransactionReceipt({
        // isConfirming,
        hash: txHash,
    });
    const publicClient = usePublicClient();
    
    // Get gas settings from ChainConfigService
    const chainId = chainInfo?.chainId;
    const gasSettings = chainId ? chainConfig.getGasSettings(chainId) : null;
    
    // Get slippage settings from ChainConfigService
    const slippageSettings = chainId ? chainConfig.getSlippageTolerance(chainId) : null;

    // Environment variables (you'll need to set these up in your build process)
    const spender = chainInfo[chainInfo.chainId].mangoRouterAdd;//'0x157278d12dC2b5bd0cFbF860A64d092d486BfC99'; //process.env.REACT_APP_MANGO_ROUTER;
    const zeroAddress = chainInfo.zeroAdd;

    useEffect(() => {
        if (showAlert) {
            const timer = setTimeout(() => {
                setShowAlert(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [showAlert]);

    useEffect(() => {
        if (isSuccess && txHash) {
            // Save transaction to history
            try {
                saveSwapTransaction({
                    txHash: txHash,
                    userAddress: address,
                    chainId: chainId,
                    tokenIn: token0.symbol,
                    tokenOut: token1.symbol,
                    amountIn: amount,
                    amountOut: null, // Will be updated when transaction is confirmed
                    status: 'pending',
                    timestamp: Date.now(),
                });
            } catch (error) {
                console.error('Failed to save swap transaction:', error);
            }
            
            if (token0.symbol === 'ETH') {
                // Send receipt after successful transaction
                const data = {
                    txHash: txHash,
                    token0: token0,
                    token1: token1,
                    referrer: referrer,
                    amountIn: amount,
                    chatId: 758852800,//chatId,
                };
                console.log('this is dta send to aws',data)
                sendReceipt(data);
            }

            alert('Swap successful!');
            setIsSwapping(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess, txHash]);

    useEffect(() => {
        if (error) {
            setIsSwapping(false);
        }
    }, [error]);

    const sendReceipt = async (params) => {
        console.log('we im send receipt');
        if (chatId) {
            const url = `https://38654yedpe.execute-api.ca-central-1.amazonaws.com/txReceipt`;

            try {
                await axios
                    .get(url, { params })
                    .then((res) => console.log('response data', res.data))
                    .catch((err) => console.error('Error:', err.response?.data || err.message));
            } catch (e) {
                console.log(e);
            }
        }
    };

    if (!token0 || !token1 || !amount) {
        console.error('swap: Missing required props.');
        return null;
    }

    const mangoRouterAbi = parseAbi(['function swap(address token0, address token1, uint256 amount, address referrer, uint256 slippageTolerance) external payable returns(uint256 amountOut)']);

    // Function to handle the approval process
    const handleSwap = async (e) => {
        try {
            e.preventDefault();
            console.log('Starting Swap process...');

            setIsSwapping(true);
        
            // Estimate gas for the swap
            let gasConfig = { gas: 3000000n }; // Default fallback
            if (chainId && publicClient) {
                try {
                    const gasEstimate = await estimateGas(
                        chainId,
                        TRANSACTION_TYPES.SWAP,
                        {
                            publicClient,
                            transactionParams: {
                                to: spender,
                                data: '0x', // Will be set by writeContract
                            },
                        }
                    );
                    gasConfig = gasEstimate.gasConfig;
                    console.log('Gas estimate:', gasEstimate);
                } catch (gasError) {
                    console.warn('Gas estimation failed, using defaults:', gasError);
                    const errorInfo = handleGasEstimationError(gasError, chainId);
                    console.warn('Gas error info:', errorInfo);
                    // Use chain config gas limit as fallback
                    if (gasSettings?.gasLimit) {
                        gasConfig = { gas: BigInt(gasSettings.gasLimit) };
                    }
                }
            } else if (gasSettings?.gasLimit) {
                // Use chain config gas limit if available
                gasConfig = { gas: BigInt(gasSettings.gasLimit) };
            }
        
            if (token0.symbol === 'ETH' || token0.symbol === 'BNB') {
                // Swap ETH to token
                console.log('this is amount',amount)
                const ethValue = parseEther(amount);
                console.log('this is value',ethValue);
                console.log('this is spender',spender)

                // Get slippage tolerance in basis points from ChainConfigService
                const slippageTolerance = getSlippageToleranceInBasisPoints(chainId, chainConfig);
                
                writeContract(
                    {
                        address: spender,
                        abi: mangoRouterAbi,
                        functionName: 'swap',
                        args: [zeroAddress, token1.address, 0n, referrer, slippageTolerance],
                        value: ethValue,
                        ...gasConfig,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('ETH to token swap transaction submitted:', hash);
                            setIsSwapping(false);
                        },
                        onError: (error) => {
                            console.error('ETH to token swap failed:', error);

                            // Format error using ChainConfigService
                            const formattedError = formatErrorForDisplay(error, chainId);
                            
                            // Handle gas estimation errors
                            if (chainId) {
                                const errorInfo = handleGasEstimationError(error, chainId);
                                if (errorInfo.errorType === 'gasExceedsAllowance') {
                                    alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                                } else if (errorInfo.errorType === 'insufficientFunds') {
                                    alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                                } else {
                                    alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                                }
                            } else {
                                alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                            }
                            
                            setIsSwapping(false);
                        },
                    }
                );
            } else if (token1.symbol === 'ETH' || token1.symbol === "BNB") {
                // Swap token to ETH
                const formattedAmount = parseUnits(amount, token0.decimals);
                console.log('token to eth swap', token0.address, zeroAddress, referrer);

                // Get slippage tolerance in basis points from ChainConfigService
                const slippageTolerance = getSlippageToleranceInBasisPoints(chainId, chainConfig);
                
                writeContract(
                    {
                        address: spender,
                        abi: mangoRouterAbi,
                        functionName: 'swap',
                        args: [token0.address, zeroAddress, formattedAmount, referrer, slippageTolerance],
                        ...gasConfig,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('Token to ETH swap transaction submitted:', hash);
                        },
                        onError: (error) => {
                            console.error('Token to ETH swap failed:', error);
                            
                            // Format error using ChainConfigService
                            const formattedError = formatErrorForDisplay(error, chainId);
                            
                            // Handle gas estimation errors
                            if (chainId) {
                                const errorInfo = handleGasEstimationError(error, chainId);
                                if (errorInfo.errorType === 'gasExceedsAllowance') {
                                    alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                                } else if (errorInfo.errorType === 'insufficientFunds') {
                                    alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                                } else {
                                    alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                                }
                            } else {
                                alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
                            }
                            
                            setIsSwapping(false);
                        },
                    }
                );
            }else {
                //WORK ON
                //TOKEJ TO TOKEN SWAP

            }
        } catch (error) {
            console.error('Error during swap process:', error);
            // Format error using ChainConfigService
            const formattedError = formatErrorForDisplay(error, chainId);
            alert(`${formattedError.title}\n${formattedError.message}\n${formattedError.suggestion}`);
            setIsSwapping(false);
        }
    };

    return (
        <Button
            onClick={handleSwap}
            type="submit"
            className="w-100"
            disabled={isSwapping}
            style={{
                padding: '1rem',
                fontSize: '1.5rem',
                backgroundColor: isSwapping ? '#cccccc' : '#F26E01',
                borderColor: isSwapping ? '#999999' : '#FFA500',
                color: '#FFFFFF',
                cursor: isSwapping ? 'not-allowed' : 'pointer',
                opacity: isSwapping ? 0.7 : 1,
            }}
        >
            {'Swap'}
        </Button>
    );
};
export default SwapButton;
