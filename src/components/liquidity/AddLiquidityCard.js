import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, parseAbi, zeroAddress } from 'viem';
import MobileTokenSelector from '../MobileTokenSelector';
import PriceRatioDisplay from './PriceRatioDisplay';
import SlippageSettings from './SlippageSettings';
import useTokenBalance from '../hooks/getTokenBalance';
import useGetEthBalance from '../hooks/getEthBalance';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice } from '../../services/priceOracle';
import { getPoolInfo, calculateLPTokens, calculatePoolShare } from '../../services/liquidityPool';
import { saveSwapTransaction, updateSwapTransaction } from '../../services/transactionHistory';
import '../css/LiquidityMobile.css';

const AddLiquidityCard = ({ address, isConnected, chainId }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [tokenA, setTokenA] = useState(null);
    const [tokenB, setTokenB] = useState(null);
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');
    const [slippage, setSlippage] = useState(() => {
        return localStorage.getItem('slippageTolerance') || '0.5';
    });
    const [priceRatio, setPriceRatio] = useState(null);
    const [shareOfPool, setShareOfPool] = useState(null);
    const [lpTokens, setLpTokens] = useState(null);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [approvalA, setApprovalA] = useState(false);
    const [approvalB, setApprovalB] = useState(false);
    const [approvingA, setApprovingA] = useState(false);
    const [approvingB, setApprovingB] = useState(false);
    const [usdValueA, setUsdValueA] = useState(null);
    const [usdValueB, setUsdValueB] = useState(null);

    const chainInfo = chainConfig.getChain(chainId);
    const tokenList = chainInfo?.tokens || [];
    const routerAddress = chainConfig.getContractAddress(chainId, 'router');
    const gasSettings = chainConfig.getGasSettings(chainId);
    const publicClient = usePublicClient();
    const { writeContract } = useWriteContract();

    // Get balances - hooks return strings directly
    const balanceAStr = useTokenBalance(finalAddress, tokenA);
    const balanceBStr = useTokenBalance(finalAddress, tokenB);
    const ethBalanceStr = useGetEthBalance(finalAddress, tokenA?.address === 'native' ? tokenA : tokenB?.address === 'native' ? tokenB : null);

    // ERC20 ABI
    const erc20Abi = parseAbi([
        'function approve(address spender, uint256 amount) public returns (bool)',
        'function allowance(address owner, address spender) public view returns (uint256)',
        'function balanceOf(address account) public view returns (uint256)',
        'function decimals() public view returns (uint8)',
    ]);

    // Check token approvals
    const { data: allowanceA } = useReadContract({
        address: tokenA?.address && tokenA.address !== 'native' ? tokenA.address : undefined,
        abi: erc20Abi,
        functionName: 'allowance',
        args: routerAddress && tokenA?.address && tokenA.address !== 'native' && finalAddress 
            ? [finalAddress, routerAddress] 
            : undefined,
        query: {
            enabled: !!tokenA && tokenA.address !== 'native' && !!routerAddress && !!finalAddress && finalIsConnected,
        },
    });

    const { data: allowanceB } = useReadContract({
        address: tokenB?.address && tokenB.address !== 'native' ? tokenB.address : undefined,
        abi: erc20Abi,
        functionName: 'allowance',
        args: routerAddress && tokenB?.address && tokenB.address !== 'native' && finalAddress 
            ? [finalAddress, routerAddress] 
            : undefined,
        query: {
            enabled: !!tokenB && tokenB.address !== 'native' && !!routerAddress && !!finalAddress && finalIsConnected,
        },
    });

    // Transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    // Check if approvals are needed
    useEffect(() => {
        if (!tokenA || !tokenB || !amountA || !amountB || !routerAddress) {
            setApprovalA(false);
            setApprovalB(false);
            return;
        }

        const amountAValue = parseFloat(amountA);
        const amountBValue = parseFloat(amountB);
        
        if (amountAValue <= 0 || amountBValue <= 0) {
            setApprovalA(false);
            setApprovalB(false);
            return;
        }

        // Check if tokenA needs approval (not native)
        if (tokenA.address !== 'native' && allowanceA !== undefined) {
            const decimalsA = tokenA.decimals || 18;
            const requiredAmountA = parseUnits(amountA, decimalsA);
            setApprovalA(allowanceA < requiredAmountA);
        } else {
            setApprovalA(false);
        }

        // Check if tokenB needs approval (not native)
        if (tokenB.address !== 'native' && allowanceB !== undefined) {
            const decimalsB = tokenB.decimals || 18;
            const requiredAmountB = parseUnits(amountB, decimalsB);
            setApprovalB(allowanceB < requiredAmountB);
        } else {
            setApprovalB(false);
        }
    }, [tokenA, tokenB, amountA, amountB, allowanceA, allowanceB, routerAddress]);

    // Calculate USD values using price oracle
    useEffect(() => {
        const fetchPrices = async () => {
            if (tokenA && amountA && parseFloat(amountA) > 0) {
                try {
                    const priceA = await getTokenPrice(tokenA.symbol);
                    if (priceA) {
                        setUsdValueA(parseFloat(amountA) * priceA);
                    } else {
                        // Fallback to mock price if oracle fails
                        const mockPriceA = tokenA.symbol === 'ETH' ? 3000 : tokenA.symbol === 'BNB' ? 500 : tokenA.symbol === 'USDC' ? 1 : 5;
                        setUsdValueA(parseFloat(amountA) * mockPriceA);
                    }
                } catch (error) {
                    console.warn('Failed to fetch price for tokenA:', error);
                    const mockPriceA = tokenA.symbol === 'ETH' ? 3000 : tokenA.symbol === 'BNB' ? 500 : tokenA.symbol === 'USDC' ? 1 : 5;
                    setUsdValueA(parseFloat(amountA) * mockPriceA);
                }
            } else {
                setUsdValueA(null);
            }

            if (tokenB && amountB && parseFloat(amountB) > 0) {
                try {
                    const priceB = await getTokenPrice(tokenB.symbol);
                    if (priceB) {
                        setUsdValueB(parseFloat(amountB) * priceB);
                    } else {
                        // Fallback to mock price if oracle fails
                        const mockPriceB = tokenB.symbol === 'ETH' ? 3000 : tokenB.symbol === 'BNB' ? 500 : tokenB.symbol === 'USDC' ? 1 : 5;
                        setUsdValueB(parseFloat(amountB) * mockPriceB);
                    }
                } catch (error) {
                    console.warn('Failed to fetch price for tokenB:', error);
                    const mockPriceB = tokenB.symbol === 'ETH' ? 3000 : tokenB.symbol === 'BNB' ? 500 : tokenB.symbol === 'USDC' ? 1 : 5;
                    setUsdValueB(parseFloat(amountB) * mockPriceB);
                }
            } else {
                setUsdValueB(null);
            }
        };

        fetchPrices();
    }, [tokenA, tokenB, amountA, amountB]);

    // Fetch pool info and calculate price ratio, LP tokens, and pool share
    useEffect(() => {
        const fetchPoolData = async () => {
            if (!tokenA || !tokenB || !publicClient || !chainId) {
                setPriceRatio(null);
                setShareOfPool(null);
                setLpTokens(null);
                return;
            }

            try {
                // Get token addresses (handle native tokens)
                const tokenAAddress = tokenA.address === 'native' 
                    ? (chainId === 56 ? null : chainInfo?.weth?.address) // BSC doesn't use WETH
                    : tokenA.address;
                const tokenBAddress = tokenB.address === 'native'
                    ? (chainId === 56 ? null : chainInfo?.weth?.address)
                    : tokenB.address;

                if (!tokenAAddress || !tokenBAddress) {
                    // If amounts provided, calculate from amounts
                    if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
                        const ratio = parseFloat(amountA) / parseFloat(amountB);
                        setPriceRatio(ratio);
                        setShareOfPool(null);
                        setLpTokens(null);
                    } else {
                        setPriceRatio(null);
                        setShareOfPool(null);
                        setLpTokens(null);
                    }
                    return;
                }

                // Try to get factory address (Uniswap V2 style)
                // For now, we'll use a common factory address or get from chain config
                // Note: This should be added to chainConfig in production
                const factoryAddress = null; // TODO: Add factory address to chainConfig
                
                if (factoryAddress) {
                    // Fetch pool info from contract
                    const poolInfo = await getPoolInfo(
                        publicClient,
                        factoryAddress,
                        tokenAAddress,
                        tokenBAddress,
                        tokenA.decimals || 18,
                        tokenB.decimals || 18
                    );

                    if (poolInfo && poolInfo.exists && poolInfo.priceRatio) {
                        setPriceRatio(poolInfo.priceRatio);
                    } else if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
                        // Fallback to calculating from amounts
                        setPriceRatio(parseFloat(amountA) / parseFloat(amountB));
                    } else {
                        // Try to get prices from oracle
                        const [priceA, priceB] = await Promise.all([
                            getTokenPrice(tokenA.symbol),
                            getTokenPrice(tokenB.symbol),
                        ]);
                        if (priceA && priceB) {
                            setPriceRatio(priceA / priceB);
                        } else {
                            setPriceRatio(null);
                        }
                    }

                    // Calculate LP tokens and pool share if amounts provided
                    if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0 && poolInfo) {
                        const amountAWei = parseUnits(amountA, tokenA.decimals || 18);
                        const amountBWei = parseUnits(amountB, tokenB.decimals || 18);
                        
                        let lpTokensWei = 0n;
                        if (poolInfo.reserves && poolInfo.totalSupply) {
                            // Determine which reserve corresponds to which token
                            const isTokenAFirst = poolInfo.reserves.token0.toLowerCase() === tokenAAddress.toLowerCase();
                            const reserveA = isTokenAFirst ? poolInfo.reserves.reserve0 : poolInfo.reserves.reserve1;
                            const reserveB = isTokenAFirst ? poolInfo.reserves.reserve1 : poolInfo.reserves.reserve0;
                            
                            lpTokensWei = calculateLPTokens(
                                amountAWei,
                                amountBWei,
                                reserveA,
                                reserveB,
                                poolInfo.totalSupply
                            );
                        } else {
                            // New pool - use constant product formula
                            lpTokensWei = calculateLPTokens(amountAWei, amountBWei, null, null, null);
                        }
                        
                        const lpTokensFormatted = formatUnits(lpTokensWei, 18); // LP tokens typically have 18 decimals
                        setLpTokens(parseFloat(lpTokensFormatted));
                        
                        // Calculate pool share
                        if (poolInfo.totalSupply && poolInfo.totalSupply > 0n) {
                            const share = calculatePoolShare(lpTokensWei, poolInfo.totalSupply);
                            setShareOfPool(share > 0.01 ? share : null);
                        } else {
                            setShareOfPool(null);
                        }
                    } else {
                        setLpTokens(null);
                        setShareOfPool(null);
                    }
                } else {
                    // No factory address - calculate from amounts or prices
                    if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
                        const ratio = parseFloat(amountA) / parseFloat(amountB);
                        setPriceRatio(ratio);
                    } else {
                        // Try to get prices from oracle
                        const [priceA, priceB] = await Promise.all([
                            getTokenPrice(tokenA.symbol),
                            getTokenPrice(tokenB.symbol),
                        ]);
                        if (priceA && priceB) {
                            setPriceRatio(priceA / priceB);
                        } else {
                            setPriceRatio(null);
                        }
                    }
                    setLpTokens(null);
                    setShareOfPool(null);
                }
            } catch (error) {
                console.error('Error fetching pool data:', error);
                // Fallback to calculating from amounts
                if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
                    setPriceRatio(parseFloat(amountA) / parseFloat(amountB));
                } else {
                    setPriceRatio(null);
                }
                setShareOfPool(null);
                setLpTokens(null);
            }
        };

        fetchPoolData();
    }, [tokenA, tokenB, amountA, amountB, publicClient, chainId, chainInfo]);

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash) {
            // Update transaction status in history
            if (finalAddress && chainId) {
                try {
                    updateSwapTransaction(txHash, 'completed', {
                        confirmedAt: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error('Failed to update transaction status:', error);
                }
            }
            
            alert('Liquidity added successfully!');
            setAmountA('');
            setAmountB('');
            setTxHash(null);
            setLoading(false);
        }
    }, [isConfirmed, txHash, finalAddress, chainId]);

    const handleMaxA = () => {
        if (!tokenA || !finalAddress) return;
        
        if (tokenA.address === 'native') {
            const balance = ethBalanceStr || '0';
            setAmountA(balance);
            // Auto-calculate amountB if we have a price ratio
            if (priceRatio && parseFloat(balance) > 0) {
                const calculatedB = parseFloat(balance) / priceRatio;
                setAmountB(calculatedB.toFixed(6));
            }
        } else {
            const balance = balanceAStr || '0';
            setAmountA(balance);
            if (priceRatio && parseFloat(balance) > 0) {
                const calculatedB = parseFloat(balance) / priceRatio;
                setAmountB(calculatedB.toFixed(6));
            }
        }
    };

    const handleMaxB = () => {
        if (!tokenB || !finalAddress) return;
        
        if (tokenB.address === 'native') {
            const balance = ethBalanceStr || '0';
            setAmountB(balance);
            // Auto-calculate amountA if we have a price ratio
            if (priceRatio && parseFloat(balance) > 0) {
                const calculatedA = parseFloat(balance) * priceRatio;
                setAmountA(calculatedA.toFixed(6));
            }
        } else {
            const balance = balanceBStr || '0';
            setAmountB(balance);
            if (priceRatio && parseFloat(balance) > 0) {
                const calculatedA = parseFloat(balance) * priceRatio;
                setAmountA(calculatedA.toFixed(6));
            }
        }
    };

    const handleAmountAChange = (value) => {
        if (!/^\d*\.?\d*$/.test(value)) return;
        
        setAmountA(value);
        
        // Auto-calculate amountB based on current price ratio
        // Only if we have a valid ratio and both tokens are selected
        if (tokenA && tokenB && value && parseFloat(value) > 0) {
            // Use existing price ratio if available, otherwise calculate from current amounts
            const currentRatio = priceRatio || (amountB && parseFloat(amountB) > 0 
                ? parseFloat(amountA || value) / parseFloat(amountB) 
                : null);
            
            if (currentRatio && currentRatio > 0) {
                const calculatedB = parseFloat(value) / currentRatio;
                setAmountB(calculatedB.toFixed(6));
            }
        } else if (!value) {
            setAmountB('');
        }
    };

    const handleAmountBChange = (value) => {
        if (!/^\d*\.?\d*$/.test(value)) return;
        
        setAmountB(value);
        
        // Auto-calculate amountA based on current price ratio
        if (tokenA && tokenB && value && parseFloat(value) > 0) {
            const currentRatio = priceRatio || (amountA && parseFloat(amountA) > 0 
                ? parseFloat(amountA) / parseFloat(amountB || value) 
                : null);
            
            if (currentRatio && currentRatio > 0) {
                const calculatedA = parseFloat(value) * currentRatio;
                setAmountA(calculatedA.toFixed(6));
            }
        } else if (!value) {
            setAmountA('');
        }
    };

    const handleApproveToken = async (token, isTokenA) => {
        if (!token || !routerAddress || !finalAddress || token.address === 'native') return;

        const amount = isTokenA ? amountA : amountB;
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter an amount first');
            return;
        }

        if (isTokenA) {
            setApprovingA(true);
        } else {
            setApprovingB(true);
        }

        try {
            const decimals = token.decimals || 18;
            const amountInWei = parseUnits(amount, decimals);
            const maxApproval = parseUnits('1000000000', decimals); // Approve a large amount

            writeContract(
                {
                    address: token.address,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [routerAddress, maxApproval],
                    gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                },
                {
                    onSuccess: (hash) => {
                        console.log('Approval transaction submitted:', hash);
                        // Wait for confirmation
                        setTimeout(() => {
                            if (isTokenA) {
                                setApprovalA(false);
                                setApprovingA(false);
                            } else {
                                setApprovalB(false);
                                setApprovingB(false);
                            }
                        }, 3000);
                    },
                    onError: (error) => {
                        console.error('Approval failed:', error);
                        alert('Failed to approve token: ' + (error.message || 'Unknown error'));
                        if (isTokenA) {
                            setApprovingA(false);
                        } else {
                            setApprovingB(false);
                        }
                    },
                }
            );
        } catch (error) {
            console.error('Error approving token:', error);
            alert('Failed to approve token: ' + (error.message || 'Unknown error'));
            if (isTokenA) {
                setApprovingA(false);
            } else {
                setApprovingB(false);
            }
        }
    };

    const handleAddLiquidity = async () => {
        if (!finalIsConnected || !tokenA || !tokenB || !amountA || !amountB) {
            return;
        }

        // Validate amounts
        const amountAValue = parseFloat(amountA);
        const amountBValue = parseFloat(amountB);
        
        if (amountAValue <= 0 || amountBValue <= 0) {
            alert('Please enter valid amounts for both tokens');
            return;
        }

        // Check balances
        const balanceAValue = tokenA.address === 'native' 
            ? parseFloat(ethBalanceStr || '0')
            : parseFloat(balanceAStr || '0');
        const balanceBValue = tokenB.address === 'native'
            ? parseFloat(ethBalanceStr || '0')
            : parseFloat(balanceBStr || '0');

        if (amountAValue > balanceAValue) {
            alert(`Insufficient ${tokenA.symbol} balance. Available: ${balanceAValue.toFixed(4)}`);
            return;
        }

        if (amountBValue > balanceBValue) {
            alert(`Insufficient ${tokenB.symbol} balance. Available: ${balanceBValue.toFixed(4)}`);
            return;
        }

        // Check if approvals are needed
        if (approvalA || approvalB) {
            alert('Please approve tokens first');
            return;
        }

        setLoading(true);
        try {
            // Calculate minimum amounts with slippage tolerance
            const slippagePercent = parseFloat(slippage) / 100;
            const minAmountA = amountAValue * (1 - slippagePercent);
            const minAmountB = amountBValue * (1 - slippagePercent);

            console.log('Adding liquidity:', {
                tokenA: tokenA.symbol,
                tokenB: tokenB.symbol,
                amountA: amountAValue,
                amountB: amountBValue,
                minAmountA,
                minAmountB,
                slippage: slippagePercent
            });

            // Prepare token addresses (handle native tokens)
            const tokenAAddress = tokenA.address === 'native' 
                ? (chainId === 56 ? zeroAddress : chainInfo?.weth?.address || zeroAddress)
                : tokenA.address;
            const tokenBAddress = tokenB.address === 'native'
                ? (chainId === 56 ? zeroAddress : chainInfo?.weth?.address || zeroAddress)
                : tokenB.address;

            // Prepare amounts in wei
            const decimalsA = tokenA.decimals || 18;
            const decimalsB = tokenB.decimals || 18;
            const amountAWei = parseUnits(amountA, decimalsA);
            const amountBWei = parseUnits(amountB, decimalsB);
            const minAmountAWei = parseUnits(minAmountA.toFixed(decimalsA), decimalsA);
            const minAmountBWei = parseUnits(minAmountB.toFixed(decimalsB), decimalsB);

            // Router ABI - Standard Uniswap V2 style addLiquidity
            const routerAbi = parseAbi([
                'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
                'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
            ]);

            // Determine if we're adding ETH/BNB liquidity
            const isNativeA = tokenA.address === 'native';
            const isNativeB = tokenB.address === 'native';

            // Calculate deadline (20 minutes from now)
            const deadline = Math.floor(Date.now() / 1000) + (20 * 60);

            if (isNativeA || isNativeB) {
                // Add liquidity with native token (ETH/BNB)
                const token = isNativeA ? tokenBAddress : tokenAAddress;
                const amountTokenDesired = isNativeA ? amountBWei : amountAWei;
                const amountTokenMin = isNativeA ? minAmountBWei : minAmountAWei;
                const amountETHMin = isNativeA ? minAmountAWei : minAmountBWei;
                const ethValue = isNativeA ? amountAWei : amountBWei;

                writeContract(
                    {
                        address: routerAddress,
                        abi: routerAbi,
                        functionName: 'addLiquidityETH',
                        args: [token, amountTokenDesired, amountTokenMin, amountETHMin, finalAddress, BigInt(deadline)],
                        value: ethValue,
                        gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('Add liquidity transaction submitted:', hash);
                            
                            // Save to transaction history
                            if (finalAddress && chainId) {
                                try {
                                    saveSwapTransaction({
                                        txHash: hash,
                                        userAddress: finalAddress,
                                        chainId: chainId,
                                        type: 'addLiquidity',
                                        tokenIn: tokenA.symbol,
                                        tokenOut: tokenB.symbol,
                                        amountIn: amountA,
                                        amountOut: amountB,
                                        status: 'pending',
                                        timestamp: Date.now(),
                                    });
                                } catch (error) {
                                    console.error('Failed to save transaction:', error);
                                }
                            }
                        },
                        onError: (error) => {
                            console.error('Add liquidity failed:', error);
                            alert('Failed to add liquidity: ' + (error.message || 'Unknown error'));
                            setLoading(false);
                        },
                    }
                );
            } else {
                // Add liquidity with two ERC20 tokens
                writeContract(
                    {
                        address: routerAddress,
                        abi: routerAbi,
                        functionName: 'addLiquidity',
                        args: [
                            tokenAAddress,
                            tokenBAddress,
                            amountAWei,
                            amountBWei,
                            minAmountAWei,
                            minAmountBWei,
                            finalAddress,
                            BigInt(deadline),
                        ],
                        gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('Add liquidity transaction submitted:', hash);
                            
                            // Save to transaction history
                            if (finalAddress && chainId) {
                                try {
                                    saveSwapTransaction({
                                        txHash: hash,
                                        userAddress: finalAddress,
                                        chainId: chainId,
                                        type: 'addLiquidity',
                                        tokenIn: tokenA.symbol,
                                        tokenOut: tokenB.symbol,
                                        amountIn: amountA,
                                        amountOut: amountB,
                                        status: 'pending',
                                        timestamp: Date.now(),
                                    });
                                } catch (error) {
                                    console.error('Failed to save transaction:', error);
                                }
                            }
                        },
                        onError: (error) => {
                            console.error('Add liquidity failed:', error);
                            alert('Failed to add liquidity: ' + (error.message || 'Unknown error'));
                            setLoading(false);
                        },
                    }
                );
            }
        } catch (error) {
            console.error('Error adding liquidity:', error);
            alert('Failed to add liquidity: ' + (error.message || 'Unknown error'));
            setLoading(false);
        }
    };

    const formatBalance = (balance) => {
        if (!balance) return '0.00';
        const num = parseFloat(balance);
        if (num === 0) return '0.00';
        if (num < 0.0001) return num.toExponential(2);
        return num.toFixed(4);
    };

    return (
        <div className="liquidity-card">
            <div className="liquidity-card-header">
                <h2 className="liquidity-card-title">Add Liquidity</h2>
            </div>

            <div className="liquidity-card-content">
                {/* Token A Input */}
                <div className="liquidity-token-section">
                    <div className="liquidity-token-label">Token A</div>
                    <div className="liquidity-token-input-wrapper">
                        <div className="liquidity-token-selector-wrapper">
                            <MobileTokenSelector
                                selectedToken={tokenA}
                                onTokenSelect={setTokenA}
                                tokens={tokenList}
                                chainId={chainId}
                            />
                        </div>
                        <div className="liquidity-amount-wrapper">
                            <input
                                type="text"
                                className="liquidity-amount-input"
                                placeholder="0.0"
                                value={amountA}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value)) {
                                        handleAmountAChange(value);
                                    }
                                }}
                                inputMode="decimal"
                                onFocus={(e) => e.target.select()}
                            />
                            {tokenA && finalAddress && (
                                <button 
                                    className="liquidity-max-button"
                                    onClick={handleMaxA}
                                >
                                    Max
                                </button>
                            )}
                        </div>
                        {tokenA && finalAddress && (
                            <div className="liquidity-balance">
                                Balance: {formatBalance(
                                    tokenA.address === 'native' 
                                        ? ethBalanceStr 
                                        : balanceAStr
                                )} {tokenA.symbol}
                                {usdValueA && (
                                    <span style={{ marginLeft: '8px', color: '#7A7A7A' }}>
                                        ≈ ${usdValueA.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        )}
                        {approvalA && (
                            <button
                                className="liquidity-button liquidity-button-secondary"
                                onClick={() => handleApproveToken(tokenA, true)}
                                disabled={approvingA}
                                style={{ marginTop: '8px', height: '36px', fontSize: '13px' }}
                            >
                                {approvingA ? 'Approving...' : `Approve ${tokenA.symbol}`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Plus Icon */}
                <div className="liquidity-divider-plus">+</div>

                {/* Token B Input */}
                <div className="liquidity-token-section">
                    <div className="liquidity-token-label">Token B</div>
                    <div className="liquidity-token-input-wrapper">
                        <div className="liquidity-token-selector-wrapper">
                            <MobileTokenSelector
                                selectedToken={tokenB}
                                onTokenSelect={setTokenB}
                                tokens={tokenList}
                                chainId={chainId}
                            />
                        </div>
                        <div className="liquidity-amount-wrapper">
                            <input
                                type="text"
                                className="liquidity-amount-input"
                                placeholder="0.0"
                                value={amountB}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value)) {
                                        handleAmountBChange(value);
                                    }
                                }}
                                inputMode="decimal"
                                onFocus={(e) => e.target.select()}
                            />
                            {tokenB && finalAddress && (
                                <button 
                                    className="liquidity-max-button"
                                    onClick={handleMaxB}
                                >
                                    Max
                                </button>
                            )}
                        </div>
                        {tokenB && finalAddress && (
                            <div className="liquidity-balance">
                                Balance: {formatBalance(
                                    tokenB.address === 'native' 
                                        ? ethBalanceStr 
                                        : balanceBStr
                                )} {tokenB.symbol}
                                {usdValueB && (
                                    <span style={{ marginLeft: '8px', color: '#7A7A7A' }}>
                                        ≈ ${usdValueB.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        )}
                        {approvalB && (
                            <button
                                className="liquidity-button liquidity-button-secondary"
                                onClick={() => handleApproveToken(tokenB, false)}
                                disabled={approvingB}
                                style={{ marginTop: '8px', height: '36px', fontSize: '13px' }}
                            >
                                {approvingB ? 'Approving...' : `Approve ${tokenB.symbol}`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Price Ratio */}
                {priceRatio && (
                    <PriceRatioDisplay 
                        tokenA={tokenA}
                        tokenB={tokenB}
                        ratio={priceRatio}
                        priceImpact={null} // Could calculate price impact if needed
                    />
                )}

                {/* Pool Share & LP Tokens */}
                {(shareOfPool || lpTokens) && (
                    <div className="liquidity-info">
                        {shareOfPool && (
                            <div className="liquidity-info-item">
                                <span className="liquidity-info-label">Share of Pool:</span>
                                <span className="liquidity-info-value">{shareOfPool.toFixed(4)}%</span>
                            </div>
                        )}
                        {lpTokens && (
                            <div className="liquidity-info-item">
                                <span className="liquidity-info-label">LP Tokens:</span>
                                <span className="liquidity-info-value">{lpTokens.toFixed(6)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Slippage Settings */}
                <SlippageSettings 
                    slippage={slippage}
                    onSlippageChange={setSlippage}
                />

                {/* Add Liquidity Button */}
                <div className="liquidity-button-container">
                    {finalIsConnected ? (
                        <>
                            {(approvalA || approvalB) && (
                                <div className="liquidity-warning" style={{ marginBottom: '12px', fontSize: '13px' }}>
                                    ⚠️ Please approve tokens before adding liquidity
                                </div>
                            )}
                            <button
                                className="liquidity-button liquidity-button-primary"
                                onClick={handleAddLiquidity}
                                disabled={!tokenA || !tokenB || !amountA || !amountB || loading || isConfirming || approvalA || approvalB}
                            >
                                {loading || isConfirming ? (isConfirming ? 'Confirming...' : 'Adding...') : 'Add Liquidity'}
                            </button>
                            {txHash && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#7A7A7A', textAlign: 'center' }}>
                                    Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="liquidity-connect-message">
                            Connect your wallet to add liquidity
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddLiquidityCard;

