import React from 'react'; // Add this import at the top
import { Container, Card, Form, Button } from 'react-bootstrap';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { base,bsc,arbitrum } from '@reown/appkit/networks';
import SelectTokenButton from './selecTokenButton.js';
import mangoLogo from '../imgs/mangoLogo.png';
//import FetchAmountOut from "./fetchAmountOut.js"
import Info  from './info.js';
import InputBox1 from './inputBox1.js';
import { isEmpty } from './utils/utils.js';
import CallTokenList from './getTokenList.js';
import InputBoxes from './inputBox.js'
import SwapComponent from './inputBox.js';
import axios from 'axios';
import PickButton from './pickButton';
import ReferralDisplay from './ReferralDisplay';
import ReferralInput from './ReferralInput';
import WhitelistBenefits from './WhitelistBenefits';
import ErrorToast from './ErrorToast';
import SuccessToast from './SuccessToast';
import dotenv from 'dotenv';
import '../App.css';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { getContract, isAddress, parseAbi} from 'viem';
import chainConfig from '../services/chainConfig';
import { checkMinimumAmount } from '../utils/chainValidation';
import { supportsReferralSystem, supportsWhitelist, hasTokenTax, getFeatureMessage, FEATURE_FLAGS } from '../utils/featureFlags';
import { formatErrorForDisplay } from '../utils/chainErrors';
import { Alert } from 'react-bootstrap';
dotenv.config();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
console.log('this is test')
const SwapBox = () => {
    const [amount1, setAmount1] = useState('');
    const [amount2, setAmount2] = useState('');
    const [selectedToken1, setSelectedToken1] = useState({ empty: true });
    const [selectedToken2, setSelectedToken2] = useState({ empty: true });
    const [showModal, setShowModal] = useState(false);
    const [outPutAmount, setOutputAmount] = useState('');
    const [usdAmount, setUsdAmount] = useState(0);
    const [token1Price,setToken1Price] = useState(0);
    const [isSelectingToken1, setIsSelectingToken1] = useState(true);
    const [isChain, setChain] = useState(base);
    const [chatId, setChatId] = useState(null);


    const [referralLink, setReferralLink] = useState(null);
    const [referralCopied, setReferralCopied] = useState(false);
    const [canUseReferrerCode, setCanUseReferrerCode] = useState(false);
    const [hasDeterminedCanUseReferrerCode, setHasDeterminedCanUseReferrerCode] = useState(false);
    const [referrerCode, setReferrerCode] = useState(ZERO_ADDRESS);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [minimumAmountError, setMinimumAmountError] = useState(null);



    // Wagmi hooks
    const { address } = useAccount()//isConnected
    const chainId = useChainId();
    const publicClient = usePublicClient();
    //setChain(chainId);
    useEffect(()=>{
        if(address){
            setChain(chainId)
        }
    },[address,chainId]);
    console.log(isChain)
    
    // Token addresses (WETH, USDC) - these are chain-specific token addresses
    // Note: These could be moved to chain config in the future
    const tokenAddresses = useMemo(() => ({
        56: { // BSC
            weth: null, // BSC doesn't use WETH
            usdc: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 }
        },
        42161: { // Arbitrum
            weth: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
            usdc: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }
        },
        8453: { // Base
            weth: { address: '0x4200000000000000000000000000000000000006' },
            usdc: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }
        }
    }), []);

    // Chain info using ChainConfigService
    const chainInfo = useMemo(() => {
        if (!chainId) return null;

        // Get contract addresses from ChainConfigService
        const routerAddress = chainConfig.getContractAddress(chainId, 'router');
        const referralAddress = chainConfig.getContractAddress(chainId, 'referral');
        const tokenAddress = chainConfig.getContractAddress(chainId, 'token');
        
        // Get gas settings from ChainConfigService
        const gasSettings = chainConfig.getGasSettings(chainId);
        
        // Get slippage settings from ChainConfigService
        const slippageSettings = chainConfig.getSlippageTolerance(chainId);
        
        // Get minimum amounts from ChainConfigService
        const minimumAmounts = chainConfig.getMinimumAmounts(chainId);
        
        // Get token addresses for this chain
        const tokens = tokenAddresses[chainId] || {};

        return {
            chainId: chainId,
            zeroAdd: ZERO_ADDRESS,
            // ERC-20 ABI for the approve function
            erc20Abi: parseAbi([
                'function approve(address spender, uint256 amount) public returns (bool)',
                'function balanceOf(address account) public view returns (uint256)',
                'function decimals() public view returns (uint8)',
            ]),
            // Contract addresses from ChainConfigService
            mangoRouterAdd: routerAddress,
            mangoReferralAdd: referralAddress,
            mangoTokenAdd: tokenAddress,
            // Gas settings from ChainConfigService
            gasSettings: gasSettings,
            // Slippage settings from ChainConfigService
            slippageSettings: slippageSettings,
            // Minimum amounts from ChainConfigService
            minimumAmounts: minimumAmounts,
            // Token addresses (WETH, USDC)
            weth: tokens.weth,
            usdc: tokens.usdc,
        };
    }, [chainId, tokenAddresses]);
    //}

    // Get referrer code from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');

        if (refCode) {
            setReferrerCode(refCode);
        }
    }, []);

    useEffect(() => {
        if (!isEmpty(address)) {
            const currentDomain = window.location.origin;
            setReferralLink(`${currentDomain}?ref=${address}`);
        } else {
            setReferralLink(null);
        }
    }, [address]);

    // Call to Router Contract and set canUseReferrerCode
    useEffect(() => {
        if (address && chainId) {
            determineCanUseReferrerCode();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, chainId]);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const telegram = window.Telegram.WebApp;
            const userId = telegram.initDataUnsafe?.user?.id;

            if (userId) {
                setChatId(userId);
                console.log('Chat ID:', userId);
            }
            telegram.ready();
        } else {
            console.error('Telegram WebApp API not available');
        }
    }, []);

    useEffect(()=>{
        if(address){
            setChain((chainId === 56)? bsc:
                    (chainId === 8453)? base:
                    (chainId === 42161)? arbitrum:
                    base
            )
        }
    }, [address, chainId])

    const determineCanUseReferrerCode = async () => {
        try {
            if (!publicClient || !address) {
                throw new Error('No public client or address available.');
            }

            //{ENCAMPULATE THIS IN TO API CALL EXTERNALLY AND RETURN ADDRESS
            const mangoReferralAbi = parseAbi(['function getReferralChain(address) external view returns (address)']);

            const referralAddress = chainInfo?.mangoReferralAdd;
            if (!referralAddress) {
                console.warn('Referral contract address not found for chain', chainId);
                setHasDeterminedCanUseReferrerCode(true);
                return;
            }

            const contract = getContract({
                address: referralAddress,
                abi: mangoReferralAbi,
                client: publicClient,
            });
            //NOTE@:
            /**IF USER ENTERS WITH A NEW REFERAL
             * THIS WILL CHECK IF USER HAS ALREADY BEEN REFER
             */
            //NOTE@
            /** REFACTOR MIKE
             * CREAR METHODO PARA PEDIR EL VALOR DE CHAIN INFO
             */
            const existingReferrerAddress = await contract.read.getReferralChain([address]);
            ////RERTURN EXISTING ADDRESS}

            if (isAddress(existingReferrerAddress) && existingReferrerAddress !== ZERO_ADDRESS) {
                setCanUseReferrerCode(false);
            } else {
                setCanUseReferrerCode(true);
            }

            setHasDeterminedCanUseReferrerCode(true);
            } catch (error) {
                console.error(error);
                // Format error using ChainConfigService
                const formattedError = formatErrorForDisplay(error, chainId);
                setError({
                    message: formattedError.message,
                    title: formattedError.title,
                    suggestion: formattedError.suggestion,
                    severity: formattedError.severity === 'critical' ? 'critical' : 'warning',
                });
        }
    };

    //@PARAMS TO PASS GET TOKEN PRICE API CALL
    /**@Dev
     *  Sell toke address needs to manage the diferent weth addresses of evm chains
     */
    const tokenParams = useMemo(
        () => {
            if (!chainInfo || !chainId) return null;
            
            // Get WETH address for ETH swaps (BSC doesn't use WETH)
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
        },
        [chainId, selectedToken1, selectedToken2, amount1, chainInfo]
    );
    console.log(chainId)
    // Only run this effect once on mount
    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const telegram = window.Telegram.WebApp;
            const userId = telegram.initDataUnsafe?.user?.id;

            if (userId && userId !== chatId) {
                setChatId(userId);
            }
            telegram.ready();
        }
    }, [chatId, chainId]); // Only re-run if chatId changes

    const handleTokenSelect = useCallback(
        (token) => {
            const setter = isSelectingToken1 ? setSelectedToken1 : setSelectedToken2;
            setter(token);
            setShowModal(false);
        },
        [isSelectingToken1]
    );

    //NOTE: 
    //REVISIGTAR MIKE
    const settingToken1Price = useCallback(async ()=>{
         /*@DEV
          * THIS FUNCTION GETS THE SELECTED TOKEN 0
         * GETS THE PRICE IN USD AND SETS IT
         * FOR USER TO SEE THE CORRECT USD AMOUNT HE WILL BE SWAPPING
         */
        if(  selectedToken1.symbol === "BUSDT" ||
             selectedToken1.symbol === 'USDC'|| 
             selectedToken1.symbol === 'USDT'
            ){
            setToken1Price(1)
        }else{
            /*@DEV
             * if non stable coin, we will fetch price token->usdc
             * this way we get the usd price of the token
             */
            if (!chainInfo || !tokenParams) {
                console.warn('Chain info or token params not available');
                return;
            }

            // Get WETH address for ETH swaps
            const wethAddress = chainId !== 56 && chainInfo.weth?.address;
            tokenParams.sellTokenAddress = selectedToken1.symbol === "ETH" && wethAddress
                ? wethAddress
                : selectedToken1.address;
            
            console.log('this is selected token 1', selectedToken1.address);
            
            // Get USDC address for price calculation
            const usdcAddress = chainInfo.usdc?.address;
            if (!usdcAddress) {
                console.warn('USDC address not found for chain', chainId);
                return;
            }
            
            tokenParams.buyTokenAddress = usdcAddress;
            tokenParams.amountToSell = 1 * 10 ** (18);

            let resp = await fetchAmountOut(tokenParams);
            
            // Check if response is valid before accessing properties
            if (!resp || !resp.buyAmount) {
                console.warn('Failed to fetch token price from API, using default price of 0');
                setToken1Price(0);
                return;
            }
            
            const usdcDecimals = chainInfo.usdc?.decimals || 6;
            const amountBack = resp.buyAmount / 10 ** usdcDecimals;
            const stringAmount = amountBack.toString();
            const index = stringAmount.indexOf('.')

            const amount = stringAmount.slice(0, index + 3);
            setToken1Price(amount);

        }
    }, [selectedToken1, chainInfo, tokenParams, chainId, fetchAmountOut]);
    
    useEffect(()=>{
        if((!selectedToken1.empty )){
            settingToken1Price() 
        }
    },[selectedToken1, settingToken1Price])
    
    //NOTE
    const handlePercentClick = async ()=>{

    }


    const handleAmount1Change = useCallback((e) => {
        const value = e.target.value;
        // Only allow numbers and decimal point
        if (/^\d*\.?\d*$/.test(value)) {
            setAmount1(value);
            setUsdAmount(value * token1Price);
            
            // Validate minimum amount when user types
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

    // React to amount1 changes
    useEffect(() => {
        if (amount1 && token1Price) {
            const usdValue = amount1 * token1Price;
            setUsdAmount(usdValue);
        }
    }, [amount1, token1Price]); // Runs whenever amount1 or token1Price changes

    const handleAmount2Change = useCallback((e) => {
        setAmount2(e.target.value);
    }, []);

    const handleChainSelect = useCallback((chain) => {
        setChain(chain);
    }, []);
    const copyReferralCode = () => {
        if (referralLink) {
            navigator.clipboard
                .writeText(referralLink)
                .then(() => {
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                })
                .catch((err) => {
                    console.error('Failed to copy: ', err);
                });
        }
    };

    //{REFACTORIZAR MIKE
    const fetchAmountOut = useCallback(async (params) => {
        try {
            const resp = await axios.get(`https://38654yedpe.execute-api.ca-central-1.amazonaws.com/amountOut`, { params });
            return resp.data;
        } catch (e) {
            console.error('Error fetching amount out:', e);
            return null;
        }
    }, []);
    //}

    /**THIS MODEULE HANDLES WHEN USER INPUTS A AMOUNT ON BOX 1
     * AND STOP INTERACTING WITH IT
     * THIS MODULE CALL THE API TO GET EXPECTED AMOUNT OUT
     */
    /**NOTE
     * LOOK IN TO WHY NOT WORKING
     */
    const handleBlur = useCallback(async () => {
        console.log('in handle blur')
        //NOTE: THIS API IS NOT FETCHING MANGO PRICE
        if (!amount1) {
            setMinimumAmountError(null);
            return;
        }
        
        // Validate minimum amount before fetching quote
        if (chainId) {
            const validation = checkMinimumAmount(chainId, amount1, 'swap');
            if (!validation.isValid) {
                setMinimumAmountError(validation.message);
                setError({ message: validation.message, severity: 'warning' });
                return; // Don't fetch quote if below minimum
            } else {
                setMinimumAmountError(null);
            }
        }
        
         if (selectedToken1.address && selectedToken2.address) {
            try {
                const resp = await fetchAmountOut(tokenParams);
                if (resp?.buyAmount) {
                    const amountBack = resp.buyAmount / 10 ** (!selectedToken2.decimals ? 18: selectedToken2.decimals);
                    const stringAmount = amountBack.toString();
                    const index = stringAmount.indexOf('.');
                    setOutputAmount(stringAmount.slice(0, index + 3));
                    console.log('selectedToken2.decimals',selectedToken2.decimals)
                }
            } catch (e) {
                console.error('Error in handleBlur:', e);
                // Format error using ChainConfigService
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

    const handleToken1Click = useCallback(async () => {
        setIsSelectingToken1(true);
        setShowModal(true);
    }, []);

    const handleToken2Click = useCallback(() => {
        setIsSelectingToken1(false);
        setShowModal(true);
    }, []);

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ height: '90vh' }}>
            <Card style={{ width: '30rem', padding: '2rem', boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',  backgroundColor: 'rgba(255, 255, 255, 0.72)'}}>
                <div className="logo-container">
                    <img
                        src={mangoLogo}
                        width="80"
                        height="80"
                        alt="Mango Logo"
                        loading="lazy" // Add lazy loading
                    />
                </div>
                <div class="inputCointainer"></div>
                <Card.Body className="d-flex flex-column justify-content-center align-items-center">
                    <Form style={{ width: '100%' }} onSubmit={(e) => e.preventDefault()}>
                        <Form.Group className="mb-4">
                            <div className="inputBox1"
                            style={{outlineColor:'balck'}} 
                            >
                                {/** NOTE:
                                 * pass to box1 component
                                 * amount1
                                 * onChange={handleAmount1Change}
                                    onBlur={handleBlur}
                                    isSelected={!selectedToken1.empty} token={selectedToken1} onClick={handleToken1Click}
                                    usdAmount
                                */}
                                  <InputBoxes
                                  chainInfo={chainInfo}
                                  userAddress={address}
                                  amount1={amount1}
                                   onChange={handleAmount1Change}
                                    onBlur={handleBlur}
                                    isSelected={!selectedToken1.empty ? !selectedToken1.empty:!selectedToken2.empty} 
                                    token={selectedToken1} 
                                    onClick={handleToken1Click}
                                    usdAmount={usdAmount}
                                    _setAmount={setAmount1}
                                    />
                            </div>
                        </Form.Group>
                        {/** NOTE
                         * THIS IS INPUT BOX 2, SEPARATE TO OTHER COMPONENT
                         */}

                         
                           <InputBox1 
                                placeHolder={`${outPutAmount}`} value={amount2} onChange={handleAmount2Change}
                                isSelected={!selectedToken2.empty} token={selectedToken2} onClick={handleToken2Click} 
                            />
                         
                        {/* <Form.Group className="mb-4">
                            <div className="token-input-container" style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                                <Form.Control
                                    type="text"
                                    placeholder={`${outPutAmount}`}
                                    value={amount2}
                                    onChange={handleAmount2Change}
                                    style={{ fontSize: '1rem', padding: '1rem', flex: 1, marginRight: '10px' }}
                                />
                                <SelectTokenButton isSelected={!selectedToken2.empty} token={selectedToken2} onClick={handleToken2Click} />
                            </div>
                        </Form.Group> */}
                        {/* Referral Input - Only show if referral system is supported */}
                        {address && chainId && supportsReferralSystem(chainId) && (
                            <div className="mb-3">
                                <ReferralInput
                                    value={referrerCode === ZERO_ADDRESS ? '' : referrerCode}
                                    onChange={(value) => setReferrerCode(value || ZERO_ADDRESS)}
                                    onValidate={(isValid, message) => {
                                        setCanUseReferrerCode(isValid);
                                        setHasDeterminedCanUseReferrerCode(true);
                                        if (!isValid && message) {
                                            setError({ message, severity: 'warning' });
                                        }
                                    }}
                                    chainId={chainId}
                                />
                            </div>
                        )}
                        
                        {/* Referral System Not Supported Message */}
                        {address && chainId && !supportsReferralSystem(chainId) && (
                            <Alert variant="info" className="mb-3" style={{ fontSize: '0.875rem' }}>
                                {getFeatureMessage(chainId, FEATURE_FLAGS.REFERRAL_SYSTEM)}
                            </Alert>
                        )}

                        {/* Whitelist Benefits Display - Only show if whitelist is supported */}
                        {address && chainId && supportsWhitelist(chainId) && (
                            <div className="mb-3">
                                <WhitelistBenefits showBadge={false} />
                            </div>
                        )}
                        
                        {/* Token Tax Information - Only show if token tax is enabled */}
                        {chainId && hasTokenTax(chainId) && (
                            <Alert variant="warning" className="mb-3" style={{ fontSize: '0.875rem' }}>
                                <strong>⚠️ Token Tax:</strong> {getFeatureMessage(chainId, FEATURE_FLAGS.TOKEN_TAX)}
                            </Alert>
                        )}

                        {/* Minimum Amount Warning */}
                        {minimumAmountError && (
                            <Alert 
                                variant="warning" 
                                className="mb-3" 
                                style={{ fontSize: '0.875rem' }}
                                data-testid="swap-box-minimum-amount-warning"
                                role="alert"
                            >
                                <strong>⚠️ Minimum Amount:</strong> {minimumAmountError}
                            </Alert>
                        )}

                        {/* Minimum Amount Hint */}
                        {chainInfo && chainInfo.minimumAmounts && chainInfo.minimumAmounts.swap && !minimumAmountError && (
                            <div className="mb-2" style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                                Minimum swap: {chainInfo.minimumAmounts.swap} {chainConfig.getChain(chainId)?.nativeCurrency?.symbol || 'tokens'}
                            </div>
                        )}

                        {/* Gas and Slippage Settings Display */}
                        {chainInfo && chainInfo.gasSettings && (
                            <div className="mb-3" style={{ fontSize: '0.875rem', color: '#666' }}>
                                <div className="d-flex justify-content-between mb-1">
                                    <span>Gas Limit:</span>
                                    <span>{chainInfo.gasSettings.gasLimit?.toLocaleString() || 'Auto'}</span>
                                </div>
                                {chainInfo.gasSettings.gasPrice && (
                                    <div className="d-flex justify-content-between mb-1">
                                        <span>Gas Price:</span>
                                        <span>{chainInfo.gasSettings.gasPrice} gwei</span>
                                    </div>
                                )}
                                {chainInfo.slippageSettings && (
                                    <div className="d-flex justify-content-between">
                                        <span>Slippage Tolerance:</span>
                                        <span>{chainInfo.slippageSettings.default}%</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Swap Button */}
                        <div className="d-flex justify-content-center" style={{paddingTop:'10px'}}>
                            <div className="w-100">
                                
                                <PickButton token0={selectedToken1} token1={selectedToken2} amount={amount1} chain={isChain} chatId={chatId} referrer={referrerCode} chainInfo={chainInfo} />
                            </div>
                            {/* Referrer message
                            {hasDeterminedCanUseReferrerCode && (
                                <>
                                    {!isEmpty(referrerCode) && (
                                        <div className="text-center mt-2">
                                            {canUseReferrerCode ? (
                                                <p className="small text-success mb-0">
                                                    1% of the transaction fee will be transferred to referrers according to tiers {referrerCode.slice(0, 6)}...
                                                    {referrerCode.slice(-4)}
                                                </p>
                                            ) : (
                                                <p className="small text-warning mb-0">You have already used referrer code</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )} */}
                        </div>
                    </Form>
                </Card.Body>
                {/* Referral Code Card */}

                {/* Referral Display Component */}
            {address && (
                <ReferralDisplay className="mt-3" />
            )}

            {/* Referral Link Card - Keep existing for backward compatibility */}
            <Card style={{ width: '30rem', maxWidth: '100%', padding: '0.5rem 1.5rem', boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' }}>
                    <Card.Body>
                        <div className="d-flex align-items-center">
                            <Form.Control
                                type="text"
                                value={referralLink || ''}
                                readOnly
                                placeholder=""
                                style={{
                                    fontSize: '1rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#f8f9fa',
                                    borderTopRightRadius: 0,
                                    borderBottomRightRadius: 0,
                                }}
                            />
                            <Button
                                onClick={copyReferralCode}
                                className="text-nowrap"
                                disabled={!address || isEmpty(referralLink)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: referralCopied ? '#28a745' : '#F26E01',
                                    borderColor: referralCopied ? '#28a745' : '#F26E01',
                                    borderTopLeftRadius: 0,
                                    borderBottomLeftRadius: 0,
                                    opacity: !address || isEmpty(referralLink) ? 0.6 : 1,
                                }}
                            >
                                {referralCopied ? 'Copied!' : 'Copy Referral'}
                            </Button>
                        </div>
                        {address ? (
                            <p className="small text-center mt-3 mb-0">
                                {isEmpty(referralLink) ? 'Failed to load referral link' : <Info/>}
                            </p>
                        ) : (
                            <p className="small text-center mt-3 mb-0 text-warning">Connect your wallet to get your referral link</p>
                        )}
                    </Card.Body>
                </Card>

            {/* Error and Success Toasts */}
            <ErrorToast 
                error={error} 
                onClose={() => setError(null)} 
                autoClose={5000}
                data-testid="swap-box-error-toast"
            />
            <SuccessToast 
                message={successMessage} 
                onClose={() => setSuccessMessage(null)} 
                autoClose={3000}
            />
            </Card>

            <CallTokenList show={showModal} onHide={() => setShowModal(false)} onTokenSelect={handleTokenSelect} onChainSelect={handleChainSelect} chainInfo={chainInfo} />
        </Container>
    );
};

export default React.memo(SwapBox);
