import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectWallet } from '../hooks/useConnectWallet';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import CrossChainSwapCard from '../components/CrossChainSwapCard';
import ChainSelectionModal from '../components/ChainSelectionModal';
import TokenSelectModal from '../components/TokenSelectModal';
import CrossChainTransactionDetails from '../components/CrossChainTransactionDetails';
import CrossChainSwapStatusBanner from '../components/CrossChainSwapStatusBanner';
import SwapFooter from '../components/SwapFooter';
import SlideToSwapButton from '../components/SlideToSwapButton';
import { getAllChains, getChain, getSlippage } from '../utils/chainConfig';
import { getSlippageToleranceInBasisPoints } from '../utils/slippageUtils';
import { getTokensForChain } from '../config/tokenLists';
import { useTokenBalance, isNativeToken } from '../hooks/useTokenBalance';
import { useSwapValidation } from '../hooks/useSwapValidation';
import { useQuote } from '../hooks/useQuote';
import { useGasEstimate } from '../hooks/useGasEstimate';
import { useCrossChainSwap } from '../hooks/useCrossChainSwap';
import { useBridgeRouteSupport } from '../hooks/useBridgeRouteSupport';
import { LAYERSWAP_CHAIN_IDS } from '../services/bridgeApi';
import { formatBalance } from '../utils/formatBalance';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import SlippageSelector, { loadSlippageFromStorage } from '../components/SlippageSelector';

const GAS_BUFFER_NATIVE = 1000000000000000n; // 0.001 ETH

export default function CrossChainPage() {
  const { address } = useAccount();
  const { handleConnect } = useConnectWallet();
  const navigate = useNavigate();
  const allChains = useMemo(() => getAllChains(), []);
  const chains = useMemo(
    () => allChains.filter((c) => LAYERSWAP_CHAIN_IDS.includes(parseInt(c.chainId, 10))),
    [allChains]
  );

  const [sourceChainId, setSourceChainId] = useState(8453);
  const [destChainId, setDestChainId] = useState(1);
  const [sourceChain, setSourceChain] = useState(() => getChain(8453));
  const [destChain, setDestChain] = useState(() => getChain(1));
  const [tokenIn, setTokenIn] = useState(null);
  const [tokenOut, setTokenOut] = useState(null);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState(() => {
    const stored = loadSlippageFromStorage(sourceChainId, getSlippage);
    return stored ?? getSlippage(sourceChainId)?.default ?? 0.5;
  });

  const [showSourceChainModal, setShowSourceChainModal] = useState(false);
  const [showDestChainModal, setShowDestChainModal] = useState(false);
  const [showTokenInModal, setShowTokenInModal] = useState(false);
  const [showTokenOutModal, setShowTokenOutModal] = useState(false);

  const filterCrossChainTokens = useCallback((tokens) => {
    return (tokens || []).filter((t) => (t.symbol || '').toUpperCase() !== 'MANGO');
  }, []);

  const tokensIn = useMemo(
    () => filterCrossChainTokens(getTokensForChain(sourceChainId)),
    [sourceChainId, filterCrossChainTokens]
  );
  const tokensOut = useMemo(
    () => filterCrossChainTokens(getTokensForChain(destChainId)),
    [destChainId, filterCrossChainTokens]
  );

  const { balance: balanceTokenIn } = useTokenBalance({
    address,
    token: tokenIn,
    chainId: sourceChainId,
  });

  const isCrossChain = sourceChainId !== destChainId;
  const { amountOut: quoteAmountOut, loading: quoteLoading, error: quoteError, estimated: quoteEstimated, priceIn, priceOut } = useQuote({
    chainId: sourceChainId,
    tokenIn,
    tokenOut,
    amountIn,
    skip: isCrossChain,
  });

  const crossChainAmountOut = useMemo(() => {
    if (!isCrossChain || !amountIn || parseFloat(amountIn) <= 0 || !tokenIn?.symbol || !tokenOut?.symbol) return '';
    const inSym = (tokenIn.symbol || '').toUpperCase().replace(/^W/, '');
    const outSym = (tokenOut.symbol || '').toUpperCase().replace(/^W/, '');
    if (inSym === outSym) return amountIn;
    return '';
  }, [isCrossChain, amountIn, tokenIn?.symbol, tokenOut?.symbol]);

  const effectiveAmountOut = isCrossChain ? crossChainAmountOut : quoteAmountOut;
  const effectiveQuoteLoading = isCrossChain ? false : quoteLoading;
  const effectiveQuoteError = isCrossChain ? null : quoteError;
  const effectiveQuoteEstimated = isCrossChain ? true : quoteEstimated;

  const slippageBps = getSlippageToleranceInBasisPoints(sourceChainId, { getSlippage }, slippage);

  const { gasCostFormatted } = useGasEstimate({
    tokenIn,
    tokenOut,
    amountIn,
    chainId: sourceChainId,
    slippageBps,
  });

  const { isSupported: routeSupported, loading: routeLoading } = useBridgeRouteSupport(
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut
  );

  const {
    startSwap,
    swapId,
    status: bridgeStatus,
    depositActions,
    error: bridgeError,
    isLoading: bridgeLoading,
    reset: resetBridge,
  } = useCrossChainSwap();

  const { canSwap, error: validationError } = useSwapValidation({
    amount: amountIn,
    tokenIn,
    balance: balanceTokenIn,
    address,
  });

  const handleMaxClick = useCallback(() => {
    if (balanceTokenIn == null || balanceTokenIn <= 0n) return;
    const decimals = tokenIn?.decimals ?? 18;
    let amtStr;
    if (isNativeToken(tokenIn)) {
      const afterBuffer = balanceTokenIn > GAS_BUFFER_NATIVE ? balanceTokenIn - GAS_BUFFER_NATIVE : 0n;
      amtStr = formatBalance(afterBuffer, decimals);
    } else {
      amtStr = formatBalance(balanceTokenIn, decimals);
    }
    setAmountIn(amtStr);
    if (!amtStr || parseFloat(amtStr) <= 0) setAmountOut('');
    // amountOut updates from useQuote
  }, [balanceTokenIn, tokenIn]);

  useEffect(() => {
    if (!tokenIn && tokensIn[0]) setTokenIn(tokensIn[0]);
  }, [tokensIn]);
  useEffect(() => {
    if (!tokenOut && tokensOut[0]) setTokenOut(tokensOut[0]);
  }, [tokensOut]);

  // Default tokens when chain changes
  const setSourceChainWithToken = useCallback(
    (chain) => {
      const id = parseInt(chain.chainId);
      setSourceChainId(id);
      setSourceChain(chain);
      const tokens = filterCrossChainTokens(getTokensForChain(id));
      setTokenIn(tokens[0] || null);
    },
    [filterCrossChainTokens]
  );
  const setDestChainWithToken = useCallback(
    (chain) => {
      const id = parseInt(chain.chainId);
      setDestChainId(id);
      setDestChain(chain);
      const tokens = filterCrossChainTokens(getTokensForChain(id));
      setTokenOut(tokens[0] || null);
    },
    [filterCrossChainTokens]
  );

  const handleTokenInSelect = (token) => {
    setTokenIn(token);
    setShowTokenInModal(false);
  };
  const handleTokenOutSelect = (token) => {
    setTokenOut(token);
    setShowTokenOutModal(false);
  };

  const handleAmountChange = (v) => {
    setAmountIn(v);
    if (!v || parseFloat(v) <= 0) setAmountOut('');
    // amountOut updates from useQuote
  };

  const handleSwapDirection = () => {
    setSourceChainId(destChainId);
    setDestChainId(sourceChainId);
    setSourceChain(destChain);
    setDestChain(sourceChain);
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  useEffect(() => {
    if (effectiveAmountOut !== '') setAmountOut(effectiveAmountOut);
    else if (!amountIn || parseFloat(amountIn) <= 0) setAmountOut('');
  }, [effectiveAmountOut, amountIn]);

  const handleConfirmSwap = useCallback(async () => {
    if (!address) {
      handleConnect();
      return;
    }
    if (!isCrossChain) return;
    if (routeSupported === false) return;
    try {
      await startSwap({
        sourceChainId,
        destChainId,
        tokenIn,
        tokenOut,
        amountIn,
        recipient: address,
      });
    } catch (_) {
      // error set by hook
    }
  }, [
    address,
    handleConnect,
    isCrossChain,
    routeSupported,
    startSwap,
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
    amountIn,
  ]);

  const canConfirmCrossChain =
    isCrossChain &&
    routeSupported !== false &&
    canSwap &&
    !bridgeLoading;
  const canConfirm = isCrossChain ? canConfirmCrossChain : false;
  const showUnsupportedWarning = isCrossChain && routeSupported === false && !routeLoading;
  const showRouteUnknownMessage = isCrossChain && routeSupported === null && !routeLoading && amountIn && parseFloat(amountIn) > 0;

  const usdIn = amountIn && (priceIn > 0 || tokenIn?.symbol === 'USDC' || tokenIn?.symbol === 'USDT')
    ? (priceIn > 0 ? parseFloat(amountIn) * priceIn : parseFloat(amountIn))
    : 0;
  const usdOut = amountOut && (priceOut > 0 || tokenOut?.symbol === 'USDC' || tokenOut?.symbol === 'USDT')
    ? (priceOut > 0 ? parseFloat(amountOut) * priceOut : parseFloat(amountOut))
    : 0;

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
        <SwapHeader address={address} onConnect={handleConnect} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-[32px] font-medium">Cross-Chain Swap</h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[#3CF902] text-sm font-medium hover:underline"
          >
            ← Swap
          </button>
        </div>

        <div className="relative flex flex-col">
          <CrossChainSwapCard
            label="You Pay"
            chain={sourceChain}
            token={tokenIn}
            amount={amountIn}
            usdValue={usdIn}
            onChainClick={() => setShowSourceChainModal(true)}
            onTokenClick={() => setShowTokenInModal(true)}
            onAmountChange={handleAmountChange}
            onMaxClick={handleMaxClick}
          />

          <div className="flex justify-center relative z-10 -mt-[33px] -mb-[34px]">
            <button type="button" onClick={handleSwapDirection} className="relative cursor-pointer focus:outline-none">
              <svg width="103" height="77" viewBox="0 0 103 77" fill="none">
                <path d="M89.9106 38.5C89.9106 59.763 72.6735 77 51.4106 77C30.1476 77 12.9106 59.763 12.9106 38.5C12.9106 17.237 30.1476 0 51.4106 0C72.6735 0 89.9106 17.237 89.9106 38.5Z" fill="#111111" />
                <path d="M0 38.0003L22.4222 24.876L22.577 50.8563L0 38.0003Z" fill="#111111" />
                <path d="M102.999 38.0003L80.5773 24.876L80.4224 50.8563L102.999 38.0003Z" fill="#111111" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <path d="M26.6782 0.25L26.6782 41.3333L35.8448 29.25M17.5115 43.75V2.66667L8.34485 14.75" stroke="white" strokeWidth="5" strokeLinecap="square" />
                </svg>
              </div>
            </button>
          </div>

          <CrossChainSwapCard
            label="You Receive"
            chain={destChain}
            token={tokenOut}
            amount={effectiveQuoteLoading ? '...' : amountOut}
            usdValue={effectiveQuoteLoading ? 0 : usdOut}
            onChainClick={() => setShowDestChainModal(true)}
            onTokenClick={() => setShowTokenOutModal(true)}
            readOnly
          />
        </div>

        <CrossChainTransactionDetails
          amountIn={amountIn}
          amountOut={effectiveQuoteLoading ? '' : amountOut}
          sourceChain={sourceChain}
          destChain={destChain}
          estimated={effectiveQuoteEstimated}
          gasCostFormatted={gasCostFormatted}
        />

        <div className="mt-6">
          <SlippageSelector
            value={slippage}
            onChange={setSlippage}
            chainId={sourceChainId}
            getSlippage={getSlippage}
          />
        </div>

        <div className="mt-16">
          {bridgeStatus && (
            <CrossChainSwapStatusBanner
              status={bridgeStatus}
              swapId={swapId}
              depositActions={depositActions}
              onDismiss={() => {
                resetBridge();
                setAmountIn('');
                setAmountOut('');
              }}
            />
          )}
          {!isCrossChain && (
            <p className="text-gray-400 text-sm text-center mb-2">
              Select different source and destination chains for cross-chain swap
            </p>
          )}
          {showUnsupportedWarning && (
            <p className="text-amber-400 text-sm text-center mb-2">
              This route is not supported by the bridge. Try a different token or chain.
            </p>
          )}
          {showRouteUnknownMessage && (
            <p className="text-gray-500 text-xs text-center mb-2">
              Route check unavailable — you can still slide to continue; swap completes on LayerSwap.
            </p>
          )}
          {(bridgeError || validationError || effectiveQuoteError) && !bridgeStatus && (
            <p className="text-red-400 text-sm text-center mb-2">
              {mapErrorToUserMessage(bridgeError || validationError || effectiveQuoteError)}
            </p>
          )}
          <SlideToSwapButton
            onSwap={address ? handleConfirmSwap : undefined}
            onConnect={address ? handleConnect : undefined}
            swapLabel="Slide to Continue"
            emptyStateLabel={!address ? 'Connect above to continue' : undefined}
            disabled={!canConfirm || bridgeLoading}
            isPending={bridgeLoading}
          />
        </div>

        <SwapFooter />
      </div>

      <ChainSelectionModal
        show={showSourceChainModal}
        onHide={() => setShowSourceChainModal(false)}
        onSelect={setSourceChainWithToken}
        title="Select Source Chain"
        selectedChainId={sourceChainId}
        chains={chains}
      />
      <ChainSelectionModal
        show={showDestChainModal}
        onHide={() => setShowDestChainModal(false)}
        onSelect={setDestChainWithToken}
        title="Select Destination Chain"
        selectedChainId={destChainId}
        chains={chains}
      />
      <TokenSelectModal
        show={showTokenInModal}
        onHide={() => setShowTokenInModal(false)}
        tokens={tokensIn}
        onSelect={handleTokenInSelect}
        address={address}
        chainId={sourceChainId}
      />
      <TokenSelectModal
        show={showTokenOutModal}
        onHide={() => setShowTokenOutModal(false)}
        tokens={tokensOut}
        onSelect={handleTokenOutSelect}
        address={address}
        chainId={destChainId}
      />
    </div>
  );
}
