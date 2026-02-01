import React, { useState, useEffect, useCallback } from 'react';
import MobileTokenSelector from '../MobileTokenSelector';
import PriceRatioDisplay from './PriceRatioDisplay';
import SlippageSettings from './SlippageSettings';
import SlideToSwapButton from '../SlideToSwapButton';
import useTokenBalance from '../hooks/getTokenBalance';
import useGetEthBalance from '../hooks/getEthBalance';
import chainConfig from '../../services/chainConfig';
import '../css/LiquidityMobile.css';

const AddLiquidityCard = ({ address, isConnected, chainId }) => {
    // address and isConnected are passed as props to avoid useAccount hook issues
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

    const chainInfo = chainConfig.getChain(chainId);
    const tokenList = chainInfo?.tokens || [];

    // Get balances
    const { data: balanceA } = useTokenBalance(tokenA?.address, address, chainId);
    const { data: balanceB } = useTokenBalance(tokenB?.address, address, chainId);
    const { data: ethBalance } = useGetEthBalance(address, chainId);

    // Calculate price ratio and pool share
    useEffect(() => {
        if (tokenA && tokenB && amountA && amountB) {
            // Mock calculation - replace with actual API call
            const ratio = parseFloat(amountA) / parseFloat(amountB);
            setPriceRatio(ratio);
            
            // Mock pool share calculation
            const mockTotalSupply = 1000000;
            const mockLpTokens = Math.sqrt(parseFloat(amountA) * parseFloat(amountB));
            setLpTokens(mockLpTokens);
            setShareOfPool((mockLpTokens / mockTotalSupply) * 100);
        } else {
            setPriceRatio(null);
            setShareOfPool(null);
            setLpTokens(null);
        }
    }, [tokenA, tokenB, amountA, amountB]);

    const handleMaxA = () => {
        if (!tokenA || !address) return;
        
        if (tokenA.address === 'native') {
            setAmountA(ethBalance?.formatted || '0');
        } else {
            setAmountA(balanceA?.formatted || '0');
        }
    };

    const handleMaxB = () => {
        if (!tokenB || !address) return;
        
        if (tokenB.address === 'native') {
            setAmountB(ethBalance?.formatted || '0');
        } else {
            setAmountB(balanceB?.formatted || '0');
        }
    };

    const handleAmountAChange = (value) => {
        setAmountA(value);
        // Auto-calculate amountB based on price ratio
        if (priceRatio && value) {
            const calculatedB = parseFloat(value) / priceRatio;
            setAmountB(calculatedB.toFixed(6));
        }
    };

    const handleAmountBChange = (value) => {
        setAmountB(value);
        // Auto-calculate amountA based on price ratio
        if (priceRatio && value) {
            const calculatedA = parseFloat(value) * priceRatio;
            setAmountA(calculatedA.toFixed(6));
        }
    };

    const handleAddLiquidity = async () => {
        if (!isConnected || !tokenA || !tokenB || !amountA || !amountB) {
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement actual liquidity addition logic
            console.log('Adding liquidity:', { tokenA, tokenB, amountA, amountB, slippage });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert('Liquidity added successfully!');
            setAmountA('');
            setAmountB('');
        } catch (error) {
            console.error('Error adding liquidity:', error);
            alert('Failed to add liquidity: ' + error.message);
        } finally {
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
                            />
                            {tokenA && address && (
                                <button 
                                    className="liquidity-max-button"
                                    onClick={handleMaxA}
                                >
                                    Max
                                </button>
                            )}
                        </div>
                        {tokenA && address && (
                            <div className="liquidity-balance">
                                Balance: {formatBalance(
                                    tokenA.address === 'native' 
                                        ? ethBalance?.formatted 
                                        : balanceA?.formatted
                                )} {tokenA.symbol}
                            </div>
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
                            />
                            {tokenB && address && (
                                <button 
                                    className="liquidity-max-button"
                                    onClick={handleMaxB}
                                >
                                    Max
                                </button>
                            )}
                        </div>
                        {tokenB && address && (
                            <div className="liquidity-balance">
                                Balance: {formatBalance(
                                    tokenB.address === 'native' 
                                        ? ethBalance?.formatted 
                                        : balanceB?.formatted
                                )} {tokenB.symbol}
                            </div>
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
                    {isConnected ? (
                        <button
                            className="liquidity-button liquidity-button-primary"
                            onClick={handleAddLiquidity}
                            disabled={!tokenA || !tokenB || !amountA || !amountB || loading}
                        >
                            {loading ? 'Adding...' : 'Add Liquidity'}
                        </button>
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

