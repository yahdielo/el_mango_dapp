import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { parseAbi } from 'viem';
import { base, bsc, arbitrum } from '@reown/appkit/networks';
import axios from 'axios';
import dotenv from 'dotenv';

import MobileSwapHeader from './MobileSwapHeader';
import MobileSwapCard from './MobileSwapCard';
import SlideToSwapButton from './SlideToSwapButton';
import MobileTransactionDetails from './MobileTransactionDetails';
import BottomNavigation from './BottomNavigation';
import CallTokenList from './getTokenList';
import PickButton from './pickButton';
import ErrorToast from './ErrorToast';
import SuccessToast from './SuccessToast';
import ReferralInput from './ReferralInput';
import WhitelistBenefits from './WhitelistBenefits';

import chainConfig from '../services/chainConfig';
import { checkMinimumAmount } from '../utils/chainValidation';
import { supportsReferralSystem, supportsWhitelist } from '../utils/featureFlags';
import { formatErrorForDisplay } from '../utils/chainErrors';
import useGetEthBalance from './hooks/getEthBalance';
import useTokenBalance from './hooks/getTokenBalance';
import mangoSwapLogo from '../imgs/mangoSwapLogo.png';

import './css/SwapMobile.css';

dotenv.config();

// Configure axios to suppress expected CORS/network errors in development
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Suppress CORS and 404 errors - they're expected when API is unavailable
        if (error.code === 'ERR_NETWORK' || 
            error.message?.includes('CORS') || 
            error.response?.status === 404 ||
            error.message?.includes('Network Error')) {
            // Return a rejected promise but don't log - let the calling code handle it
            return Promise.reject(error);
        }
        // Log other unexpected errors
        console.error('Axios error:', error);
        return Promise.reject(error);
    }
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const MobileSwapBox = () => {
    const [amount1, setAmount1] = useState('');
    const [amount2, setAmount2] = useState('');
    const [selectedToken1, setSelectedToken1] = useState({ empty: true });
    const [selectedToken2, setSelectedToken2] = useState({ empty: true });
    const [showModal, setShowModal] = useState(false);
    const [outputAmount, setOutputAmount] = useState('');
    const [usdAmount, setUsdAmount] = useState(0);
    const [token1Price, setToken1Price] = useState(0);
    const [isSelectingToken1, setIsSelectingToken1] = useState(true);
    const [isChain, setChain] = useState(base);
    const [chatId, setChatId] = useState(null);
    const [referrerCode, setReferrerCode] = useState(ZERO_ADDRESS);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [minimumAmountError, setMinimumAmountError] = useState(null);

    // Hooks must be called unconditionally at the top level
    const account = useAccount();
    const chainId = useChainId();
    
    // Safely get address from account
    const address = account?.address || null;

    // Get balances - hooks must be called unconditionally
    // Pass null/undefined address if not connected, hooks will handle it
    const ethBalance1 = useGetEthBalance(address || null, selectedToken1);
    const tokenBalance1 = useTokenBalance(address || null, selectedToken1);
    const token1Balance = selectedToken1?.symbol === 'ETH' ? ethBalance1 : tokenBalance1;

    const ethBalance2 = useGetEthBalance(address || null, selectedToken2);
    const tokenBalance2 = useTokenBalance(address || null, selectedToken2);
    const token2Bal = selectedToken2?.symbol === 'ETH' ? ethBalance2 : tokenBalance2;

    useEffect(() => {
        if (address) {
            setChain(chainId === 56 ? bsc : chainId === 8453 ? base : chainId === 42161 ? arbitrum : base);
        }
    }, [address, chainId]);

    const tokenAddresses = useMemo(() => ({
        56: {
            weth: null,
            usdc: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 }
        },
        42161: {
            weth: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
            usdc: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }
        },
        8453: {
            weth: { address: '0x4200000000000000000000000000000000000006' },
            usdc: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }
        }
    }), []);

    const chainInfo = useMemo(() => {
        if (!chainId) return null;

        const routerAddress = chainConfig.getContractAddress(chainId, 'router');
        const referralAddress = chainConfig.getContractAddress(chainId, 'referral');
        const tokenAddress = chainConfig.getContractAddress(chainId, 'token');
        const gasSettings = chainConfig.getGasSettings(chainId);
        const slippageSettings = chainConfig.getSlippageTolerance(chainId);
        const minimumAmounts = chainConfig.getMinimumAmounts(chainId);
        const tokens = tokenAddresses[chainId] || {};

        return {
            chainId: chainId,
            zeroAdd: ZERO_ADDRESS,
            erc20Abi: parseAbi([
                'function approve(address spender, uint256 amount) public returns (bool)',
                'function balanceOf(address account) public view returns (uint256)',
                'function decimals() public view returns (uint8)',
            ]),
            mangoRouterAdd: routerAddress,
            mangoReferralAdd: referralAddress,
            mangoTokenAdd: tokenAddress,
            gasSettings: gasSettings,
            slippageSettings: slippageSettings,
            minimumAmounts: minimumAmounts,
            weth: tokens.weth,
            usdc: tokens.usdc,
        };
    }, [chainId, tokenAddresses]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            setReferrerCode(refCode);
        }
    }, []);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const telegram = window.Telegram.WebApp;
            const userId = telegram.initDataUnsafe?.user?.id;
            if (userId) {
                setChatId(userId);
            }
            telegram.ready();
        }
    }, []);

    // Referral code validation is handled by ReferralInput component

    const tokenParams = useMemo(() => {
        if (!chainInfo || !chainId) return null;
        
        const wethAddress = chainId !== 56 && chainInfo.weth?.address;
        const sellTokenAddress = selectedToken1.address === "ETH" && wethAddress 
            ? wethAddress 
            : selectedToken1.address;

        return {
            chainId: chainId,
            sellTokenAddress: sellTokenAddress,
            buyTokenAddress: selectedToken2.address,
            amountToSell: amount1 * 10 ** (selectedToken1.decimals || 18),
        };
    }, [chainId, selectedToken1, selectedToken2, amount1, chainInfo]);

    const fetchAmountOut = useCallback(async (params) => {
        try {
            const resp = await axios.get(`https://38654yedpe.execute-api.ca-central-1.amazonaws.com/amountOut`, { params });
            return resp.data;
        } catch (e) {
            // Note: Browser console will still show CORS errors (browser security feature)
            // but we handle them gracefully by returning null
            // These errors are expected when API is unavailable or CORS is not configured
            if (e.code === 'ERR_NETWORK' || 
                e.message?.includes('CORS') || 
                e.response?.status === 404 ||
                e.message?.includes('Network Error')) {
                // Silently handle CORS/network errors - they're expected in development
                return null;
            }
            // Only log unexpected errors
            console.error('Unexpected error fetching amount out:', e);
            return null;
        }
    }, []);

    const settingToken1Price = useCallback(async () => {
        if (selectedToken1.symbol === "BUSDT" || selectedToken1.symbol === 'USDC' || selectedToken1.symbol === 'USDT') {
            setToken1Price(1);
        } else {
            if (!chainInfo || !tokenParams) return;

            const wethAddress = chainId !== 56 && chainInfo.weth?.address;
            tokenParams.sellTokenAddress = selectedToken1.symbol === "ETH" && wethAddress
                ? wethAddress
                : selectedToken1.address;
            
            const usdcAddress = chainInfo.usdc?.address;
            if (!usdcAddress) return;
            
            tokenParams.buyTokenAddress = usdcAddress;
            tokenParams.amountToSell = 1 * 10 ** 18;

            let resp = await fetchAmountOut(tokenParams);
            
            if (!resp || !resp.buyAmount) {
                setToken1Price(0);
                return;
            }
            
            const usdcDecimals = chainInfo.usdc?.decimals || 6;
            const amountBack = resp.buyAmount / 10 ** usdcDecimals;
            const stringAmount = amountBack.toString();
            const index = stringAmount.indexOf('.');
            const amount = stringAmount.slice(0, index + 3);
            setToken1Price(amount);
        }
    }, [selectedToken1, chainInfo, tokenParams, chainId, fetchAmountOut]);

    useEffect(() => {
        if (!selectedToken1.empty) {
            settingToken1Price();
        }
    }, [selectedToken1, settingToken1Price]);

    const handleAmount1Change = useCallback((e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
            setAmount1(value);
            setUsdAmount(value * token1Price);
            
            if (value && chainId) {
                const validation = checkMinimumAmount(chainId, value, 'swap');
                if (!validation.isValid) {
                    setMinimumAmountError(validation.message);
                } else {
                    setMinimumAmountError(null);
                }
            } else {
                setMinimumAmountError(null);
            }
        }
    }, [token1Price, chainId]);

    useEffect(() => {
        if (amount1 && token1Price) {
            const usdValue = amount1 * token1Price;
            setUsdAmount(usdValue);
        }
    }, [amount1, token1Price]);

    const handleBlur = useCallback(async () => {
        if (!amount1) {
            setMinimumAmountError(null);
            return;
        }
        
        if (chainId) {
            const validation = checkMinimumAmount(chainId, amount1, 'swap');
            if (!validation.isValid) {
                setMinimumAmountError(validation.message);
                setError({ message: validation.message, severity: 'warning' });
                return;
            } else {
                setMinimumAmountError(null);
            }
        }
        
        if (selectedToken1.address && selectedToken2.address) {
            try {
                const resp = await fetchAmountOut(tokenParams);
                if (resp?.buyAmount) {
                    const amountBack = resp.buyAmount / 10 ** (!selectedToken2.decimals ? 18 : selectedToken2.decimals);
                    const stringAmount = amountBack.toString();
                    const index = stringAmount.indexOf('.');
                    setOutputAmount(stringAmount.slice(0, index + 3));
                }
            } catch (e) {
                console.error('Error in handleBlur:', e);
                const formattedError = formatErrorForDisplay(e, chainId);
                setError({
                    message: formattedError.message,
                    title: formattedError.title || 'Error Fetching Quote',
                    suggestion: formattedError.suggestion,
                    severity: 'warning',
                });
            }
        }
    }, [amount1, selectedToken1, selectedToken2, fetchAmountOut, tokenParams, chainId]);

    const handleTokenSelect = useCallback((token) => {
        const setter = isSelectingToken1 ? setSelectedToken1 : setSelectedToken2;
        setter(token);
        setShowModal(false);
    }, [isSelectingToken1]);

    const handleToken1Click = useCallback(() => {
        setIsSelectingToken1(true);
        setShowModal(true);
    }, []);

    const handleToken2Click = useCallback(() => {
        setIsSelectingToken1(false);
        setShowModal(true);
    }, []);

    const handleMaxClick = useCallback(() => {
        if (token1Balance) {
            setAmount1(token1Balance);
            setUsdAmount(token1Balance * token1Price);
        }
    }, [token1Balance, token1Price]);

    // Swap logic is handled by PickButton component via SlideToSwapButton

    // Calculate fee (placeholder - should come from API or contract)
    const fee = useMemo(() => {
        if (!outputAmount || !selectedToken2) return null;
        // Example: 0.1% fee
        const feeAmount = parseFloat(outputAmount) * 0.001;
        return feeAmount.toFixed(6);
    }, [outputAmount, selectedToken2]);

    // Calculate rate
    const rate = useMemo(() => {
        if (!amount1 || !outputAmount || !selectedToken1 || !selectedToken2) return null;
        return (parseFloat(outputAmount) / parseFloat(amount1)).toFixed(5);
    }, [amount1, outputAmount, selectedToken1, selectedToken2]);

    const rateUSD = useMemo(() => {
        if (!token1Price || !rate) return null;
        return (token1Price * parseFloat(rate)).toFixed(2);
    }, [token1Price, rate]);

    return (
        <div className="mobile-swap-container">
            <MobileSwapHeader onMenuClick={() => {
                // Handle menu click - could open wallet connect or settings
                console.log('Menu clicked');
            }} />
            
            <div style={{ paddingBottom: '0', marginBottom: '0', width: '100%', maxWidth: '604px', margin: '0 auto', paddingTop: '0', marginTop: '0' }}>
                <div className="mobile-swap-unified-card">
                    <MobileSwapCard
                        label="You Pay"
                        token={selectedToken1}
                        amount={amount1}
                        usdValue={usdAmount}
                        balance={token1Balance}
                        onTokenClick={handleToken1Click}
                        onAmountChange={handleAmount1Change}
                        onAmountBlur={handleBlur}
                        showMax={true}
                        onMaxClick={handleMaxClick}
                        chainInfo={chainInfo}
                        userAddress={address}
                        isUnified={true}
                    />

                    <div className="mobile-swap-divider-container">
                        <div className="mobile-swap-notch"></div>
                        <div className="mobile-swap-divider-line"></div>
                        <button 
                            className="mobile-swap-direction-button"
                            onClick={() => {
                                // Swap tokens
                                const temp = selectedToken1;
                                setSelectedToken1(selectedToken2);
                                setSelectedToken2(temp);
                                const tempAmount = amount1;
                                setAmount1(amount2);
                                setAmount2(tempAmount);
                            }}
                        >
                            <svg className="mobile-swap-direction-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="#000000"/>
                                {/* Up arrow - bold white */}
                                <path d="M12 6L12 10M12 6L9 9M12 6L15 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                {/* Down arrow - bold white */}
                                <path d="M12 18L12 14M12 18L9 15M12 18L15 15" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>

                    <MobileSwapCard
                        label="You Receive"
                        token={selectedToken2}
                        amount={outputAmount}
                        usdValue={outputAmount * (token1Price * (rate || 1))}
                        balance={token2Bal}
                        onTokenClick={handleToken2Click}
                        readOnly={true}
                        placeholder={outputAmount || '0'}
                        chainInfo={chainInfo}
                        userAddress={address}
                        isUnified={true}
                    />
                </div>

                <div className="mobile-swap-transaction-details-wrapper">
                    <MobileTransactionDetails
                        fee={fee}
                        feeToken={selectedToken2?.symbol}
                        rate={rate}
                        rateToken={selectedToken1?.symbol}
                        rateUSD={rateUSD}
                    />
                </div>

                {/* Swap Button - Always visible */}
                <div style={{ position: 'static', marginTop: '0', marginBottom: '0', paddingTop: '0', paddingBottom: '0' }}>
                    {address && (
                        <div ref={(el) => {
                            if (el) {
                                // Store reference for swap trigger
                                window.mobileSwapTrigger = () => {
                                    const swapBtn = el.querySelector('button');
                                    if (swapBtn && !swapBtn.disabled) {
                                        swapBtn.click();
                                    }
                                };
                            }
                        }}>
                            <PickButton 
                                token0={selectedToken1} 
                                token1={selectedToken2} 
                                amount={amount1} 
                                chain={isChain} 
                                chatId={chatId} 
                                referrer={referrerCode} 
                                chainInfo={chainInfo} 
                            />
                        </div>
                    )}
                    {/* Overlay slide button - Always visible */}
                    <div style={{ 
                        position: 'static',
                        top: 'auto',
                        left: 'auto',
                        right: 'auto',
                        pointerEvents: address && selectedToken1.address && selectedToken2.address && amount1 && parseFloat(amount1) > 0 && !minimumAmountError ? 'auto' : 'none'
                    }}>
                        <SlideToSwapButton
                            onSwap={() => {
                                if (address && window.mobileSwapTrigger) {
                                    window.mobileSwapTrigger();
                                }
                            }}
                            disabled={!address || !selectedToken1.address || !selectedToken2.address || !amount1 || parseFloat(amount1) <= 0 || !!minimumAmountError}
                            loading={false}
                            token0={selectedToken1}
                            token1={selectedToken2}
                            amount={amount1}
                            isConnected={!!address}
                        />
                    </div>
                </div>

                {/* Branding */}
                <div className="mobile-swap-branding">
                    <img src={mangoSwapLogo} alt="Mango Swap" className="mobile-swap-logo" />
                    <div className="mobile-swap-powered-by">powered by Base</div>
                </div>

                {/* Referral Input - Only show if referral system is supported */}
                {address && chainId && supportsReferralSystem(chainId) && (
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <ReferralInput
                            value={referrerCode === ZERO_ADDRESS ? '' : referrerCode}
                            onChange={(value) => setReferrerCode(value || ZERO_ADDRESS)}
                            onValidate={(isValid, message) => {
                                // Validation handled by ReferralInput component
                                if (!isValid && message) {
                                    setError({ message, severity: 'warning' });
                                }
                            }}
                            chainId={chainId}
                        />
                    </div>
                )}

                {/* Whitelist Benefits */}
                {address && chainId && supportsWhitelist(chainId) && (
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <WhitelistBenefits showBadge={false} />
                    </div>
                )}
            </div>

            <BottomNavigation />

            <CallTokenList 
                show={showModal} 
                onHide={() => setShowModal(false)} 
                onTokenSelect={handleTokenSelect} 
                chainInfo={chainInfo} 
            />

            <ErrorToast 
                error={error} 
                onClose={() => setError(null)} 
                autoClose={5000}
            />
            <SuccessToast 
                message={successMessage} 
                onClose={() => setSuccessMessage(null)} 
                autoClose={3000}
            />
        </div>
    );
};

export default MobileSwapBox;

