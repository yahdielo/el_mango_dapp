import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, parseAbi, zeroAddress } from 'viem';
import MobileTokenSelector from '../MobileTokenSelector';
import PriceRatioDisplay from './PriceRatioDisplay';
import SlippageSettings from './SlippageSettings';
import useTokenBalance from '../hooks/getTokenBalance';
import useGetEthBalance from '../hooks/getEthBalance';
import chainConfig from '../../services/chainConfig';
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

    // Calculate USD values (mock for now)
    useEffect(() => {
        if (tokenA && amountA && parseFloat(amountA) > 0) {
            // TODO: Fetch real token prices from API
            const mockPriceA = tokenA.symbol === 'ETH' ? 3000 : tokenA.symbol === 'BNB' ? 500 : tokenA.symbol === 'USDC' ? 1 : 5;
            setUsdValueA(parseFloat(amountA) * mockPriceA);
        } else {
            setUsdValueA(null);
        }

        if (tokenB && amountB && parseFloat(amountB) > 0) {
            const mockPriceB = tokenB.symbol === 'ETH' ? 3000 : tokenB.symbol === 'BNB' ? 500 : tokenB.symbol === 'USDC' ? 1 : 5;
            setUsdValueB(parseFloat(amountB) * mockPriceB);
        } else {
            setUsdValueB(null);
        }
    }, [tokenA, tokenB, amountA, amountB]);

    // Fetch token prices and calculate price ratio
    useEffect(() => {
        const fetchPriceRatio = async () => {
            if (!tokenA || !tokenB) {
                setPriceRatio(null);
                setShareOfPool(null);
                setLpTokens(null);
                return;
            }

            try {
                // If both amounts are provided, calculate ratio from amounts
                if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
                    const ratio = parseFloat(amountA) / parseFloat(amountB);
                    setPriceRatio(ratio);
                    
                    // Calculate LP tokens using constant product formula: LP = sqrt(amountA * amountB)
                    // This is the standard AMM formula for liquidity provision
                    const amountAValue = parseFloat(amountA);
                    const amountBValue = parseFloat(amountB);
                    const calculatedLpTokens = Math.sqrt(amountAValue * amountBValue);
                    setLpTokens(calculatedLpTokens);
                    
                    // Mock total supply - in production, fetch from pool contract
                    // Total supply = total LP tokens in circulation
                    const mockTotalSupply = 1000000;
                    const share = (calculatedLpTokens / mockTotalSupply) * 100;
                    setShareOfPool(share > 0.01 ? share : null);
                } else if (tokenA && tokenB) {
                    // Try to fetch prices from API if amounts not provided
                    // TODO: Implement price fetching from DEX or price oracle
                    // For now, we'll wait for user to input amounts
                    setPriceRatio(null);
                    setShareOfPool(null);
                    setLpTokens(null);
                } else {
                    setPriceRatio(null);
                    setShareOfPool(null);
                    setLpTokens(null);
                }
            } catch (error) {
                console.error('Error calculating price ratio:', error);
                setPriceRatio(null);
            }
        };

        fetchPriceRatio();
    }, [tokenA, tokenB, amountA, amountB]);

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash) {
            alert('Liquidity added successfully!');
            setAmountA('');
            setAmountB('');
            setTxHash(null);
            setLoading(false);
        }
    }, [isConfirmed, txHash]);

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

            // TODO: Implement actual contract interaction when router supports addLiquidity
            // For now, simulate the transaction
            // In production, this would be:
            // const routerAbi = parseAbi(['function addLiquidity(...)']);
            // writeContract({
            //     address: routerAddress,
            //     abi: routerAbi,
            //     functionName: 'addLiquidity',
            //     args: [tokenA.address, tokenB.address, amountA, amountB, minAmountA, minAmountB, ...],
            //     value: tokenA.address === 'native' ? parseUnits(amountA, 18) : 0n,
            // });

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In production, this would be set from the actual transaction hash
            const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            setTxHash(mockTxHash);
            
            // The useEffect will handle the success message when transaction is confirmed
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

