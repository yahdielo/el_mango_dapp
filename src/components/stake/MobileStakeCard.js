import React, { useState, useEffect } from 'react';
import MobileTokenSelector from '../MobileTokenSelector';
import SlideToSwapButton from '../SlideToSwapButton';
import useTokenBalance from '../hooks/getTokenBalance';
import useGetEthBalance from '../hooks/getEthBalance';
import chainConfig from '../../services/chainConfig';
import '../css/StakeMobile.css';

const MobileStakeCard = ({ address, isConnected, chainId }) => {
    const [selectedToken, setSelectedToken] = useState(null);
    const [amount, setAmount] = useState('');
    const [apy, setApy] = useState(null);
    const [estimatedRewards, setEstimatedRewards] = useState(null);
    const [loading, setLoading] = useState(false);

    const chainInfo = chainConfig.getChain(chainId);
    const tokenList = chainInfo?.tokens || [];

    // Get balances
    const { data: tokenBalance } = useTokenBalance(selectedToken?.address, address, chainId);
    const { data: ethBalance } = useGetEthBalance(address, chainId);

    // Fetch APY when token is selected
    useEffect(() => {
        if (selectedToken) {
            // TODO: Fetch actual APY from API
            // Mock APY based on token
            const mockApy = selectedToken.symbol === 'MANGO' ? 12.5 : 8.5;
            setApy(mockApy);
        } else {
            setApy(null);
        }
    }, [selectedToken]);

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
        if (!selectedToken || !address) return;
        
        if (selectedToken.address === 'native') {
            setAmount(ethBalance?.formatted || '0');
        } else {
            setAmount(tokenBalance?.formatted || '0');
        }
    };

    const handleStake = async () => {
        if (!isConnected || !selectedToken || !amount) {
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement actual staking logic
            console.log('Staking:', { token: selectedToken, amount, apy });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert('Tokens staked successfully!');
            setAmount('');
        } catch (error) {
            console.error('Error staking:', error);
            alert('Failed to stake tokens: ' + error.message);
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
                    {selectedToken && address && (
                        <div className="stake-balance">
                            Balance: {formatBalance(
                                selectedToken.address === 'native' 
                                    ? ethBalance?.formatted 
                                    : tokenBalance?.formatted
                            )} {selectedToken.symbol}
                        </div>
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

                {/* APY Display */}
                {apy && (
                    <div className="stake-apy">
                        <div className="stake-apy-label">APY</div>
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
                    {isConnected ? (
                        <button
                            className="stake-button stake-button-primary"
                            onClick={handleStake}
                            disabled={!selectedToken || !amount || loading}
                        >
                            {loading ? 'Staking...' : 'Stake Tokens'}
                        </button>
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

