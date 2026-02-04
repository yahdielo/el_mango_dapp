import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, parseAbi } from 'viem';
import MobileTokenSelector from '../MobileTokenSelector';
import useTokenBalance from '../hooks/getTokenBalance';
import useGetEthBalance from '../hooks/getEthBalance';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice } from '../../services/priceOracle';
import { getAPY, getLockPeriodsFromContract, LOCK_PERIODS, LOCK_PERIOD_LABELS, STAKING_ABI } from '../../services/stakingService';
import { saveSwapTransaction, updateSwapTransaction } from '../../services/transactionHistory';
import '../css/StakeMobile.css';

const MobileStakeCard = ({ address, isConnected, chainId }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [selectedToken, setSelectedToken] = useState(null);
    const [amount, setAmount] = useState('');
    const [apy, setApy] = useState(null);
    const [lockPeriod, setLockPeriod] = useState('30'); // Default 30 days
    const [availableLockPeriods, setAvailableLockPeriods] = useState(Object.keys(LOCK_PERIODS));
    const [estimatedRewards, setEstimatedRewards] = useState(null);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [approvalNeeded, setApprovalNeeded] = useState(false);
    const [approving, setApproving] = useState(false);
    const [usdValue, setUsdValue] = useState(null);

    const chainInfo = chainConfig.getChain(chainId);
    const tokenList = chainInfo?.tokens || [];
    const stakingAddress = chainConfig.getContractAddress(chainId, 'manager'); // Assuming manager contract handles staking
    const gasSettings = chainConfig.getGasSettings(chainId);
    const publicClient = usePublicClient();
    const { writeContract } = useWriteContract();

    // Get balances - hooks return strings directly
    const tokenBalanceStr = useTokenBalance(finalAddress, selectedToken);
    const ethBalanceStr = useGetEthBalance(finalAddress, selectedToken?.address === 'native' ? selectedToken : null);

    // ERC20 ABI
    const erc20Abi = parseAbi([
        'function approve(address spender, uint256 amount) public returns (bool)',
        'function allowance(address owner, address spender) public view returns (uint256)',
        'function balanceOf(address account) public view returns (uint256)',
        'function decimals() public view returns (uint8)',
    ]);

    // Check token approval
    const { data: allowance } = useReadContract({
        address: selectedToken?.address && selectedToken.address !== 'native' ? selectedToken.address : undefined,
        abi: erc20Abi,
        functionName: 'allowance',
        args: stakingAddress && selectedToken?.address && selectedToken.address !== 'native' && finalAddress 
            ? [finalAddress, stakingAddress] 
            : undefined,
        query: {
            enabled: !!selectedToken && selectedToken.address !== 'native' && !!stakingAddress && !!finalAddress && finalIsConnected,
        },
    });

    // Transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    // Check if approval is needed
    useEffect(() => {
        if (!selectedToken || !amount || !stakingAddress || selectedToken.address === 'native') {
            setApprovalNeeded(false);
            return;
        }

        const amountValue = parseFloat(amount);
        if (amountValue <= 0 || allowance === undefined) {
            setApprovalNeeded(false);
            return;
        }

        const decimals = selectedToken.decimals || 18;
        const requiredAmount = parseUnits(amount, decimals);
        setApprovalNeeded(allowance < requiredAmount);
    }, [selectedToken, amount, allowance, stakingAddress]);

    // Fetch token price and calculate USD value
    const fetchTokenPrice = useCallback(async () => {
        if (!selectedToken || !amount || parseFloat(amount) <= 0) {
            setUsdValue(null);
            return;
        }

        try {
            const tokenSymbol = selectedToken.symbol;
            const price = await getTokenPrice(tokenSymbol);
            
            if (price && price > 0) {
                const usdValue = parseFloat(amount) * price;
                setUsdValue(usdValue);
            } else {
                // Fallback to mock price if API fails
                const mockPrice = tokenSymbol === 'ETH' ? 3000 : tokenSymbol === 'BNB' ? 500 : tokenSymbol === 'MANGO' ? 5 : 1;
                setUsdValue(parseFloat(amount) * mockPrice);
            }
        } catch (error) {
            console.warn('Error fetching token price:', error);
            // Fallback to mock price on error
            const mockPrice = selectedToken.symbol === 'ETH' ? 3000 : selectedToken.symbol === 'BNB' ? 500 : selectedToken.symbol === 'MANGO' ? 5 : 1;
            setUsdValue(parseFloat(amount) * mockPrice);
        }
    }, [selectedToken, amount]);

    useEffect(() => {
        fetchTokenPrice();
        
        // Auto-refresh price every 30 seconds
        const interval = setInterval(() => {
            if (selectedToken && amount && parseFloat(amount) > 0) {
                fetchTokenPrice();
            }
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchTokenPrice]);

    // Fetch available lock periods from contract
    useEffect(() => {
        const fetchLockPeriods = async () => {
            if (publicClient && stakingAddress) {
                try {
                    const periods = await getLockPeriodsFromContract(publicClient, stakingAddress);
                    if (periods && periods.length > 0) {
                        // Convert seconds to days and match with our LOCK_PERIODS
                        const periodKeys = periods.map(seconds => {
                            const days = Math.floor(seconds / (24 * 60 * 60));
                            return Object.keys(LOCK_PERIODS).find(key => LOCK_PERIODS[key] === seconds) || days.toString();
                        }).filter(key => LOCK_PERIODS[key]);
                        if (periodKeys.length > 0) {
                            setAvailableLockPeriods(periodKeys);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to fetch lock periods:', error);
                }
            }
        };
        fetchLockPeriods();
    }, [publicClient, stakingAddress]);

    // Fetch APY when token or lock period changes
    const fetchAPY = useCallback(async () => {
        if (!selectedToken || !chainId) {
            setApy(null);
            return;
        }

        try {
            const lockPeriodSeconds = LOCK_PERIODS[lockPeriod] || LOCK_PERIODS['30'];
            const tokenAddress = selectedToken.address === 'native' 
                ? 'native' 
                : selectedToken.address;
            
            const apyValue = await getAPY(
                publicClient,
                stakingAddress,
                tokenAddress,
                selectedToken.symbol,
                chainId,
                lockPeriodSeconds
            );
            
            setApy(apyValue);
        } catch (error) {
            console.error('Error fetching APY:', error);
            // Fallback to mock APY
            const mockApy = selectedToken.symbol === 'MANGO' ? 12.5 : selectedToken.symbol === 'BNB' ? 8.5 : 6.2;
            setApy(mockApy);
        }
    }, [selectedToken, lockPeriod, chainId, publicClient, stakingAddress]);

    useEffect(() => {
        fetchAPY();
        
        // Auto-refresh APY every 60 seconds
        const interval = setInterval(() => {
            if (selectedToken) {
                fetchAPY();
            }
        }, 60000);
        
        return () => clearInterval(interval);
    }, [fetchAPY]);

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash && finalAddress && chainId) {
            // Update transaction status in history
            try {
                updateSwapTransaction(txHash, 'completed', {
                    confirmedAt: new Date().toISOString(),
                });
            } catch (error) {
                console.error('Failed to update transaction status:', error);
            }
            
            alert('Tokens staked successfully!');
            setAmount('');
            setTxHash(null);
            setLoading(false);
        }
    }, [isConfirmed, txHash, finalAddress, chainId]);

    // Calculate estimated rewards
    useEffect(() => {
        if (amount && apy) {
            const principal = parseFloat(amount);
            const annualRewards = principal * (apy / 100);
            const dailyRewards = annualRewards / 365;
            setEstimatedRewards({
                daily: dailyRewards,
                monthly: dailyRewards * 30,
                yearly: annualRewards
            });
        } else {
            setEstimatedRewards(null);
        }
    }, [amount, apy]);

    const handleMax = () => {
        if (!selectedToken || !finalAddress) return;
        
        if (selectedToken.address === 'native') {
            setAmount(ethBalanceStr || '0');
        } else {
            setAmount(tokenBalanceStr || '0');
        }
    };

    const handleApproveToken = async () => {
        if (!selectedToken || !stakingAddress || !finalAddress || selectedToken.address === 'native') return;

        const amountValue = parseFloat(amount);
        if (!amount || amountValue <= 0) {
            alert('Please enter an amount first');
            return;
        }

        setApproving(true);
        try {
            const decimals = selectedToken.decimals || 18;
            const maxApproval = parseUnits('1000000000', decimals); // Approve a large amount

            writeContract(
                {
                    address: selectedToken.address,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [stakingAddress, maxApproval],
                    gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                },
                {
                    onSuccess: (hash) => {
                        console.log('Approval transaction submitted:', hash);
                        setTimeout(() => {
                            setApprovalNeeded(false);
                            setApproving(false);
                        }, 3000);
                    },
                    onError: (error) => {
                        console.error('Approval failed:', error);
                        alert('Failed to approve token: ' + (error.message || 'Unknown error'));
                        setApproving(false);
                    },
                }
            );
        } catch (error) {
            console.error('Error approving token:', error);
            alert('Failed to approve token: ' + (error.message || 'Unknown error'));
            setApproving(false);
        }
    };

    const handleStake = async () => {
        if (!finalIsConnected || !selectedToken || !amount || !stakingAddress) {
            return;
        }

        const amountValue = parseFloat(amount);
        if (amountValue <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        // Check balance
        const balance = selectedToken.address === 'native' 
            ? parseFloat(ethBalanceStr || '0')
            : parseFloat(tokenBalanceStr || '0');

        if (amountValue > balance) {
            alert(`Insufficient ${selectedToken.symbol} balance. Available: ${balance.toFixed(4)}`);
            return;
        }

        // Check if approval is needed
        if (approvalNeeded && selectedToken.address !== 'native') {
            alert('Please approve token first');
            return;
        }

        setLoading(true);
        try {
            const lockPeriodSeconds = LOCK_PERIODS[lockPeriod] || LOCK_PERIODS['30'];
            const decimals = selectedToken.decimals || 18;
            const amountWei = parseUnits(amount, decimals);

            // Prepare transaction config
            let txConfig = {
                address: stakingAddress,
                abi: STAKING_ABI,
                functionName: '',
                args: [],
                value: 0n,
                gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
            };

            if (selectedToken.address === 'native') {
                // Stake native token (ETH/BNB)
                txConfig.functionName = 'stakeETH';
                txConfig.args = [BigInt(lockPeriodSeconds)];
                txConfig.value = amountWei;
            } else {
                // Stake ERC20 token
                txConfig.functionName = 'stake';
                txConfig.args = [
                    selectedToken.address,
                    amountWei,
                    BigInt(lockPeriodSeconds)
                ];
            }

            writeContract(txConfig, {
                onSuccess: (hash) => {
                    setTxHash(hash);
                    console.log('Stake transaction submitted:', hash);
                    
                    // Save to transaction history
                    if (finalAddress && chainId) {
                        try {
                            saveSwapTransaction({
                                txHash: hash,
                                userAddress: finalAddress,
                                chainId: chainId,
                                type: 'stake',
                                tokenInSymbol: selectedToken.symbol,
                                tokenInAddress: selectedToken.address === 'native' ? 'native' : selectedToken.address,
                                amountIn: amount,
                                tokenOutSymbol: 'Staked',
                                amountOut: amount,
                                status: 'pending',
                                lockPeriod: lockPeriodSeconds,
                                lockPeriodDays: lockPeriod,
                            });
                        } catch (error) {
                            console.error('Failed to save transaction to history:', error);
                        }
                    }
                },
                onError: (error) => {
                    console.error('Stake failed:', error);
                    alert('Failed to stake tokens: ' + (error.message || 'Unknown error'));
                    setLoading(false);
                },
            });
        } catch (error) {
            console.error('Error staking:', error);
            alert('Failed to stake tokens: ' + (error.message || 'Unknown error'));
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
        <div className="stake-card">
            <div className="stake-card-header">
                <h2 className="stake-card-title">Stake Tokens</h2>
            </div>

            <div className="stake-card-content">
                {/* Token Selection */}
                <div className="stake-token-section">
                    <div className="stake-token-label">Select Token</div>
                    <div className="stake-token-selector-wrapper">
                        <MobileTokenSelector
                            selectedToken={selectedToken}
                            onTokenSelect={setSelectedToken}
                            tokens={tokenList}
                            chainId={chainId}
                        />
                    </div>
                    {selectedToken && finalAddress && (
                        <div className="stake-balance">
                            Balance: {formatBalance(
                                selectedToken.address === 'native' 
                                    ? ethBalanceStr 
                                    : tokenBalanceStr
                            )} {selectedToken.symbol}
                            {usdValue && (
                                <span style={{ marginLeft: '8px', color: '#7A7A7A' }}>
                                    ≈ ${usdValue.toFixed(2)}
                                </span>
                            )}
                        </div>
                    )}
                    {approvalNeeded && (
                        <button
                            className="stake-button stake-button-secondary"
                            onClick={handleApproveToken}
                            disabled={approving}
                            style={{ marginTop: '8px', height: '36px', fontSize: '13px' }}
                        >
                            {approving ? 'Approving...' : `Approve ${selectedToken?.symbol}`}
                        </button>
                    )}
                </div>

                {/* Amount Input */}
                <div className="stake-amount-section">
                    <div className="stake-token-label">Amount to Stake</div>
                    <div className="stake-amount-wrapper">
                        <input
                            type="text"
                            className="stake-amount-input"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                    setAmount(value);
                                }
                            }}
                        />
                        {selectedToken && address && (
                            <button 
                                className="stake-max-button"
                                onClick={handleMax}
                            >
                                Max
                            </button>
                        )}
                    </div>
                </div>

                {/* Lock Period Selection */}
                <div className="stake-lock-period-section">
                    <div className="stake-token-label">Lock Period</div>
                    <select
                        className="stake-lock-period-select"
                        value={lockPeriod}
                        onChange={(e) => setLockPeriod(e.target.value)}
                    >
                        {availableLockPeriods.map((period) => (
                            <option key={period} value={period}>
                                {LOCK_PERIOD_LABELS[period] || `${period} days`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* APY Display */}
                {apy && (
                    <div className="stake-apy">
                        <div className="stake-apy-label">APY ({LOCK_PERIOD_LABELS[lockPeriod] || `${lockPeriod} days`})</div>
                        <div className="stake-apy-value">{apy.toFixed(2)}%</div>
                    </div>
                )}

                {/* Estimated Rewards */}
                {estimatedRewards && (
                    <div className="stake-rewards-preview">
                        <div className="stake-rewards-title">Estimated Rewards</div>
                        <div className="stake-rewards-list">
                            <div className="stake-rewards-item">
                                <span className="stake-rewards-label">Daily:</span>
                                <span className="stake-rewards-value">
                                    {estimatedRewards.daily.toFixed(6)} {selectedToken?.symbol}
                                </span>
                            </div>
                            <div className="stake-rewards-item">
                                <span className="stake-rewards-label">Monthly:</span>
                                <span className="stake-rewards-value">
                                    {estimatedRewards.monthly.toFixed(6)} {selectedToken?.symbol}
                                </span>
                            </div>
                            <div className="stake-rewards-item">
                                <span className="stake-rewards-label">Yearly:</span>
                                <span className="stake-rewards-value">
                                    {estimatedRewards.yearly.toFixed(6)} {selectedToken?.symbol}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stake Button */}
                <div className="stake-button-container">
                    {finalIsConnected ? (
                        <>
                            {approvalNeeded && (
                                <div className="stake-warning" style={{ marginBottom: '12px', fontSize: '13px' }}>
                                    ⚠️ Please approve token before staking
                                </div>
                            )}
                            <button
                                className="stake-button stake-button-primary"
                                onClick={handleStake}
                                disabled={!selectedToken || !amount || loading || isConfirming || approvalNeeded}
                            >
                                {loading || isConfirming ? (isConfirming ? 'Confirming...' : 'Staking...') : 'Stake Tokens'}
                            </button>
                            {txHash && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#7A7A7A', textAlign: 'center' }}>
                                    Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="stake-connect-message">
                            Connect your wallet to stake tokens
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileStakeCard;

