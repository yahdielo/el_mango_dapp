import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useConnectWallet } from '../hooks/useConnectWallet';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import SwapCard from '../components/SwapCard';
import SlideToSwapButton from '../components/SlideToSwapButton';
import SwapTransactionDetails from '../components/SwapTransactionDetails';
import UnsupportedChainBanner from '../components/UnsupportedChainBanner';
import TokenSelectModal from '../components/TokenSelectModal';
import SwapFooter from '../components/SwapFooter';
import { getTokensForChain, isChainSupportedForSwap } from '../config/tokenLists';
import { useTokenBalance, isNativeToken } from '../hooks/useTokenBalance';
import { useSwapValidation } from '../hooks/useSwapValidation';
import { useQuote } from '../hooks/useQuote';
import { useSwap } from '../hooks/useSwap';
import { useGasEstimate } from '../hooks/useGasEstimate';
import { formatBalance } from '../utils/formatBalance';
import { getSlippage, getReferrerAddress, getRouterAddress } from '../utils/chainConfig';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import { sanitizeAmountInput } from '../utils/inputValidation';
import { getSlippageToleranceInBasisPoints } from '../utils/slippageUtils';
import SlippageSelector, { loadSlippageFromStorage } from '../components/SlippageSelector';

const DEFAULT_CHAIN = 8453;
const GAS_BUFFER_NATIVE = 1000000000000000n; // 0.001 ETH

export default function SwapPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { handleConnect } = useConnectWallet();
  const navigate = useNavigate();
  const effectiveChainId = chainId || DEFAULT_CHAIN;
  const SWAP_TOKENS = useMemo(() => getTokensForChain(effectiveChainId), [effectiveChainId]);
  const [amount1, setAmount1] = useState('');
  const [amount2, setAmount2] = useState('');
  const [token1, setToken1] = useState(SWAP_TOKENS[1] || SWAP_TOKENS[0]);
  const [token2, setToken2] = useState(SWAP_TOKENS[2] || SWAP_TOKENS[0]);
  const [slippage, setSlippage] = useState(() => {
    const stored = loadSlippageFromStorage(effectiveChainId, getSlippage);
    return stored ?? getSlippage(effectiveChainId)?.default ?? 0.5;
  });

  const { balance: balance1 } = useTokenBalance({
    address,
    token: token1,
    chainId: effectiveChainId,
  });

  const { amountOut: quoteAmountOut, loading: quoteLoading, error: quoteError, estimated: quoteEstimated, priceIn, priceOut } = useQuote({
    chainId: effectiveChainId,
    tokenIn: token1,
    tokenOut: token2,
    amountIn: amount1,
  });

  const slippageBps = getSlippageToleranceInBasisPoints(effectiveChainId, { getSlippage }, slippage);
  const referrer = useMemo(() => getReferrerAddress(effectiveChainId), [effectiveChainId]);

  const { executeSwap, isPending: swapPending, error: swapError, txHash, reset: resetSwap, isSuccess: swapSuccess, explorerUrl } = useSwap({
    tokenIn: token1,
    tokenOut: token2,
    amountIn: amount1,
    amountOut: amount2,
    chainId: effectiveChainId,
    slippageBps,
    address,
    referrer,
  });

  const { gasCostFormatted } = useGasEstimate({
    tokenIn: token1,
    tokenOut: token2,
    amountIn: amount1,
    chainId: effectiveChainId,
    slippageBps,
    referrer,
  });

  const routerConfigured = useMemo(() => Boolean(getRouterAddress(effectiveChainId)), [effectiveChainId]);
  const routerError = useMemo(() => {
    if (effectiveChainId && isChainSupportedForSwap(effectiveChainId) && !routerConfigured) {
      return 'Router not configured';
    }
    return null;
  }, [effectiveChainId, routerConfigured]);

  const { canSwap, error: validationError } = useSwapValidation({
    amount: amount1,
    tokenIn: token1,
    balance: balance1,
    address,
  });

  useEffect(() => {
    if (quoteAmountOut !== '') setAmount2(quoteAmountOut);
    else if (!amount1 || parseFloat(amount1) <= 0) setAmount2('');
  }, [quoteAmountOut, amount1]);

  const handleMaxClick = useCallback(() => {
    if (balance1 == null || balance1 <= 0n) return;
    const decimals = token1?.decimals ?? 18;
    let amtStr;
    if (isNativeToken(token1)) {
      const afterBuffer = balance1 > GAS_BUFFER_NATIVE ? balance1 - GAS_BUFFER_NATIVE : 0n;
      amtStr = formatBalance(afterBuffer, decimals);
    } else {
      amtStr = formatBalance(balance1, decimals);
    }
    setAmount1(amtStr);
    // amount2 will update from useQuote
  }, [balance1, token1]);

  useEffect(() => {
    setToken1(SWAP_TOKENS[1] || SWAP_TOKENS[0]);
    setToken2(SWAP_TOKENS[2] || SWAP_TOKENS[0]);
  }, [chainId, SWAP_TOKENS]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectingFor, setSelectingFor] = useState(1);

  const openTokenModal = useCallback((forField) => {
    setSelectingFor(forField);
    setShowTokenModal(true);
  }, []);

  const handleTokenSelect = useCallback((token) => {
    if (selectingFor === 1) {
      if (token.symbol === token2?.symbol) setToken2(token1);
      setToken1(token);
    } else {
      if (token.symbol === token1?.symbol) setToken1(token2);
      setToken2(token);
    }
    setShowTokenModal(false);
  }, [selectingFor, token1, token2]);

  const handleAmount1Change = (e) => {
    const raw = e.target.value;
    const decimals = token1?.decimals ?? 18;
    const v = sanitizeAmountInput(raw, decimals);
    setAmount1(v);
    if (!v || parseFloat(v) <= 0) setAmount2('');
    // amount2 updates from useQuote
  };

  const handleSwapTokens = () => {
    if (swapPending) return;
    setToken1(token2);
    setToken2(token1);
    setAmount1(amount2);
    setAmount2(amount1);
  };

  const handleSwapClick = () => {
    if (!address) return;
    executeSwap();
  };

  const handleSuccessDismiss = () => {
    resetSwap();
    setAmount1('');
    setAmount2('');
  };

  const usdValue1 = amount1 && priceIn > 0 ? (parseFloat(amount1) * priceIn).toFixed(2) : amount1 && (token1?.symbol === 'USDC' || token1?.symbol === 'USDT') ? amount1 : null;
  const usdValue2 = amount2 && priceOut > 0 ? (parseFloat(amount2) * priceOut).toFixed(2) : amount2 && (token2?.symbol === 'USDC' || token2?.symbol === 'USDT') ? amount2 : null;

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
        <SwapHeader address={address} onConnect={handleConnect} />
        {chainId && !isChainSupportedForSwap(chainId) && (
          <UnsupportedChainBanner currentChainId={chainId} />
        )}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-[32px] font-medium">Swap</h1>
          <button
            type="button"
            onClick={() => navigate('/cross-chain')}
            className="text-[#3CF902] text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-[#111111] rounded px-2 py-2 -my-1 min-h-[44px]"
            aria-label="Go to cross-chain bridge"
          >
            Cross-Chain →
          </button>
        </div>

        <div className="relative flex flex-col">
          <SwapCard
            label="You Pay"
            token={token1}
            amount={amount1}
            onAmountChange={handleAmount1Change}
            onTokenClick={() => openTokenModal(1)}
            onMaxClick={handleMaxClick}
            usdValue={usdValue1}
            disabled={swapPending}
          />

          <div className="flex justify-center relative z-10 -mt-[33px] -mb-[34px]">
            <button
              onClick={handleSwapTokens}
              type="button"
              disabled={swapPending}
              className={`relative min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-[#111111] rounded-full ${swapPending ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              aria-label="Swap input and output tokens"
            >
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

          <SwapCard
            label="You Receive"
            token={token2}
            amount={quoteLoading ? '...' : amount2}
            onTokenClick={() => openTokenModal(2)}
            readOnly
            disabled={swapPending}
            usdValue={quoteLoading ? null : usdValue2}
          />
        </div>

        <div className="mt-6">
          <SlippageSelector
            value={slippage}
            onChange={setSlippage}
            chainId={effectiveChainId}
            getSlippage={getSlippage}
            disabled={swapPending}
          />
        </div>

        <SwapTransactionDetails
          amountIn={amount1}
          amountOut={quoteLoading ? '' : amount2}
          tokenIn={token1}
          tokenOut={token2}
          slippage={slippage}
          gasCostFormatted={gasCostFormatted}
          route={token1?.symbol && token2?.symbol ? `${token1.symbol} → ${token2.symbol}` : null}
          estimated={!!quoteEstimated}
        />

        <div className="mt-16">
          {swapSuccess && (
            <div className="mb-4 p-4 rounded-xl bg-[#3CF902]/20 border border-[#3CF902]/50">
              <p className="text-[#3CF902] font-medium mb-2">Swap successful!</p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3CF902] text-sm underline"
                >
                  View on explorer
                </a>
              )}
              <button
                type="button"
                onClick={handleSuccessDismiss}
                className="mt-2 block text-white text-sm hover:underline"
              >
                Swap again
              </button>
            </div>
          )}
          {(routerError || validationError || quoteError || swapError) && !swapSuccess && (
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-red-400 text-sm flex-1">
                {routerError || mapErrorToUserMessage(validationError || quoteError || swapError)}
              </p>
              {swapError && (
                <button
                  type="button"
                  onClick={resetSwap}
                  className="text-[#3CF902] text-sm hover:underline flex-shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
          <SlideToSwapButton
            onSwap={address && routerConfigured ? handleSwapClick : undefined}
            onConnect={handleConnect}
            disabled={!canSwap || swapSuccess || swapPending || !routerConfigured}
            isPending={swapPending}
          />
        </div>

        <SwapFooter />
      </div>

      <TokenSelectModal
        show={showTokenModal && !swapPending}
        onHide={() => !swapPending && setShowTokenModal(false)}
        tokens={SWAP_TOKENS}
        onSelect={handleTokenSelect}
        address={address}
        chainId={effectiveChainId}
      />
    </div>
  );
}
