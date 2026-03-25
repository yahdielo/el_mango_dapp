import { useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useConnectWallet } from '../hooks/useConnectWallet';
import { useCrossChainSwap } from '../hooks/useCrossChainSwap';
import { useCrossChainEstimate } from '../hooks/useCrossChainEstimate';
import { useBridgeMeta } from '../hooks/useBridgeMeta';
import { useCrossChainUsdPrices } from '../hooks/useCrossChainUsdPrices';
import SlideToSwapButton from '../components/SlideToSwapButton';
import CrossChainSwapStatusBanner from '../components/CrossChainSwapStatusBanner';
import { getTelegramWebApp } from '../hooks/useTelegramWebApp';
import { getTokensForChain } from '../config/tokenLists';
import { getNetworkName, CHAIN_ID_TO_NETWORK } from '../services/bridgeApi';
import { formatBalance } from '../utils/formatBalance';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { getStoredReferrer } from '../utils/referrerStorage';
import { isCrossChainViaBackendAvailable, initiateCrossChainViaBackend } from '../services/crossChainSwapApi';

const DEFAULT_SOURCE = 8453;   // Base
const DEFAULT_DEST   = 1;      // Ethereum
const POPULAR_CHAINS = [8453, 1, 56, 137, 10, 42161, 43114, 501111];

// Quick token list for Telegram's compact UI
const QUICK_TOKENS = {
  8453:  ['ETH', 'USDC', 'USDT'],
  1:     ['ETH', 'USDC', 'USDT', 'WBTC'],
  56:    ['BNB', 'USDT', 'USDC'],
  137:   ['POL', 'USDC', 'USDT'],
  10:    ['ETH', 'USDC', 'USDT'],
  42161: ['ETH', 'USDC', 'USDT'],
  43114: ['AVAX', 'USDC', 'USDT'],
  501111:['SOL', 'USDC', 'USDT'],
};

function getDefaultToken(chainId) {
  const tokens = QUICK_TOKENS[chainId] ?? ['ETH'];
  const list = getTokensForChain(chainId);
  return list.find(t => t.symbol === tokens[0]) ?? list[0];
}

export default function TelegramPage() {
  const tg = getTelegramWebApp();
  const { address } = useAccount();
  const { handleConnect } = useConnectWallet();

  const [sourceChainId, setSourceChainId] = useState(DEFAULT_SOURCE);
  const [destChainId, setDestChainId]     = useState(DEFAULT_DEST);
  const [tokenIn, setTokenIn]   = useState(() => getDefaultToken(DEFAULT_SOURCE));
  const [tokenOut, setTokenOut] = useState(() => getDefaultToken(DEFAULT_DEST));
  const [amount, setAmount]     = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'swapping' | 'done'
  const [swapResult, setSwapResult] = useState(null);
  const [error, setError] = useState('');

  const activeReferrer = useMemo(() => {
    if (!address) return null;
    const r = getStoredReferrer(address);
    return r && r !== '0x0000000000000000000000000000000000000000' ? r : null;
  }, [address]);

  const { bridgeMeta } = useBridgeMeta();
  const { amountOut, loading: estimating } = useCrossChainEstimate({
    sourceChainId, destChainId,
    tokenIn: tokenIn?.symbol, tokenOut: tokenOut?.symbol,
    amountIn: amount,
    enabled: !!amount && parseFloat(amount) > 0,
  });
  const { usdIn, usdOut } = useCrossChainUsdPrices({
    sourceChainId, destChainId,
    tokenIn: tokenIn?.symbol, tokenOut: tokenOut?.symbol,
    amountIn: amount, amountOut,
  });

  const { balance } = useTokenBalance({ token: tokenIn, chainId: sourceChainId });

  const availableChains = useMemo(
    () => POPULAR_CHAINS.filter(id => !!CHAIN_ID_TO_NETWORK[id]),
    []
  );

  const handleSwap = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStep('swapping');
    setError('');
    try {
      const recipient = destAddress || address;
      if (!recipient) throw new Error('Connect wallet or enter a destination address');
      const result = await initiateCrossChainViaBackend({
        sourceChainId, destChainId,
        tokenIn: tokenIn?.address ?? tokenIn?.symbol,
        tokenOut: tokenOut?.address ?? tokenOut?.symbol,
        amountIn: amount,
        recipient,
        userAddress: address,
        referrer: activeReferrer,
      });
      setSwapResult(result);
      setStep('done');
      tg?.HapticFeedback?.notificationOccurred('success');
    } catch (err) {
      setError(err?.message ?? 'Swap failed');
      setStep('confirm');
      tg?.HapticFeedback?.notificationOccurred('error');
    }
  }, [amount, destAddress, address, sourceChainId, destChainId, tokenIn, tokenOut, activeReferrer, tg]);

  const chainName = (id) => {
    const net = CHAIN_ID_TO_NETWORK[id];
    return getNetworkName(net) || String(id);
  };

  // ── Form step ──────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <img src="/mango-logo.svg" alt="Mango" className="w-7 h-7" onError={e => { e.target.style.display = 'none'; }} />
            <span className="font-bold text-lg text-[#3CF902]">MangoSwap</span>
          </div>
          {address ? (
            <span className="text-xs text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded-full">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          ) : (
            <button
              onClick={handleConnect}
              className="text-xs bg-[#3CF902] text-black font-bold px-3 py-1.5 rounded-full"
            >
              Connect
            </button>
          )}
        </div>

        <div className="flex-1 px-4 pb-6 space-y-3">
          {/* Source chain + token */}
          <div className="bg-[#111] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">From</span>
              <select
                value={sourceChainId}
                onChange={e => {
                  const id = parseInt(e.target.value);
                  setSourceChainId(id);
                  setTokenIn(getDefaultToken(id));
                }}
                className="bg-[#1a1a1a] text-white text-xs px-2 py-1 rounded-lg border border-gray-800"
              >
                {availableChains.map(id => (
                  <option key={id} value={id}>{chainName(id)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-light outline-none text-white placeholder-gray-700"
              />
              <select
                value={tokenIn?.symbol}
                onChange={e => {
                  const tokens = getTokensForChain(sourceChainId);
                  setTokenIn(tokens.find(t => t.symbol === e.target.value) ?? tokens[0]);
                }}
                className="bg-[#1a1a1a] text-white text-sm font-semibold px-3 py-2 rounded-xl border border-gray-800"
              >
                {(QUICK_TOKENS[sourceChainId] ?? []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              {usdIn ? <span className="text-xs text-gray-500">${Number(usdIn).toFixed(2)}</span> : <span />}
              {balance != null && (
                <button
                  onClick={() => setAmount(formatBalance(balance, tokenIn?.decimals ?? 18))}
                  className="text-xs text-[#3CF902]/70"
                >
                  Max {formatBalance(balance, tokenIn?.decimals ?? 18)}
                </button>
              )}
            </div>
          </div>

          {/* Swap arrow */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setSourceChainId(destChainId);
                setDestChainId(sourceChainId);
                setTokenIn(tokenOut);
                setTokenOut(tokenIn);
              }}
              className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-[#3CF902] transition-colors"
            >
              ⇅
            </button>
          </div>

          {/* Destination chain + token */}
          <div className="bg-[#111] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">To</span>
              <select
                value={destChainId}
                onChange={e => {
                  const id = parseInt(e.target.value);
                  setDestChainId(id);
                  setTokenOut(getDefaultToken(id));
                }}
                className="bg-[#1a1a1a] text-white text-xs px-2 py-1 rounded-lg border border-gray-800"
              >
                {availableChains.map(id => (
                  <option key={id} value={id}>{chainName(id)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-2xl font-light text-gray-400">
                {estimating ? '…' : amountOut ? Number(amountOut).toFixed(6) : '0.0'}
              </div>
              <select
                value={tokenOut?.symbol}
                onChange={e => {
                  const tokens = getTokensForChain(destChainId);
                  setTokenOut(tokens.find(t => t.symbol === e.target.value) ?? tokens[0]);
                }}
                className="bg-[#1a1a1a] text-white text-sm font-semibold px-3 py-2 rounded-xl border border-gray-800"
              >
                {(QUICK_TOKENS[destChainId] ?? []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {usdOut && <span className="text-xs text-gray-500">${Number(usdOut).toFixed(2)}</span>}
          </div>

          {/* Destination address for non-EVM */}
          {[501111, 728126428, 101, 144].includes(destChainId) && (
            <div className="bg-[#111] rounded-2xl p-3">
              <label className="text-xs text-gray-500 block mb-1">Destination address</label>
              <input
                type="text"
                placeholder="Paste destination wallet address"
                value={destAddress}
                onChange={e => setDestAddress(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-700"
              />
            </div>
          )}

          {/* Referral badge */}
          {activeReferrer && (
            <div className="flex items-center gap-1.5 justify-center text-xs text-[#3CF902]/60">
              <span>✓ Referral active</span>
              <span className="font-mono text-gray-600">{activeReferrer.slice(0, 6)}…{activeReferrer.slice(-4)}</span>
            </div>
          )}

          {/* CTA */}
          {address ? (
            <button
              onClick={() => {
                if (!amount || parseFloat(amount) <= 0) return;
                setStep('confirm');
              }}
              disabled={!amount || parseFloat(amount) <= 0 || sourceChainId === destChainId}
              className="w-full py-4 rounded-2xl font-bold text-black text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'linear-gradient(135deg, #3CF902 0%, #27c400 100%)' }}
            >
              Review Swap
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="w-full py-4 rounded-2xl font-bold text-black text-base"
              style={{ background: 'linear-gradient(135deg, #3CF902 0%, #27c400 100%)' }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Confirm step ───────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col px-4 pt-6 pb-8 space-y-4">
        <button onClick={() => setStep('form')} className="text-gray-500 text-sm flex items-center gap-1">
          ← Back
        </button>
        <h2 className="text-xl font-bold">Confirm Swap</h2>

        <div className="bg-[#111] rounded-2xl p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">From</span>
            <span>{amount} {tokenIn?.symbol} on {chainName(sourceChainId)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">To</span>
            <span>{amountOut ? Number(amountOut).toFixed(6) : '~'} {tokenOut?.symbol} on {chainName(destChainId)}</span>
          </div>
          {usdIn && <div className="flex justify-between text-xs text-gray-500">
            <span>Value</span><span>~${Number(usdIn).toFixed(2)}</span>
          </div>}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Integrator fee</span><span>3%</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <SlideToSwapButton
          onComplete={handleSwap}
          label="Slide to Swap"
          disabled={false}
        />
      </div>
    );
  }

  // ── Swapping / loading ─────────────────────────────────────────────────────
  if (step === 'swapping') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-[#3CF902]/30 border-t-[#3CF902] animate-spin" />
        <p className="text-gray-400 text-sm">Initiating cross-chain swap…</p>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 gap-6">
      <div className="w-16 h-16 rounded-full bg-[#3CF902]/10 flex items-center justify-center text-3xl">✓</div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-[#3CF902]">Swap Initiated</h2>
        <p className="text-sm text-gray-400">Your cross-chain swap is being processed.</p>
        {swapResult?.swapId && (
          <p className="text-xs text-gray-600 font-mono mt-2">ID: {swapResult.swapId}</p>
        )}
      </div>
      {swapResult?.providerSwapId && (
        <CrossChainSwapStatusBanner
          swapId={swapResult.swapId ?? swapResult.providerSwapId}
          provider={swapResult.provider}
          compact
        />
      )}
      <button
        onClick={() => { setStep('form'); setSwapResult(null); setAmount(''); setError(''); }}
        className="mt-4 px-8 py-3 rounded-2xl font-bold text-black"
        style={{ background: '#3CF902' }}
      >
        New Swap
      </button>
    </div>
  );
}
