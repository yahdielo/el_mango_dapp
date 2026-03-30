import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectWallet } from '../hooks/useConnectWallet';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import CrossChainSwapCard from '../components/CrossChainSwapCard';
import ChainSelectionModal from '../components/ChainSelectionModal';
import TokenSelectModal from '../components/TokenSelectModal';
import CrossChainTransactionDetails from '../components/CrossChainTransactionDetails';
import CrossChainSwapStatusBanner from '../components/CrossChainSwapStatusBanner';
import SwapFooter from '../components/SwapFooter';
import SlideToSwapButton from '../components/SlideToSwapButton';
import { getAllChains, getChain, getSlippage, ZERO_ADDRESS } from '../utils/chainConfig';
import { getSlippageToleranceInBasisPoints } from '../utils/slippageUtils';
import { getTokensForChain } from '../config/tokenLists';
import { useTokenBalance, isNativeToken } from '../hooks/useTokenBalance';
import { useSwapValidation } from '../hooks/useSwapValidation';
import { useQuote } from '../hooks/useQuote';
import { useGasEstimate } from '../hooks/useGasEstimate';
import { useCrossChainSwap } from '../hooks/useCrossChainSwap';
import { useBridgeMeta } from '../hooks/useBridgeMeta';
import { useCrossChainEstimate } from '../hooks/useCrossChainEstimate';
import { useCrossChainUsdPrices } from '../hooks/useCrossChainUsdPrices';
import { useRangoSupportMatrix } from '../hooks/useRangoSupportMatrix';
import { useBridgeRouteSupport } from '../hooks/useBridgeRouteSupport';
import {
  LAYERSWAP_CHAIN_IDS,
  LAYERSWAP_ONLY_CHAIN_IDS,
  getNetworkName,
} from '../services/bridgeApi';
import { isLayerSwapVerifiedCrossAssetCorridor } from '../config/layerswapVerifiedCorridors';
import { isSymbiosisOnlyPair } from '../config/symbiosisOnlyPairs';
import { isSquidOnlyPair } from '../config/squidOnlyPairs';
import { isLifiOnlyPair } from '../config/lifiOnlyPairs';
import { getReferralChain, syncReferral } from '../services/referralApi';
import { isCrossChainViaBackendAvailable } from '../services/crossChainSwapApi';
import { formatBalance } from '../utils/formatBalance';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import SlippageSelector, { loadSlippageFromStorage } from '../components/SlippageSelector';
import { useWhitelist } from '../hooks/useWhitelist';
import { getStoredReferrer } from '../utils/referrerStorage';
import { getAuthSessionNonce, buildAuthSessionMessage, createAuthSessionToken } from '../services/authSessionApi';

const GAS_BUFFER_NATIVE = 1000000000000000n; // 0.001 ETH
const SOLANA_CHAIN_ID = 501111;
const TRON_CHAIN_ID = 728126428;
/** Matches backend validateSolanaAddress (base58, 32–44 chars) */
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** Matches backend validateTronAddress (T + 33 base58 chars) */
const TRON_ADDRESS_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

// LayerSwap-native route discovery missing pairs (86) are all directed pairs where either endpoint
// is XRP (144) or Sui (101) when using native token inputs/outputs.
const LAYERSWAP_NATIVE_ROUTE_MISSING_CHAIN_IDS = new Set([101, 144]);

function normalizeSymbolForTokenCompare(symbol) {
  const s = String(symbol || '').toUpperCase().trim();
  // Treat wrapped native as its canonical native symbol for UI matching.
  if (s === 'WETH' || s === 'ETH') return 'ETH';
  if (s === 'WMATIC' || s === 'MATIC' || s === 'POL') return 'POL';
  if (s === 'WBNB' || s === 'BNB') return 'BNB';
  if (s === 'WAVAX' || s === 'AVAX') return 'AVAX';
  // Arbitrum USDC.e vs native USDC — LayerSwap /sources uses USDC
  if (s === 'USDC.E' || s === 'USDCE') return 'USDC';
  return s;
}

/**
 * LayerSwap metadata can include "native-like" entries where `contract/address` is null.
 * We must only allow the canonical LayerSwap native symbol for the selected chain,
 * otherwise synthetic tokens can appear (e.g. non-ETH symbols showing on Ethereum).
 */
function getCanonicalLayerSwapNativeSymbol(chainId) {
  const id = Number(chainId);
  // Ethereum-like EVM chains
  if ([1, 8453, 42161, 10, 43114, 167000, 480, 48900, 34443, 81457, 1890, 59144, 911003, 911004].includes(id))
    return 'ETH';
  // Polygon uses POL on LayerSwap
  if (id === 137) return 'POL';
  // New EVM chains
  if (id === 5000) return 'MNT';
  if (id === 80094) return 'BERA';
  if (id === 42220) return 'CELO';
  if (id === 252) return 'FRAX';
  if (id === 1329) return 'SEI';
  if (id === 143) return 'MON';
  if (id === 7000) return 'ZETA';
  if (id === 122) return 'FUSE';
  if (id === 911001) return 'USDC'; // Hyperliquid
  if (id === 911002) return 'TON';
  // Fallback: try to match whatever LayerSwap returns for known wrapped native symbols
  return null;
}

/**
 * LayerSwap token list from bridge meta. For LayerSwap-only chains, show all API-listed
 * tokens (appendix / Untitled-1.md); for other chains, intersect with static `base` symbols.
 */
function buildLayerSwapTokensFromMeta(chainId, bridgeMetaTokens, base) {
  const net = getNetworkName(chainId);
  if (!net || !Array.isArray(bridgeMetaTokens) || !bridgeMetaTokens.length) return null;
  const layerswapChainKey = `layerswap:${net}`;
  const metaTokens = bridgeMetaTokens.filter(
    (t) => t.chainKey === layerswapChainKey && t.symbol && t.symbol !== 'MANGO'
  );
  if (!metaTokens.length) return null;

  const canonicalNativeSym = getCanonicalLayerSwapNativeSymbol(chainId);
  const baseAllowedSymbols = new Set(
    base.map((t) => normalizeSymbolForTokenCompare(t.symbol)).filter(Boolean)
  );
  const tokenKey = (t) => `${(t.symbol || '').toUpperCase()}|${(t.address || '').toLowerCase()}`;
  const layerswapOnly = LAYERSWAP_ONLY_CHAIN_IDS.has(Number(chainId));

  const mapped = metaTokens
    .filter((t) => {
      const isNative = !t.address;
      if (isNative) {
        if (!canonicalNativeSym) return false;
        return normalizeSymbolForTokenCompare(t.symbol) === canonicalNativeSym;
      }
      if (layerswapOnly) return true;
      return baseAllowedSymbols.has(normalizeSymbolForTokenCompare(t.symbol));
    })
    .map((t) => ({
      symbol: t.symbol,
      name: t.symbol,
      decimals: t.decimals,
      address: t.address ?? ZERO_ADDRESS,
      ...(t.logoURI || t.logo ? { logoURI: t.logoURI || t.logo } : {}),
      ...(t.address ? {} : { native: true }),
    }));

  const out = new Map();
  for (const t of mapped) out.set(tokenKey(t), t);
  // Meta tokens often omit logoURI; static `base` list has TrustWallet/CoinGecko URLs — merge, don't skip.
  for (const t of base) {
    const k = tokenKey(t);
    const existing = out.get(k);
    if (!existing) {
      out.set(k, t);
    } else {
      out.set(k, {
        ...existing,
        logoURI: existing.logoURI || t.logoURI,
        name:
          t.name && String(t.name).trim() && t.name !== t.symbol
            ? t.name
            : existing.name,
      });
    }
  }
  return Array.from(out.values());
}

/**
 * UX guardrail for Ethereum token modal:
 * keep only bridge-focused assets to avoid long unrelated token lists.
 */
const ETHEREUM_BRIDGE_TOKEN_SYMBOLS = new Set(['ETH', 'USDC', 'USDT', 'DAI']);
function filterEthereumBridgeTokens(chainId, tokens) {
  if (Number(chainId) !== 1) return tokens;
  const out = (tokens || []).filter((t) => ETHEREUM_BRIDGE_TOKEN_SYMBOLS.has(String(t?.symbol || '').toUpperCase()));
  return out.length ? out : tokens;
}

/** Non-EVM chains require a destination address in that chain's format (e.g. bc1... for BTC, not 0x...) */
const NON_EVM_DEST_CHAINS = [0, 501111, 728126428, 144, 101, 911002];

function isNonEvmDest(chainId) {
  return NON_EVM_DEST_CHAINS.includes(Number(chainId));
}

/** Bitcoin address format (matches backend: legacy, bech32, testnet bech32). Invalid chars like / cause route errors. */
function isValidBitcoinAddress(addr) {
  if (!addr || typeof addr !== 'string') return false;
  const s = addr.trim();
  if (!s) return false;
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(s) || /^bc1[a-z0-9]{13,74}$/.test(s) || /^tb1[a-z0-9]{13,74}$/.test(s);
}

export default function CrossChainPage() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { handleConnect } = useConnectWallet();
  const { solanaAddress, isConnected: isSolanaConnected, connect: connectSolana, disconnect: disconnectSolana } = useSolanaWallet();
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
  /** When source is Bitcoin, bridge needs sender's Bitcoin address (where BTC will be sent from) */
  const [bitcoinSenderAddress, setBitcoinSenderAddress] = useState('');
  /** When source is Solana (Symbiosis), backend requires a Solana userAddress — not the EVM wagmi address */
  const [solanaSenderAddress, setSolanaSenderAddress] = useState('');
  /** When source is Tron, backend requires a Tron sender address (T...) */
  const [tronSenderAddress, setTronSenderAddress] = useState('');

  const bridgeProvider = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

  /** Sending *from* Bitcoin (chain 0): backend uses Rango only (deposit-address model). */
  const bitcoinSource = Number(sourceChainId) === 0;
  /** Sending *to* Bitcoin: backend uses Rango only (EVM tx → BTC receive address). */
  const bitcoinDest = Number(destChainId) === 0;
  const solanaSource = Number(sourceChainId) === SOLANA_CHAIN_ID;
  const tronSource = Number(sourceChainId) === TRON_CHAIN_ID;

  const {
    startSwap,
    swapId,
    status: bridgeStatus,
    depositActions,
    rangoTx,
    symbiosisSolana,
    loopringWithdrawalInfo,
    provider: activeProvider,
    error: bridgeError,
    errorMinAmount,
    errorSuggestion,
    isLoading: bridgeLoading,
    reset: resetBridge,
    refetchDeposit,
  } = useCrossChainSwap();

  const bridgeLabelDisplay = useMemo(() => {
    if (activeProvider) {
      // After a swap is started, use the actual provider returned by the backend.
      if (activeProvider === 'layerswap') return 'LayerSwap';
      if (activeProvider === 'rango') return 'Rango';
      if (activeProvider === 'symbiosis') return 'Symbiosis';
      if (activeProvider === 'lifi') return 'LiFi';
      if (activeProvider === 'squid') return 'Squid';
      if (activeProvider === 'bungee') return 'Bungee';
      if (activeProvider === 'inbridge') return 'Inbridge';
      if (activeProvider === 'loopring') return 'Loopring';
      return activeProvider;
    }
    // Pre-swap: derive label from the pair corridor.
    if (bitcoinSource) return 'Rango'; // Rango is primary for BTC (deposit-address, no memo)
    if (isSymbiosisOnlyPair(sourceChainId, destChainId)) return 'Symbiosis';
    if (isSquidOnlyPair(sourceChainId, destChainId)) return 'Squid';
    // LiFi corridors: backend tries LiFi first, then falls back to Rango/LayerSwap
    // automatically — show "Auto" pre-swap so we don't lock in a specific brand
    // before we know which provider actually quotes the route.
    if (
      isLifiOnlyPair(sourceChainId, destChainId) &&
      tokenIn?.symbol && tokenOut?.symbol &&
      normalizeSymbolForTokenCompare(tokenIn.symbol) !== normalizeSymbolForTokenCompare(tokenOut.symbol) &&
      !isLayerSwapVerifiedCrossAssetCorridor(sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol)
    ) return 'Auto';
    if (bridgeProvider === 'auto') return 'Auto';
    if (bridgeProvider === 'layerswap') return 'LayerSwap';
    if (bridgeProvider === 'rango') return 'Rango';
    return bridgeProvider ? bridgeProvider.charAt(0).toUpperCase() + bridgeProvider.slice(1) : 'Auto';
  }, [bridgeProvider, bitcoinSource, activeProvider, sourceChainId, destChainId, tokenIn, tokenOut]);

  // If the swap involves any of our "LayerSwap-only" chainIds, force the frontend
  // token filtering and UI messaging to use LayerSwap semantics as well.
  // BTC source must follow Rango in the UI (quotes, min/max, tokens) — matches mangoServices (Rango-only for chain 0).
  // Symbiosis corridors (Solana↔EVM) bypass LayerSwap token semantics entirely.
  // Tron cross-asset pairs (BNB→TRX, etc.) route to Rango; Inbridge only handles same-token Tron bridges.
  // Squid-only corridors (e.g. Avalanche→Ethereum) bypass LayerSwap token semantics entirely.
  // LiFi-only corridors: cross-asset pairs (e.g. BSC BNB→ETH) use LiFi; same-asset and LS-verified pairs still use LayerSwap.
  const TRON_CHAIN_ID_FE = 728126428;
  const isTronPair = Number(sourceChainId) === TRON_CHAIN_ID_FE || Number(destChainId) === TRON_CHAIN_ID_FE;
  const isTronCrossAsset = isTronPair &&
    tokenIn?.symbol && tokenOut?.symbol &&
    normalizeSymbolForTokenCompare(tokenIn.symbol) !== normalizeSymbolForTokenCompare(tokenOut.symbol);
  const squidCorridorOk = isSquidOnlyPair(sourceChainId, destChainId);
  // LiFi handles cross-asset pairs on LiFi corridors UNLESS the token pair is a LayerSwap exclusive (e.g. USDT→USDT stays LS).
  const lifiCrossAssetCorridor = isLifiOnlyPair(sourceChainId, destChainId) &&
    tokenIn?.symbol && tokenOut?.symbol &&
    normalizeSymbolForTokenCompare(tokenIn.symbol) !== normalizeSymbolForTokenCompare(tokenOut.symbol) &&
    !isLayerSwapVerifiedCrossAssetCorridor(sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol);
  // Bitcoin routes via THORChain (primary) → Rango fallback; treat as 'rango' for
  // token/UI filtering purposes since the effectiveBridgeProvider drives token lists.
  const effectiveBridgeProvider = (bitcoinSource || bitcoinDest)
    ? 'rango'
    : isTronCrossAsset
      ? 'rango'
      : isSymbiosisOnlyPair(sourceChainId, destChainId)
        ? 'symbiosis'
        : squidCorridorOk
          ? 'squid'
          : lifiCrossAssetCorridor
            ? 'auto'
            : LAYERSWAP_ONLY_CHAIN_IDS.has(Number(sourceChainId)) || LAYERSWAP_ONLY_CHAIN_IDS.has(Number(destChainId))
              ? 'layerswap'
              : bridgeProvider;

  // Rango support matrix (enabled chains + tokens) for display and filtering.
  const {
    chains: rangoChains,
    tokensByChain: rangoTokensByChain,
    loading: rangoSupportLoading,
    error: rangoSupportError,
    isChainEnabled: isRangoChainEnabled,
    getTokensForRangoChain,
  } = useRangoSupportMatrix();

  const { chains: bridgeMetaChains, tokens: bridgeMetaTokens } = useBridgeMeta();

  const tokensIn = useMemo(() => {
    const staticTokens = getTokensForChain(sourceChainId).filter((t) => t.symbol !== 'MANGO');
    const base =
      staticTokens.length > 0
        ? staticTokens
        : (() => {
            const chain = getChain(sourceChainId);
            const native = chain?.nativeCurrency;
            if (!native) return [];
            return [
              {
                symbol: native.symbol,
                name: native.name ?? native.symbol,
                decimals: native.decimals ?? 18,
                address: ZERO_ADDRESS,
                native: true,
              },
            ];
          })();

    if (effectiveBridgeProvider === 'rango' && rangoTokensByChain) {
      const rangoTokens = getTokensForRangoChain(sourceChainId);
      if (!rangoTokens.length) return base;
      const allowed = new Set(
        rangoTokens.map((t) => (t.address ? t.address.toLowerCase() : t.symbol.toUpperCase()))
      );
      const filtered = base.filter((t) => {
        const key = t.address ? t.address.toLowerCase() : (t.symbol || '').toUpperCase();
        return allowed.has(key);
      });
      return filterEthereumBridgeTokens(sourceChainId, filtered);
    }

    if (effectiveBridgeProvider === 'layerswap' && Array.isArray(bridgeMetaTokens) && bridgeMetaTokens.length) {
      const fromMeta = buildLayerSwapTokensFromMeta(sourceChainId, bridgeMetaTokens, base);
      if (fromMeta?.length) {
        return filterEthereumBridgeTokens(sourceChainId, fromMeta);
      }
    }

    return filterEthereumBridgeTokens(sourceChainId, base);
  }, [sourceChainId, effectiveBridgeProvider, rangoTokensByChain, getTokensForRangoChain, bridgeMetaTokens]);

  const tokensOut = useMemo(() => {
    const staticTokens = getTokensForChain(destChainId).filter((t) => t.symbol !== 'MANGO');
    const base =
      staticTokens.length > 0
        ? staticTokens
        : (() => {
            const chain = getChain(destChainId);
            const native = chain?.nativeCurrency;
            if (!native) return [];
            return [
              {
                symbol: native.symbol,
                name: native.name ?? native.symbol,
                decimals: native.decimals ?? 18,
                address: ZERO_ADDRESS,
                native: true,
              },
            ];
          })();
    if (effectiveBridgeProvider === 'rango' && rangoTokensByChain) {
      const rangoTokens = getTokensForRangoChain(destChainId);
      if (!rangoTokens.length) return base;
      const allowed = new Set(
        rangoTokens.map((t) => (t.address ? t.address.toLowerCase() : t.symbol.toUpperCase()))
      );
      const filtered = base.filter((t) => {
        const key = t.address ? t.address.toLowerCase() : (t.symbol || '').toUpperCase();
        return allowed.has(key);
      });
      return filterEthereumBridgeTokens(destChainId, filtered);
    }

    if (effectiveBridgeProvider === 'layerswap' && Array.isArray(bridgeMetaTokens) && bridgeMetaTokens.length) {
      const fromMeta = buildLayerSwapTokensFromMeta(destChainId, bridgeMetaTokens, base);
      if (fromMeta?.length) {
        return filterEthereumBridgeTokens(destChainId, fromMeta);
      }
    }

    return filterEthereumBridgeTokens(destChainId, base);
  }, [destChainId, effectiveBridgeProvider, rangoTokensByChain, getTokensForRangoChain, bridgeMetaTokens]);

  const { balance: balanceTokenIn } = useTokenBalance({
    address,
    token: tokenIn,
    chainId: sourceChainId,
  });
  const { data: whitelist } = useWhitelist(address, sourceChainId);

  const isCrossChain = sourceChainId !== destChainId;

  // Active referrer for badge display — read from local storage (updated on render)
  const activeReferrer = useMemo(() => {
    if (!address) return null;
    const r = getStoredReferrer(address);
    return r && r !== '0x0000000000000000000000000000000000000000' ? r : null;
  }, [address]);

  const { amountOut: quoteAmountOut, loading: quoteLoading, error: quoteError, estimated: quoteEstimated, priceIn, priceOut } = useQuote({
    chainId: sourceChainId,
    tokenIn,
    tokenOut,
    amountIn,
    skip: isCrossChain,
  });

  const sameAssetCrossChainPair =
    normalizeSymbolForTokenCompare(tokenIn?.symbol) === normalizeSymbolForTokenCompare(tokenOut?.symbol);

  // Fetch live route support + amountOut quote for cross-asset pairs (BTC→BNB, ETH→BNB, etc.)
  const { isSupported: routeSupported, loading: routeLoading, amountOut: routeAmountOut } = useBridgeRouteSupport(
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
    isCrossChain && !sameAssetCrossChainPair && amountIn && parseFloat(amountIn) > 0 ? amountIn : undefined
  );

  const crossChainAmountOut = useMemo(() => {
    if (!isCrossChain || !amountIn || parseFloat(amountIn) <= 0 || !tokenIn?.symbol || !tokenOut?.symbol) return '';
    const inSym = (tokenIn.symbol || '').toUpperCase().replace(/^W/, '');
    const outSym = (tokenOut.symbol || '').toUpperCase().replace(/^W/, '');
    if (inSym === outSym) return amountIn;
    // For cross-asset pairs (BTC→BNB, ETH→BNB, etc.), use the live route quote amountOut
    if (routeAmountOut && parseFloat(routeAmountOut) > 0) return routeAmountOut;
    return '';
  }, [isCrossChain, amountIn, tokenIn?.symbol, tokenOut?.symbol, routeAmountOut]);

  const effectiveAmountOut = isCrossChain ? crossChainAmountOut : quoteAmountOut;
  const effectiveQuoteLoading = isCrossChain ? (routeLoading && !sameAssetCrossChainPair) : quoteLoading;
  const effectiveQuoteError = isCrossChain ? null : quoteError;
  const effectiveQuoteEstimated = isCrossChain ? true : quoteEstimated;
  /** LayerSwap: same token across chains, or doc-verified cross-asset (ETH→POL/BNB/AVAX, WBTC→BTC). */
  const layerSwapExecutionPairOk =
    sameAssetCrossChainPair ||
    isLayerSwapVerifiedCrossAssetCorridor(sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol);
  /** Symbiosis-only corridors (Solana↔EVM): not LayerSwap “same token” semantics — allow slide + hide amber box. */
  const symbiosisCorridorOk = isSymbiosisOnlyPair(sourceChainId, destChainId);

  const slippageBps = getSlippageToleranceInBasisPoints(sourceChainId, { getSlippage }, slippage);

  const { gasCostFormatted } = useGasEstimate({
    tokenIn,
    tokenOut,
    amountIn,
    chainId: sourceChainId,
    slippageBps,
    enabled: !isCrossChain,
  });

  const { priceInUsd: crossChainPriceIn, priceOutUsd: crossChainPriceOut, loading: crossChainPriceLoading } = useCrossChainUsdPrices({
    isCrossChain,
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
  });

  const { canSwap, error: validationError } = useSwapValidation({
    amount: amountIn,
    tokenIn,
    balance: balanceTokenIn,
    address,
    // BTC is paid from the user's Bitcoin wallet; wagmi balance on chain 0 is not reliable here.
    skipBalanceCheck: Number(sourceChainId) === 0 || Number(sourceChainId) === SOLANA_CHAIN_ID || tronSource,
  });

  // When using Rango, restrict visible chains to those Rango reports as enabled.
  useEffect(() => {
    const base = allChains.filter((c) => LAYERSWAP_CHAIN_IDS.includes(parseInt(c.chainId, 10)));

    // If we have unified bridge meta, prefer chains that appear there at all.
    if (bridgeMetaChains && bridgeMetaChains.length) {
      const allowedIds = new Set(
        bridgeMetaChains
          .map((c) => c.chainId)
          .filter((id) => typeof id === 'number')
      );
      // Some non-EVM chains (BTC, SOL, TRON, XRP, SUI) may be missing from meta;
      // always include them so the full 12-chain matrix is available.
      NON_EVM_DEST_CHAINS.forEach((id) => allowedIds.add(Number(id)));
      setChains(base.filter((c) => allowedIds.has(Number(c.chainId))));
      return;
    }

    if (effectiveBridgeProvider === 'rango' && rangoChains.length) {
      const enabledIds = new Set(
        rangoChains.filter((c) => c.enabled).map((c) => Number(c.chainId))
      );
      setChains(
        base.filter((c) => enabledIds.has(parseInt(c.chainId, 10)))
      );
      return;
    }

    setChains(base);
  }, [allChains, effectiveBridgeProvider, rangoChains, bridgeMetaChains]);

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

  // Auto-populate Solana sender when the AppKit Solana wallet connects or source changes.
  // When a wallet connects mid-session the address updates and overrides any previous value
  // only if the field is still empty (preserves manual overrides).
  useEffect(() => {
    if (!tronSource) setTronSenderAddress('');
  }, [tronSource]);

  useEffect(() => {
    if (!solanaSource) {
      setSolanaSenderAddress('');
      return;
    }
    if (solanaAddress) {
      setSolanaSenderAddress((prev) => (prev && prev.trim() ? prev : solanaAddress));
    }
  }, [solanaSource, solanaAddress]);
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
    // Clear any previous bridge error so the slide button re-enables after a correction
    if (bridgeError || errorMinAmount) resetBridge();
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
        // Current referral selection for cross-chain:
        // Prefer local stored referrer (URL-captured or manually set in Referral page).
        // Backend referral-chain API may be protected; when unavailable we still support account-based referral.
        const sourceReferrer = getStoredReferrer(address);

        const recipient = isNonEvmDest(destChainId)
          ? (destinationAddress || '').trim()
          : address;
        const senderAddress =
          sourceChainId === 0
            ? (bitcoinSenderAddress || '').trim()
            : Number(sourceChainId) === SOLANA_CHAIN_ID
              ? (solanaSenderAddress || '').trim()
              : tronSource
                ? (tronSenderAddress || '').trim()
                : address;
        let userToken;
        try {
          if (address) {
            const noncePayload = await getAuthSessionNonce(address);
            const message = buildAuthSessionMessage({
              userAddress: address,
              nonce: noncePayload?.nonce,
            });
            const signature = await signMessageAsync({ message });
            const tokenPayload = await createAuthSessionToken({
              userAddress: address,
              nonce: noncePayload?.nonce,
              signature,
            });
            userToken = tokenPayload?.token;
          }
        } catch (authErr) {
          // Non-blocking: if auth token creation fails (400/nonce/signature mismatch),
          // continue without x-user-token. Backend may still allow initiation.
          // This avoids blocking swaps due to auth-session edge cases.
          console.warn('[auth-session] proceeding without user token:', authErr?.message || authErr);
          userToken = undefined;
        }
        await startSwap({
          sourceChainId,
          destChainId,
          tokenIn,
          tokenOut,
          amountIn,
          recipient,
          userAddress: senderAddress,
          referrer: sourceReferrer && sourceReferrer !== '0x0000000000000000000000000000000000000000' ? sourceReferrer : undefined,
          userToken,
        });

        // When not using backend, run referral sync client-side (backend does it when using mangoServices)
        if (!isCrossChainViaBackendAvailable() && sourceReferrer && sourceReferrer !== '0x0000000000000000000000000000000000000000') {
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
    bitcoinSenderAddress,
    handleConnect,
    isCrossChain,
    routeSupported,
    startSwap,
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
    amountIn,
    signMessageAsync,
    solanaSenderAddress,
  ]);

  const destAddrRequired = isNonEvmDest(destChainId);
  const destAddrValid = !destAddrRequired || (destinationAddress || '').trim().length > 0;
  const bitcoinSourceRequired = sourceChainId === 0;
  const bitcoinSenderTrimmed = (bitcoinSenderAddress || '').trim();
  const bitcoinSenderValid = !bitcoinSourceRequired || (bitcoinSenderTrimmed.length > 0 && isValidBitcoinAddress(bitcoinSenderTrimmed));
  const bitcoinSenderInvalidFormat = bitcoinSourceRequired && bitcoinSenderTrimmed.length > 0 && !isValidBitcoinAddress(bitcoinSenderTrimmed);
  const solanaSenderTrimmed = (solanaSenderAddress || '').trim();
  const solanaSenderInvalidFormat =
    solanaSource && solanaSenderTrimmed.length > 0 && !SOLANA_ADDRESS_REGEX.test(solanaSenderTrimmed);
  const solanaSenderValid =
    !solanaSource || (solanaSenderTrimmed.length > 0 && SOLANA_ADDRESS_REGEX.test(solanaSenderTrimmed));
  const tronSenderTrimmed = (tronSenderAddress || '').trim();
  const tronSenderInvalidFormat =
    tronSource && tronSenderTrimmed.length > 0 && !TRON_ADDRESS_REGEX.test(tronSenderTrimmed);
  const tronSenderValid =
    !tronSource || (tronSenderTrimmed.length > 0 && TRON_ADDRESS_REGEX.test(tronSenderTrimmed));
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
      effectiveBridgeProvider === 'rango' &&
      isCrossChainViaBackendAvailable() &&
      !!amountIn &&
      parseFloat(amountIn) > 0 &&
      !!tokenIn &&
      !!tokenOut &&
      (!bitcoinSourceRequired || bitcoinSenderValid) &&
      (!solanaSource || solanaSenderValid) &&
      (!tronSource || tronSenderValid),
    sourceChainId,
    destChainId,
    tokenIn,
    tokenOut,
    amountIn,
    recipient: recipientForEstimate,
    userAddress: bitcoinSourceRequired
      ? bitcoinSenderTrimmed
      : solanaSource
        ? solanaSenderTrimmed || undefined
        : tronSource
          ? tronSenderTrimmed || undefined
          : undefined,
  });
  const rawBridgeError = bridgeError || validationError || effectiveQuoteError || crossChainEstimateError;
  const rawBridgeMsg = String(
    rawBridgeError?.message || rawBridgeError?.shortMessage || rawBridgeError || ''
  );
  const lowerBridgeMsg = rawBridgeMsg.toLowerCase();
  const isRangoRouteUnavailable =
    effectiveBridgeProvider === 'rango' && /route not available|no route/i.test(lowerBridgeMsg);
  const isRangoBelowMinimum =
    effectiveBridgeProvider === 'rango' && /amount below minimum|below minimum/i.test(lowerBridgeMsg);

  const tokenInIsNative =
    !!tokenIn?.native || (typeof tokenIn?.address === 'string' && tokenIn.address.toLowerCase() === ZERO_ADDRESS);
  const tokenOutIsNative =
    !!tokenOut?.native || (typeof tokenOut?.address === 'string' && tokenOut.address.toLowerCase() === ZERO_ADDRESS);

  // true / null = proceed (null matches "Route check unavailable; you can still slide"). false = explicit unsupported.
  const canConfirmCrossChain =
    isCrossChain &&
    !routeLoading &&
    routeSupported !== false &&
    // LayerSwap: same-asset or verified cross-asset; BTC source/dest uses Rango; Symbiosis Solana↔EVM corridors bypass LayerSwap-only pairing.
    (effectiveBridgeProvider !== 'layerswap' ||
      layerSwapExecutionPairOk ||
      bitcoinSource ||
      bitcoinDest ||
      symbiosisCorridorOk) &&
    canSwap &&
    destAddrValid &&
    // bitcoinSenderValid only required when sending FROM bitcoin (not TO bitcoin)
    (!bitcoinSource || bitcoinSenderValid) &&
    solanaSenderValid &&
    tronSenderValid &&
    !amountTooLow &&
    !amountTooHigh &&
    !bridgeLoading;
  const canConfirm = isCrossChain ? canConfirmCrossChain : false;
  const showUnsupportedWarning =
    isCrossChain && routeSupported === false && !routeLoading && amountIn && parseFloat(amountIn) > 0;
  const showRouteUnknownMessage = isCrossChain && routeSupported === null && !routeLoading && amountIn && parseFloat(amountIn) > 0;

  const isLayerSwapNativeRouteMissing =
    isCrossChain &&
    tokenInIsNative &&
    tokenOutIsNative &&
    (LAYERSWAP_NATIVE_ROUTE_MISSING_CHAIN_IDS.has(Number(sourceChainId)) ||
      LAYERSWAP_NATIVE_ROUTE_MISSING_CHAIN_IDS.has(Number(destChainId)));

  const showNotAvailableMissingLayerSwapNative =
    showUnsupportedWarning && isLayerSwapNativeRouteMissing;

  // Sanity cap for USD so we never show overflow/weird values (e.g. -$1.96T) that can trigger MetaMask "likely to fail"
  const SANE_USD_MAX = 1e9;
  const isStablecoin = (s) => s === 'USDC' || s === 'USDT';
  const usdIn = useMemo(() => {
    if (!amountIn || parseFloat(amountIn) <= 0) return 0;
    const amt = parseFloat(amountIn);
    let val = 0;
    if (isCrossChain) {
      const price = crossChainPriceIn > 0 && crossChainPriceIn < 1e6 ? crossChainPriceIn : (isStablecoin(tokenIn?.symbol) ? 1 : 0);
      val = price * amt;
    } else {
      val = priceIn > 0 ? parseFloat(amountIn) * priceIn : (isStablecoin(tokenIn?.symbol) ? amt : 0);
    }
    return Number.isFinite(val) && val >= 0 && val <= SANE_USD_MAX ? val : (isStablecoin(tokenIn?.symbol) ? amt : 0);
  }, [amountIn, isCrossChain, crossChainPriceIn, tokenIn?.symbol, priceIn]);
  const usdOut = useMemo(() => {
    if (!amountOut || parseFloat(amountOut) <= 0) return 0;
    const amt = parseFloat(amountOut);
    let val = 0;
    if (isCrossChain) {
      const price = crossChainPriceOut > 0 && crossChainPriceOut < 1e6 ? crossChainPriceOut : (isStablecoin(tokenOut?.symbol) ? 1 : 0);
      val = price * amt;
    } else {
      val = priceOut > 0 ? parseFloat(amountOut) * priceOut : (isStablecoin(tokenOut?.symbol) ? amt : 0);
    }
    return Number.isFinite(val) && val >= 0 && val <= SANE_USD_MAX ? val : (isStablecoin(tokenOut?.symbol) ? amt : 0);
  }, [amountOut, isCrossChain, crossChainPriceOut, tokenOut?.symbol, priceOut]);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
        <SwapHeader address={address} onConnect={handleConnect} whitelistTier={whitelist?.tier ?? null} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-[32px] font-medium">Cross-Chain Swap</h1>
            {bridgeStatus && activeProvider && (
              <p className="text-xs text-gray-400 mt-1">
                Powered by{' '}
                {activeProvider === 'layerswap'
                  ? 'LayerSwap'
                  : activeProvider === 'rango'
                  ? 'Rango'
                  : activeProvider === 'lifi'
                  ? 'LiFi'
                  : activeProvider === 'squid'
                  ? 'Squid'
                  : activeProvider === 'bungee'
                  ? 'Bungee'
                  : activeProvider === 'wormhole'
                  ? 'Wormhole'
                  : activeProvider === 'symbiosis'
                  ? 'Symbiosis'
                  : activeProvider === 'inbridge'
                  ? 'Inbridge'
                  : activeProvider}
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

          {minAmount && (
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
          {(amountTooLow || amountTooHigh) && (
            <p className="mt-1 text-xs text-amber-400 text-right">
              {amountTooLow
                ? `Amount too low — minimum is ${minAmount} ${tokenIn?.symbol ?? ''}.`.trim()
                : `Amount too high — maximum is ${maxAmount} ${tokenIn?.symbol ?? ''}.`.trim()}
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
            amount={(effectiveQuoteLoading || (routeLoading && bitcoinDest && amountIn && parseFloat(amountIn) > 0)) ? '...' : amountOut}
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
          gasCostFormatted={isCrossChain && !gasCostFormatted ? `~<0.0001 ${sourceChain?.nativeCurrency?.symbol || 'ETH'}` : gasCostFormatted}
          bridgeLabel={bridgeLabelDisplay}
        />

        <div className="mt-6">
          <SlippageSelector
            value={slippage}
            onChange={setSlippage}
            chainId={sourceChainId}
            getSlippage={getSlippage}
          />
        </div>

        {solanaSource && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-400 text-sm">Solana sender wallet</label>
              {isSolanaConnected ? (
                <button
                  type="button"
                  onClick={disconnectSolana}
                  className="text-xs text-gray-500 hover:text-[#3CF902] transition-colors"
                >
                  Change wallet
                </button>
              ) : null}
            </div>

            {isSolanaConnected ? (
              /* Connected — show address chip + optional manual override */
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3CF902]/40 rounded-lg px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-[#3CF902] shrink-0" />
                  <span className="text-[#3CF902] text-sm font-mono truncate">
                    {solanaAddress.slice(0, 8)}…{solanaAddress.slice(-6)}
                  </span>
                  <span className="text-gray-500 text-xs ml-auto">Connected</span>
                </div>
                {/* Allow manual override (e.g. hardware wallet on Ledger Live) */}
                {solanaSenderAddress && solanaSenderAddress !== solanaAddress && (
                  <p className="text-amber-400 text-xs">
                    Using a custom address — make sure it matches the signing wallet.
                  </p>
                )}
              </div>
            ) : (
              /* Not connected — connect button + optional manual fallback */
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={connectSolana}
                  className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-gray-600
                             hover:border-[#3CF902] rounded-lg px-4 py-3 text-white text-sm font-medium
                             transition-colors active:scale-95"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#9945FF" strokeWidth="2" />
                    <path d="M6 10h8M10 6v8" stroke="#9945FF" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Connect Solana Wallet
                </button>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-700" />
                  <span className="text-gray-600 text-xs">or enter manually</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <input
                  type="text"
                  value={solanaSenderAddress}
                  onChange={(e) => setSolanaSenderAddress(e.target.value)}
                  placeholder="Base58 address (32–44 chars)…"
                  className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-3 text-white text-sm
                              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3CF902]
                              focus:border-transparent ${solanaSenderInvalidFormat ? 'border-amber-500' : 'border-gray-600'}`}
                  spellCheck={false}
                />
                {solanaSenderInvalidFormat && (
                  <p className="text-amber-400 text-xs">Invalid Solana address (base58, 32–44 characters).</p>
                )}
              </div>
            )}
          </div>
        )}
        {tronSource && (
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-2">
              Tron sender address (T…)
            </label>
            <input
              type="text"
              value={tronSenderAddress}
              onChange={(e) => setTronSenderAddress(e.target.value)}
              placeholder="TXxx... (34 chars starting with T)"
              className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-3 text-white text-sm
                          placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3CF902]
                          focus:border-transparent ${tronSenderInvalidFormat ? 'border-amber-500' : 'border-gray-600'}`}
              spellCheck={false}
            />
            {tronSenderInvalidFormat && (
              <p className="text-amber-400 text-xs mt-1">
                Invalid Tron address. Must start with T and be 34 characters (base58).
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Your Tron wallet address — the one holding TRX or TRC-20 tokens to swap.
            </p>
          </div>
        )}
        {bitcoinSourceRequired && (
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-2">
              Bitcoin sender address
            </label>
            <input
              type="text"
              value={bitcoinSenderAddress}
              onChange={(e) => setBitcoinSenderAddress(e.target.value)}
              placeholder="bc1q... or 1... or 3..."
              className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:border-transparent ${bitcoinSenderInvalidFormat ? 'border-amber-500' : 'border-gray-600'}`}
              spellCheck={false}
            />
            {bitcoinSenderInvalidFormat && (
              <p className="text-amber-400 text-xs mt-1">
                Invalid format. Use bc1..., 1..., or 3... with no spaces or special characters.
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              ⚠ Must be your <strong className="text-gray-400">funded</strong> BTC address — the one that actually holds BTC.{' '}
              {bitcoinSenderTrimmed.length >= 26 && (
                <a
                  href={`https://mempool.space/address/${bitcoinSenderTrimmed}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3CF902] underline"
                >
                  Check on mempool.space ↗
                </a>
              )}
            </p>
          </div>
        )}
        {destAddrRequired && (
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-2">
              {destChainId === 0 && 'Bitcoin receive address — where BTC will be sent'}
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
            {destChainId === 0 && (destinationAddress || '').trim().length >= 26 && (
              <p className="text-gray-500 text-xs mt-1">
                <a
                  href={`https://mempool.space/address/${(destinationAddress || '').trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3CF902] underline"
                >
                  Verify address on mempool.space ↗
                </a>
              </p>
            )}
          </div>
        )}

        <div className="mt-16">
          {bridgeStatus && (
            <CrossChainSwapStatusBanner
              status={bridgeStatus}
              swapId={swapId}
              depositActions={depositActions}
              rangoTx={rangoTx}
              symbiosisSolana={symbiosisSolana}
              loopringWithdrawalInfo={loopringWithdrawalInfo}
              sourceChainId={sourceChainId}
              sourceChain={sourceChain}
              tokenIn={tokenIn}
              amountIn={amountIn}
              provider={activeProvider}
              onRefetchDeposit={refetchDeposit}
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
            showNotAvailableMissingLayerSwapNative ? (
              <p className="text-amber-400 text-sm text-center mb-2">Not Available</p>
            ) : (
              <p className="text-amber-400 text-sm text-center mb-2">
                This route is not supported by the bridge. Try a different token or chain.
              </p>
            )
          )}
          {isCrossChain &&
            effectiveBridgeProvider === 'layerswap' &&
            tokenIn?.symbol &&
            tokenOut?.symbol &&
            !layerSwapExecutionPairOk &&
            !symbiosisCorridorOk &&
            !bitcoinSource &&
            !bitcoinDest &&
            routeSupported !== true && (
              <div
                className="mb-3 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-amber-950/30 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                role="status"
              >
                <p className="text-center text-sm leading-snug text-amber-100/95">
                  <span className="font-semibold text-amber-300">MangoSwap</span> bridges the{' '}
                  <span className="font-semibold text-white">same</span> token across chains.
                  <span className="mt-1 block text-amber-200/90">
                    <span className="font-mono text-[13px]">
                      {tokenIn.symbol} → {tokenOut.symbol}
                    </span>{' '}
                    <span className="text-amber-200/70">is a cross-asset pair.</span>
                  </span>
                </p>
                <p className="mt-2 text-center text-xs leading-relaxed text-amber-200/80">
                  Match the token on both sides, or set bridge to <span className="font-semibold text-amber-200">Auto</span> for
                  cross-asset routes.
                </p>
              </div>
            )}
          {isCrossChain &&
            bridgeProvider === 'auto' &&
            tokenIn?.symbol &&
            tokenOut?.symbol &&
            !sameAssetCrossChainPair && (
              <p className="text-gray-500 text-xs text-center mb-2">
                Cross-asset route ({tokenIn.symbol} → {tokenOut.symbol}): the backend picks an available bridge. Final amount
                and fees depend on that provider; connect a wallet on the source chain where required.
              </p>
            )}
          {showRouteUnknownMessage && (
            <p className="text-gray-500 text-xs text-center mb-2">
              Route check unavailable — you can still slide to continue; swap completes via the bridge.
            </p>
          )}
          {solanaSource && !solanaSenderValid && amountIn && parseFloat(amountIn) > 0 && (
            <p className="text-amber-400 text-sm text-center mb-2">
              {solanaSenderInvalidFormat
                ? 'Fix the Solana sender address format (base58).'
                : 'Enter your Solana wallet address (sender) to continue — it must match the wallet that signs the swap.'}
            </p>
          )}
          {tronSource && !tronSenderValid && amountIn && parseFloat(amountIn) > 0 && (
            <p className="text-amber-400 text-sm text-center mb-2">
              {tronSenderInvalidFormat
                ? 'Fix the Tron sender address (must start with T, 34 characters).'
                : 'Enter your Tron address (T...) to continue.'}
            </p>
          )}
          {bitcoinSourceRequired && !bitcoinSenderValid && amountIn && parseFloat(amountIn) > 0 && (
            <p className="text-amber-400 text-sm text-center mb-2">
              {bitcoinSenderInvalidFormat
                ? 'Fix the Bitcoin sender address format (use bc1..., 1..., or 3... only).'
                : 'Enter your Bitcoin sender address (where you will send BTC from) to continue.'}
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
              {/* "Use minimum" shortcut when the bridge rejected the amount as too low */}
              {/below minimum|amount outside|provider limit/i.test(rawBridgeMsg) && (
                <div className="flex flex-col items-center gap-1 mb-2">
                  {errorMinAmount ? (
                    <button
                      type="button"
                      onClick={() => { setAmountIn(String(errorMinAmount)); resetBridge(); }}
                      className="text-[#3CF902] text-xs font-semibold hover:underline"
                    >
                      → Use minimum ({errorMinAmount} {tokenIn?.symbol})
                    </button>
                  ) : (
                    <p className="text-xs text-amber-400 text-center">
                      {errorSuggestion || 'Try increasing the amount — bridge minimums are typically $20–$50.'}
                    </p>
                  )}
                </div>
              )}
              {effectiveBridgeProvider === 'rango' && isRangoRouteUnavailable && (
                <p className="text-xs text-gray-400 text-center mb-2">
                  Rango has no route for this chain/token pair right now. Try a different token or chain.
                </p>
              )}
            </>
          )}
          {isCrossChain && address && activeReferrer && (
            <div className="mb-2 flex items-center gap-1.5 justify-center text-xs text-[#3CF902]/80">
              <span>✓ Referral active</span>
              <span className="font-mono text-gray-500">{activeReferrer.slice(0, 6)}…{activeReferrer.slice(-4)}</span>
            </div>
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
