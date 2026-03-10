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
import { useCrossChainEstimate } from '../hooks/useCrossChainEstimate';
import { useCrossChainUsdPrices } from '../hooks/useCrossChainUsdPrices';
import { useRangoSupportMatrix } from '../hooks/useRangoSupportMatrix';
import { useBridgeRouteSupport } from '../hooks/useBridgeRouteSupport';
import { LAYERSWAP_CHAIN_IDS } from '../services/bridgeApi';
import { getReferralChain, syncReferral } from '../services/referralApi';
import { isCrossChainViaBackendAvailable } from '../services/crossChainSwapApi';
import { formatBalance } from '../utils/formatBalance';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import SlippageSelector, { loadSlippageFromStorage } from '../components/SlippageSelector';
import { useWhitelist } from '../hooks/useWhitelist';

const GAS_BUFFER_NATIVE = 1000000000000000n; // 0.001 ETH

/** Non-EVM chains require a destination address in that chain's format (e.g. bc1... for BTC, not 0x...) */
const NON_EVM_DEST_CHAINS = [0, 501111, 728126428, 144, 101];

function isNonEvmDest(chainId) {
  return NON_EVM_DEST_CHAINS.includes(Number(chainId));
}

export default function CrossChainPage() {
  const { address } = useAccount();
  const { handleConnect } = useConnectWallet();
  const navigate = useNavigate();
  const allChains = useMemo(() => getAllChains(), []);
  const [chains, setChains] = useState(
    () => allChains.filter((c) => LAYERSWAP_CHAIN_IDS.includes(parseInt(c.chainId, 10)))
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
  /** For non-EVM dest (BTC, SOL, XRP, etc.), user must enter receive address in that chain's format */
  const [destinationAddress, setDestinationAddress] = useState('');

  const bridgeProvider = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

  // Rango support matrix (enabled chains + tokens) for display and filtering.
  const {
    chains: rangoChains,
    tokensByChain: rangoTokensByChain,
    loading: rangoSupportLoading,
    error: rangoSupportError,
    isChainEnabled: isRangoChainEnabled,
    getTokensForRangoChain,
  } = useRangoSupportMatrix();

  const tokensIn = useMemo(() => {
    const base = getTokensForChain(sourceChainId).filter((t) => t.symbol !== 'MANGO');
    if (bridgeProvider !== 'rango' || !rangoTokensByChain) return base;
    const rangoTokens = getTokensForRangoChain(sourceChainId);
    if (!rangoTokens.length) return base;
    const allowed = new Set(
      rangoTokens.map((t) => (t.address ? t.address.toLowerCase() : t.symbol.toUpperCase()))
    );
    return base.filter((t) => {
      const key = t.address ? t.address.toLowerCase() : (t.symbol || '').toUpperCase();
      return allowed.has(key);
    });
  }, [sourceChainId, bridgeProvider, rangoTokensByChain, getTokensForRangoChain]);

  const tokensOut = useMemo(() => {
    const base = getTokensForChain(destChainId).filter((t) => t.symbol !== 'MANGO');
    if (bridgeProvider !== 'rango' || !rangoTokensByChain) return base;
    const rangoTokens = getTokensForRangoChain(destChainId);
    if (!rangoTokens.length) return base;
    const allowed = new Set(
      rangoTokens.map((t) => (t.address ? t.address.toLowerCase() : t.symbol.toUpperCase()))
    );
    return base.filter((t) => {
      const key = t.address ? t.address.toLowerCase() : (t.symbol || '').toUpperCase();
      return allowed.has(key);
    });
  }, [destChainId, bridgeProvider, rangoTokensByChain, getTokensForRangoChain]);

  const { balance: balanceTokenIn } = useTokenBalance({
    address,
    token: tokenIn,
    chainId: sourceChainId,
  });
  const { data: whitelist } = useWhitelist(address, sourceChainId);

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

  const { priceInUsd: crossChainPriceIn, priceOutUsd: crossChainPriceOut, loading: crossChainPriceLoading } = useCrossChainUsdPrices({
    isCrossChain,
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
  });

  const {
    startSwap,
    swapId,
    status: bridgeStatus,
    depositActions,
    rangoTx,
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

  // When using Rango, restrict visible chains to those Rango reports as enabled.
  useEffect(() => {
    if (bridgeProvider !== 'rango' || !rangoChains.length) {
      setChains(allChains.filter((c) => LAYERSWAP_CHAIN_IDS.includes(parseInt(c.chainId, 10))));
      return;
    }
    const enabledIds = new Set(
      rangoChains.filter((c) => c.enabled).map((c) => Number(c.chainId))
    );
    setChains(
      allChains.filter((c) => {
        const id = parseInt(c.chainId, 10);
        return LAYERSWAP_CHAIN_IDS.includes(id) && enabledIds.has(id);
      })
    );
  }, [allChains, bridgeProvider, rangoChains]);

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
  useEffect(() => {
    if (tokenIn?.symbol === 'MANGO' && tokensIn.length && !tokensIn.some((t) => t.symbol === 'MANGO')) {
      setTokenIn(tokensIn[0] || null);
    }
  }, [sourceChainId, tokensIn, tokenIn?.symbol]);
  useEffect(() => {
    if (tokenOut?.symbol === 'MANGO' && tokensOut.length && !tokensOut.some((t) => t.symbol === 'MANGO')) {
      setTokenOut(tokensOut[0] || null);
    }
  }, [destChainId, tokensOut, tokenOut?.symbol]);

  // Default tokens when chain changes
  const setSourceChainWithToken = useCallback((chain) => {
    const id = parseInt(chain.chainId);
    setSourceChainId(id);
    setSourceChain(chain);
    const tokens = getTokensForChain(id).filter((t) => t.symbol !== 'MANGO');
    setTokenIn(tokens[0] || null);
  }, []);
  const setDestChainWithToken = useCallback((chain) => {
    const id = parseInt(chain.chainId);
    setDestChainId(id);
    setDestChain(chain);
    setDestinationAddress(''); // reset when switching dest chain
    const tokens = getTokensForChain(id).filter((t) => t.symbol !== 'MANGO');
    setTokenOut(tokens[0] || null);
  }, []);

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
    setDestinationAddress('');
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
        const referrerRes = await getReferralChain(address, { allChains: true }).catch(() => null);
        const raw = referrerRes?.data ?? referrerRes;
        const referrals = raw?.referrals ?? [];
        const primaryReferrer = raw?.primaryReferrer ?? raw?.referral?.referrer ?? null;
        const sourceReferrer = referrals.find((r) => Number(r.chainId) === sourceChainId)?.referrer ?? primaryReferrer;

        const recipient = isNonEvmDest(destChainId)
          ? (destinationAddress || '').trim()
          : address;
        await startSwap({
          sourceChainId,
          destChainId,
          tokenIn,
          tokenOut,
          amountIn,
          recipient,
          referrer: sourceReferrer || undefined,
        });

        // When not using backend, run referral sync client-side (backend does it when using mangoServices)
        if (!isCrossChainViaBackendAvailable() && sourceReferrer) {
          syncReferral({
            userAddress: address,
            referrerAddress: sourceReferrer,
            sourceChainId,
            destChainId,
          }).catch(() => {});
        }
      } catch (_) {
      // error set by hook
    }
  }, [
    address,
    destinationAddress,
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

  const destAddrRequired = isNonEvmDest(destChainId);
  const destAddrValid = !destAddrRequired || (destinationAddress || '').trim().length > 0;
  const recipientForEstimate = destAddrRequired ? (destinationAddress || '').trim() : (address || '');

  const {
    loading: crossChainEstimateLoading,
    error: crossChainEstimateError,
    minAmount,
    maxAmount,
    amountTooLow,
    amountTooHigh,
  } = useCrossChainEstimate({
    enabled:
      isCrossChain &&
      bridgeProvider === 'rango' &&
      isCrossChainViaBackendAvailable() &&
      !!amountIn &&
      parseFloat(amountIn) > 0 &&
      !!tokenIn &&
      !!tokenOut,
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
    amountIn,
    recipient: recipientForEstimate,
  });
  const canConfirmCrossChain =
    isCrossChain &&
    routeSupported !== false &&
    canSwap &&
    destAddrValid &&
    !amountTooLow &&
    !amountTooHigh &&
    !bridgeLoading;
  const canConfirm = isCrossChain ? canConfirmCrossChain : false;
  const showUnsupportedWarning = isCrossChain && routeSupported === false && !routeLoading;
  const showRouteUnknownMessage = isCrossChain && routeSupported === null && !routeLoading && amountIn && parseFloat(amountIn) > 0;

  const usdIn = useMemo(() => {
    if (!amountIn || parseFloat(amountIn) <= 0) return 0;
    const amt = parseFloat(amountIn);
    if (isCrossChain) {
      const price = crossChainPriceIn > 0 ? crossChainPriceIn : (tokenIn?.symbol === 'USDC' || tokenIn?.symbol === 'USDT' ? 1 : 0);
      return price * amt;
    }
    return (priceIn > 0 ? parseFloat(amountIn) * priceIn : (tokenIn?.symbol === 'USDC' || tokenIn?.symbol === 'USDT' ? amt : 0));
  }, [amountIn, isCrossChain, crossChainPriceIn, tokenIn?.symbol, priceIn]);
  const usdOut = useMemo(() => {
    if (!amountOut || parseFloat(amountOut) <= 0) return 0;
    const amt = parseFloat(amountOut);
    if (isCrossChain) {
      const price = crossChainPriceOut > 0 ? crossChainPriceOut : (tokenOut?.symbol === 'USDC' || tokenOut?.symbol === 'USDT' ? 1 : 0);
      return price * amt;
    }
    return (priceOut > 0 ? parseFloat(amountOut) * priceOut : (tokenOut?.symbol === 'USDC' || tokenOut?.symbol === 'USDT' ? amt : 0));
  }, [amountOut, isCrossChain, crossChainPriceOut, tokenOut?.symbol, priceOut]);

  const rawBridgeError = bridgeError || validationError || effectiveQuoteError || crossChainEstimateError;
  const rawBridgeMsg = String(
    rawBridgeError?.message || rawBridgeError?.shortMessage || rawBridgeError || ''
  );
  const lowerBridgeMsg = rawBridgeMsg.toLowerCase();
  const isRangoRouteUnavailable =
    bridgeProvider === 'rango' && /route not available|no route/i.test(lowerBridgeMsg);
  const isRangoBelowMinimum =
    bridgeProvider === 'rango' && /amount below minimum|below minimum/i.test(lowerBridgeMsg);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
        <SwapHeader address={address} onConnect={handleConnect} whitelistTier={whitelist?.tier ?? null} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-[32px] font-medium">Cross-Chain Swap</h1>
            {import.meta.env.VITE_BRIDGE_PROVIDER && (
              <p className="text-xs text-gray-400 mt-1">
                Powered by{' '}
                {import.meta.env.VITE_BRIDGE_PROVIDER === 'rango' ? 'Rango' : 'Auto'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#3CF902] text-sm font-medium hover:underline"
            >
              ← Swap
            </button>
            <button
              type="button"
              onClick={() => navigate('/referral')}
              className="text-[#3CF902] text-sm font-medium hover:underline"
            >
              Referral
            </button>
          </div>
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

          {bridgeProvider === 'rango' && minAmount && (
            <p className="mt-2 text-xs text-gray-400 text-right">
              Min: {minAmount} {tokenIn?.symbol}
              {maxAmount && (
                <>
                  {' '}
                  • Max: {maxAmount} {tokenIn?.symbol}
                </>
              )}
            </p>
          )}
          {bridgeProvider === 'rango' && (amountTooLow || amountTooHigh) && (
            <p className="mt-1 text-xs text-amber-400 text-right">
              {amountTooLow
                ? 'Amount below bridge minimum for this route.'
                : 'Amount above bridge maximum for this route.'}
            </p>
          )}

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

        {destAddrRequired && (
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-2">
              {destChainId === 0 && 'Bitcoin receive address (bc1..., 1..., or 3...)'}
              {destChainId === 501111 && 'Solana receive address'}
              {destChainId === 728126428 && 'Tron receive address (T...)'}
              {destChainId === 144 && 'XRP receive address (r...)'}
              {destChainId === 101 && 'Sui receive address'}
            </label>
            <input
              type="text"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder={destChainId === 0 ? 'bc1q... or 1...' : destChainId === 501111 ? 'e.g. 7xKX...' : 'Enter address'}
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:border-transparent"
              spellCheck={false}
            />
          </div>
        )}

        <div className="mt-16">
          {bridgeStatus && (
            <CrossChainSwapStatusBanner
              status={bridgeStatus}
              swapId={swapId}
              depositActions={depositActions}
              rangoTx={rangoTx}
              sourceChainId={sourceChainId}
              sourceChain={sourceChain}
              tokenIn={tokenIn}
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
              Route check unavailable — you can still slide to continue; swap completes via the bridge.
            </p>
          )}
          {destAddrRequired && !destAddrValid && amountIn && parseFloat(amountIn) > 0 && (
            <p className="text-amber-400 text-sm text-center mb-2">
              Enter your {destChain?.chainName || 'destination'} receive address above to continue.
            </p>
          )}
          {rawBridgeError && !bridgeStatus && (
            <>
              <p className="text-red-400 text-sm text-center mb-2">
                {mapErrorToUserMessage(rawBridgeError)}
              </p>
              {bridgeProvider === 'rango' && (isRangoRouteUnavailable || isRangoBelowMinimum) && (
                <p className="text-xs text-gray-400 text-center mb-2">
                  {isRangoRouteUnavailable
                    ? 'Rango has no route for this chain/token pair right now. Try a different token or chain.'
                    : 'Rango requires a higher amount for this route. Increase the amount until it is above the minimum.'}
                </p>
              )}
            </>
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
