import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useChainId, useSwitchChain, useSendTransaction, useWriteContract } from 'wagmi';
import { parseEther, parseUnits, isAddress } from 'viem';
import { ERC20_ABI } from '../config/abis';
import { notifySourceTxHash } from '../services/crossChainSwapApi';

const EVM_CHAIN_IDS = [1, 8453, 42161, 10, 137, 43114, 56];
const NATIVE_SYMBOLS = ['ETH', 'AVAX', 'MATIC', 'BNB', 'POL'];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// THORChain EVM router ABI — used for EVM→BTC deposits (BSC/ETH/AVAX source).
// Must call depositWithExpiry(vault, asset, amount, memo, expiry) with msg.value = amount.
const THORCHAIN_ROUTER_ABI = [
  {
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo', type: 'string' },
      { name: 'expiry', type: 'uint256' },
    ],
    name: 'depositWithExpiry',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

// MangoFeeRelay ABI — on-chain fee collection before bridging.
// relay(destination): send ETH with msg.value; relay keeps feeBps%, forwards rest to destination.
// relayToken(token, amount, destination): ERC-20 equivalent (requires prior approval).
const MANGO_FEE_RELAY_ABI = [
  {
    inputs: [{ name: 'destination', type: 'address' }],
    name: 'relay',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'destination', type: 'address' },
    ],
    name: 'relayToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

function isERC20Token(tok) {
  const addr = tok?.address;
  if (!addr || typeof addr !== 'string') return false;
  const raw = addr.trim().toLowerCase();
  return raw !== ZERO_ADDRESS.toLowerCase() && (isAddress(addr) || isEthereumAddressLike(addr));
}

/** Normalize CAIP address (eip155:8453:0x...) to raw 0x... for sendTransaction */
function toRawEthereumAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  const s = addr.trim();
  const caipMatch = s.match(/^eip155:\d+:((0x[a-fA-F0-9]{40}))$/);
  if (caipMatch) return caipMatch[1];
  return s;
}

/** Lenient EVM address check (0x + 40 hex) so Rango/bridge contract addresses always pass */
function isEthereumAddressLike(addr) {
  if (!addr || typeof addr !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

function isValidDepositAction(action) {
  if (!action?.to_address || !action?.amount) return false;
  const raw = toRawEthereumAddress(action.to_address);
  return (isAddress(raw) || isEthereumAddressLike(raw)) && parseFloat(String(action.amount)) > 0;
}

const SOLANA_CHAIN_ID = 501111;

// ── Expiry countdown hook ─────────────────────────────────────────────────────
function useThorchainCountdown(expiryUnix) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!expiryUnix) return null;
    return Math.max(0, expiryUnix - Math.floor(Date.now() / 1000));
  });

  useEffect(() => {
    if (!expiryUnix) return;
    const tick = () => {
      const left = Math.max(0, expiryUnix - Math.floor(Date.now() / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryUnix]);

  return secondsLeft;
}

// ── Expiry badge (inline, for EVM→BTC THORChain deposits) ────────────────────
function ThorchainExpiryBadge({ expiryUnix }) {
  const secondsLeft = useThorchainCountdown(expiryUnix);
  if (secondsLeft === null) return null;
  const expired = secondsLeft <= 0;
  const fmtCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <p className={`text-xs mt-1 font-mono ${expired ? 'text-red-400' : secondsLeft < 120 ? 'text-amber-400' : 'text-gray-400'}`}>
      {expired
        ? '⛔ Quote expired — go back and get a fresh quote before sending'
        : `⏱ Quote window: ${fmtCountdown(secondsLeft)} remaining`}
    </p>
  );
}

// ── BTC deposit card ──────────────────────────────────────────────────────────
function BtcDepositCard({ depositAction }) {
  const secondsLeft = useThorchainCountdown(depositAction?.expiry ?? null);
  const expired = secondsLeft !== null && secondsLeft <= 0;

  const btcUri = useMemo(() => {
    if (!depositAction?.to_address) return '';
    const addr = depositAction.to_address;
    const amt = depositAction.amount ? `?amount=${depositAction.amount}` : '';
    return `bitcoin:${addr}${amt}`;
  }, [depositAction]);

  const qrUrl = useMemo(() => {
    if (!btcUri) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(btcUri)}&bgcolor=0d1117&color=3CF902&margin=8`;
  }, [btcUri]);

  const fmtCountdown = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="mt-3 rounded-xl border border-[#3CF902]/30 bg-[#3CF902]/5 px-4 py-3">
      <p className="text-[#3CF902] text-xs font-semibold mb-2">Send Bitcoin to complete your swap</p>

      {/* Expiry countdown */}
      {secondsLeft !== null && (
        <div className={`mb-2 rounded-md px-2 py-1 text-center text-xs font-mono ${
          expired ? 'bg-red-900/40 text-red-300 border border-red-500/40' :
          secondsLeft < 120 ? 'bg-amber-900/40 text-amber-300 border border-amber-500/40' :
          'bg-black/20 text-gray-300 border border-gray-600/30'
        }`}>
          {expired
            ? '⛔ Quote expired — go back and refresh to get a new quote'
            : `⏱ Quote expires in ${fmtCountdown(secondsLeft)}`}
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* QR code */}
        {qrUrl && !expired && (
          <div className="flex-shrink-0">
            <img
              src={qrUrl}
              alt="BTC deposit address QR"
              className="w-[80px] h-[80px] rounded-lg border border-[#3CF902]/20"
              loading="lazy"
            />
            <p className="text-gray-500 text-[9px] text-center mt-0.5">Scan to send</p>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-gray-200 text-xs mb-1">
            Amount:{' '}
            <span className="font-mono font-bold text-white">{depositAction.amount} BTC</span>
            <span className="text-gray-400 ml-1">({Math.round(Number(depositAction.amount) * 1e8).toLocaleString()} sats)</span>
          </p>
          <p className="text-gray-400 text-xs mb-1 break-all">
            To: <span className="font-mono text-gray-200 select-all">{depositAction.to_address}</span>
          </p>
        </div>
      </div>

      {depositAction.memo && (
        <div className="mt-2 mb-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2">
          <p className="text-red-400 text-xs font-semibold mb-1">⚠️ REQUIRED: Include this memo (OP_RETURN) in your BTC transaction</p>
          <p className="text-gray-300 text-[11px] mb-2 break-all font-mono bg-black/30 rounded px-2 py-1 select-all">{depositAction.memo}</p>
          <p className="text-red-300 text-[11px] leading-snug mb-2">
            You <strong>must</strong> include this memo as <strong>OP_RETURN</strong> data.
            Without it, THORChain will <strong>refund your BTC</strong> (minus a ~$1 fee).
          </p>
          <div className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-1.5 mb-2">
            <p className="text-amber-300 text-[11px] font-semibold">⚡ MetaMask cannot set OP_RETURN data.</p>
            <p className="text-amber-200/80 text-[11px] mt-0.5">Use a BTC wallet with OP_RETURN/memo support:</p>
            <div className="flex gap-2 flex-wrap mt-1">
              {[
                ['Sparrow Wallet', 'https://sparrowwallet.com'],
                ['Electrum', 'https://electrum.org'],
                ['BlueWallet', 'https://bluewallet.io'],
              ].map(([name, href]) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                   className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px] hover:bg-amber-500/30">
                  {name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mt-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(depositAction.to_address)}
          className="px-3 py-1 rounded-lg bg-[#3CF902]/20 border border-[#3CF902]/40 text-[#3CF902] text-xs hover:bg-[#3CF902]/30"
        >
          Copy address
        </button>
        {depositAction.memo && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(depositAction.memo)}
            className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs hover:bg-red-500/30"
          >
            Copy memo
          </button>
        )}
        <a
          href={`https://mempool.space/address/${depositAction.to_address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 text-xs hover:bg-gray-600"
        >
          View on mempool.space ↗
        </a>
      </div>
      {!expired && (
        <p className="text-amber-400 text-xs mt-2">
          Send the <strong>exact amount</strong> shown. The swap window is{' '}
          {secondsLeft !== null ? `${fmtCountdown(secondsLeft)} remaining` : '~10 minutes'}.
        </p>
      )}
    </div>
  );
}

export default function CrossChainSwapStatusBanner({
  status,
  swapId,
  depositActions,
  rangoTx,
  symbiosisSolana,
  sourceChainId,
  sourceChain,
  tokenIn,
  amountIn,
  onDismiss,
  onRefetchDeposit,
  provider,
}) {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const [txConfirmed, setTxConfirmed] = useState(false);
  const [approvalTxDone, setApprovalTxDone] = useState(false);
  const [solanaBusy, setSolanaBusy] = useState(false);

  // Reset txConfirmed and approval when swap changes or status leaves user_transfer_pending
  useEffect(() => {
    if (!swapId || status !== 'user_transfer_pending') {
      setTxConfirmed(false);
      setApprovalTxDone(false);
    }
  }, [swapId, status]);

  const isPending =
    status === 'user_transfer_pending' ||
    status === 'ls_transfer_pending' ||
    status === 'processing';
  const isSuccess = status === 'completed';
  const isFailed = ['failed', 'expired', 'refunded', 'refund_pending'].includes(status);

  // When swap completes, auto-dismiss after a brief delay so user sees "Swap completed" then form resets for next swap
  const dismissOnCompleteRef = useRef(false);
  useEffect(() => {
    if (status === 'completed' && onDismiss && !dismissOnCompleteRef.current) {
      dismissOnCompleteRef.current = true;
      const t = setTimeout(() => {
        onDismiss();
      }, 2500);
      return () => clearTimeout(t);
    }
    if (status !== 'completed') dismissOnCompleteRef.current = false;
  }, [status, onDismiss]);

  let bgClass = 'bg-amber-500/20 border-amber-500/50';
  let textClass = 'text-amber-200';
  let label = 'Pending';

  if (isSuccess) {
    bgClass = 'bg-[#3CF902]/20 border-[#3CF902]/50';
    textClass = 'text-[#3CF902]';
    label = 'Swap completed';
  } else if (isFailed) {
    bgClass = 'bg-red-500/20 border-red-500/50';
    textClass = 'text-red-300';
    label = status === 'expired' ? 'Swap expired' : status === 'refunded' ? 'Refunded' : 'Swap failed';
  } else if (status === 'user_transfer_pending') {
    if (txConfirmed) {
      label = 'Transaction sent – bridging in progress';
    } else {
      const amt = amountIn != null && amountIn !== '' ? String(amountIn) : null;
      const sym = (tokenIn?.symbol || '').trim() || 'ETH';
      if (sourceChainId === SOLANA_CHAIN_ID && symbiosisSolana?.instructions) {
        label = amt ? `Sign ${amt} ${sym} on Solana` : 'Sign Solana transaction in your wallet';
      } else if (rangoTx) {
        label = amt ? `Send ${amt} ${sym}` : 'Sign transaction to bridge';
      } else {
        label = amt ? `Send ${amt} ${sym}` : 'Waiting for deposit';
      }
    }
  } else if (status === 'ls_transfer_pending' || status === 'processing') {
    label = 'Bridging...';
  }

  const depositAction = depositActions?.[0];
  const needsSwitch = sourceChainId != null && chainId !== sourceChainId;
  const nativeSymbolCandidate = (depositAction?.token?.symbol || tokenIn?.symbol || '').toUpperCase().replace(/^W/, '');
  const isNativeDeposit = NATIVE_SYMBOLS.includes(nativeSymbolCandidate);
  const isEvmSource = sourceChainId != null && EVM_CHAIN_IDS.includes(Number(sourceChainId));

  const canSignRangoTx =
    status === 'user_transfer_pending' &&
    rangoTx &&
    (rangoTx.txTo || rangoTx.txData) &&
    (rangoTx.txTo == null || rangoTx.txTo === '' || isAddress(rangoTx.txTo) || isEthereumAddressLike(rangoTx.txTo)) &&
    isEvmSource;

  const canSendNative =
    status === 'user_transfer_pending' &&
    !canSignRangoTx &&
    isValidDepositAction(depositAction) &&
    isNativeDeposit &&
    isEvmSource;

  const canSendErc20 =
    status === 'user_transfer_pending' &&
    !canSignRangoTx &&
    isValidDepositAction(depositAction) &&
    !isNativeDeposit &&
    isEvmSource &&
    tokenIn?.address &&
    isAddress(tokenIn.address) &&
    (tokenIn?.decimals != null || tokenIn?.decimals === 0);

  const canSendInApp = canSignRangoTx || canSendNative || canSendErc20;
  const isSendPendingAny = isSendPending || isWritePending;

  const handleSignSymbiosisSolana = useCallback(async () => {
    const b64 = symbiosisSolana?.instructions;
    if (!b64 || typeof window === 'undefined') return;
    setSolanaBusy(true);
    try {
      const w = window;
      const provider = w.solana;
      if (!provider?.signTransaction) {
        window.alert('Install Phantom or Solflare and connect your Solana wallet to sign this swap.');
        return;
      }
      const { VersionedTransaction, Transaction, Connection } = await import('@solana/web3.js');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      let vtx;
      try {
        vtx = VersionedTransaction.deserialize(bytes);
      } catch {
        vtx = Transaction.from(bytes);
      }
      if (provider.connect && !provider.isConnected) {
        await provider.connect();
      }
      const signed = await provider.signTransaction(vtx);
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const raw = signed.serialize();
      const sig = await connection.sendRawTransaction(raw, {
        skipPreflight: false,
        maxRetries: 3,
      });
      if (sig && swapId) {
        try {
          await notifySourceTxHash(swapId, sig);
        } catch (notifyError) {
          console.warn('Failed to notify backend of Solana signature:', notifyError);
        }
      }
      setTxConfirmed(true);
    } catch (err) {
      console.warn('Solana sign/send failed:', err?.message || err);
    } finally {
      setSolanaBusy(false);
    }
  }, [symbiosisSolana, swapId]);

  // If user needs to manually send a deposit, make the banner label explicit.
  if (
    status === 'user_transfer_pending' &&
    depositAction &&
    !canSignRangoTx &&
    !(sourceChainId === SOLANA_CHAIN_ID && symbiosisSolana?.instructions)
  ) {
    const sym = depositAction.token?.symbol || '';
    label = `Send ${depositAction.amount} ${sym}`.trim();
  }

  // Note: Auto-trigger disabled to avoid "data is missing" viem errors; user clicks button to send.

  const handleSendDeposit = useCallback(async () => {
    try {
      if (needsSwitch && sourceChainId != null) {
        await switchChain?.({ chainId: Number(sourceChainId) });
        return;
      }
      if (canSignRangoTx && rangoTx?.txTo) {
        // If Rango requires an approval tx first (e.g. USDT), sign it before the main swap tx
        const hasRangoApproval = rangoTx.approveTo && rangoTx.approveData;
        const needsApproval = !approvalTxDone && (
          hasRangoApproval ||
          (isERC20Token(tokenIn) && (tokenIn.decimals != null || tokenIn.decimals === 0) && amountIn && parseFloat(amountIn) > 0)
        );
        if (needsApproval && hasRangoApproval) {
          const approveDataHex = rangoTx.approveData.startsWith('0x') ? rangoTx.approveData : `0x${rangoTx.approveData}`;
          await sendTransactionAsync({
            to: rangoTx.approveTo,
            data: approveDataHex,
            value: 0n,
            gas: rangoTx.gasLimit ? BigInt(rangoTx.gasLimit) : undefined,
          });
          setApprovalTxDone(true);
          return; // User clicks again to send the main tx
        }
        if (needsApproval && isERC20Token(tokenIn) && amountIn) {
          // Fallback: Rango didn't return approval data; approve the bridge contract (txTo) to spend the swap amount
          const decimals = tokenIn.decimals ?? 18;
          const amountWei = parseUnits(String(amountIn), decimals);
          const tokenAddress = toRawEthereumAddress(tokenIn.address) || tokenIn.address;
          await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [rangoTx.txTo, amountWei],
            chainId: Number(sourceChainId),
          });
          setApprovalTxDone(true);
          return; // User clicks again to send the main tx
        }
        const value = rangoTx.value ? BigInt(rangoTx.value) : 0n;
        const tx = await sendTransactionAsync({
          to: rangoTx.txTo,
          data: rangoTx.txData ? (rangoTx.txData.startsWith('0x') ? rangoTx.txData : `0x${rangoTx.txData}`) : undefined,
          value,
          gas: rangoTx.gasLimit ? BigInt(rangoTx.gasLimit) : undefined,
        });
        if (tx?.hash && swapId) {
          try {
            await notifySourceTxHash(swapId, tx.hash);
          } catch (notifyError) {
            console.warn('Failed to notify backend of source tx hash:', notifyError);
          }
        }
        setTxConfirmed(true);
        return;
      }
      if (!canSendInApp || (!canSignRangoTx && !isValidDepositAction(depositAction))) {
        if (!canSendInApp) {
          console.warn('[CrossChain] Send not ready: missing deposit details or transaction. Try again in a moment.');
        } else {
          console.warn('[CrossChain] Invalid depositAction, cannot send', depositAction);
        }
        return;
      }
      const rawToAddress = toRawEthereumAddress(depositAction.to_address);
      if (canSendNative) {
        const value = parseEther(String(depositAction.amount));
        let txHash;

        if (depositAction.relay_address && isAddress(depositAction.relay_address)) {
          // ── MangoFeeRelay path: collect 3% on-chain, forward 97% to bridge ───
          // relay(destination) is payable; relay contract keeps feeBps% and sends
          // the rest to rawToAddress (the bridge deposit address).
          const tx = await writeContractAsync({
            address: depositAction.relay_address,
            abi: MANGO_FEE_RELAY_ABI,
            functionName: 'relay',
            args: [rawToAddress],
            value,
            chainId: Number(sourceChainId),
          });
          txHash = tx;
        } else if (depositAction.router && depositAction.memo) {
          // THORChain EVM deposit: must call depositWithExpiry on the router contract.
          // Plain ETH/BNB transfers to the vault without memo are silently refunded by THORChain.
          const routerAddr = toRawEthereumAddress(depositAction.router) || depositAction.router;
          const expiry = depositAction.expiry
            ? BigInt(depositAction.expiry)
            : BigInt(Math.floor(Date.now() / 1000) + 1800); // 30-min window
          const tx = await writeContractAsync({
            address: routerAddr,
            abi: THORCHAIN_ROUTER_ABI,
            functionName: 'depositWithExpiry',
            args: [rawToAddress, ZERO_ADDRESS, value, depositAction.memo, expiry],
            value,
            chainId: Number(sourceChainId),
          });
          txHash = tx;
        } else {
          const tx = await sendTransactionAsync({
            to: rawToAddress,
            value,
          });
          txHash = tx?.hash;
        }

        if (txHash && swapId) {
          try {
            await notifySourceTxHash(swapId, txHash);
          } catch (notifyError) {
            console.warn('Failed to notify backend of source tx hash:', notifyError);
          }
        }
        setTxConfirmed(true);
        return;
      }
      if (canSendErc20 && tokenIn?.address) {
        const decimals = tokenIn.decimals ?? 18;
        const amountWei = parseUnits(String(depositAction.amount), decimals);

        if (depositAction.relay_address && isAddress(depositAction.relay_address)) {
          // ── MangoFeeRelay ERC-20 path ─────────────────────────────────────
          // Step 1: approve the relay contract to pull tokens.
          // Step 2: call relayToken(token, amount, bridgeDepositAddress).
          // approvalTxDone guards the two-step flow so the user clicks twice.
          if (!approvalTxDone) {
            await writeContractAsync({
              address: tokenIn.address,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [depositAction.relay_address, amountWei],
              chainId: Number(sourceChainId),
            });
            setApprovalTxDone(true);
            return; // user clicks again to send relayToken
          }
          await writeContractAsync({
            address: depositAction.relay_address,
            abi: MANGO_FEE_RELAY_ABI,
            functionName: 'relayToken',
            args: [tokenIn.address, amountWei, rawToAddress],
            chainId: Number(sourceChainId),
          });
        } else {
          await writeContractAsync({
            address: tokenIn.address,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [rawToAddress, amountWei],
            chainId: Number(sourceChainId),
          });
        }
        setTxConfirmed(true);
      }
    } catch (err) {
      console.warn('Deposit/send failed:', err?.message || err);
    }
  }, [depositAction, needsSwitch, sourceChainId, switchChain, sendTransactionAsync, canSignRangoTx, rangoTx, approvalTxDone, canSendNative, canSendErc20, tokenIn, amountIn, writeContractAsync, swapId, onDismiss, isAddress]);

  if (!status) return null;

  return (
    <div className={`mb-4 p-4 rounded-xl border ${bgClass}`}>
      <p className={`text-sm font-medium ${textClass}`}>{label}</p>
      {swapId && (
        <p className="text-gray-400 text-xs mt-1 truncate">ID: {swapId}</p>
      )}
      {provider && (
        <p className="text-gray-400 text-xs mt-1">
          {status === 'user_transfer_pending' && txConfirmed
            ? 'It may take a couple of minutes to see your deposit.'
            : `Powered by ${provider === 'layerswap' ? 'LayerSwap' : provider === 'rango' ? 'Rango' : provider === 'lifi' ? 'LiFi' : provider === 'squid' ? 'Squid' : provider === 'bungee' ? 'Bungee' : provider === 'wormhole' ? 'Wormhole' : provider === 'symbiosis' ? 'Symbiosis' : provider === 'inbridge' ? 'Inbridge' : provider}`}
        </p>
      )}
      {status === 'user_transfer_pending' && !txConfirmed && canSignRangoTx && (
        <p className="text-gray-300 text-xs mt-2">
          {!approvalTxDone && ((rangoTx?.approveTo && rangoTx?.approveData) || (isERC20Token(tokenIn) && amountIn && parseFloat(amountIn) > 0))
            ? 'Step 1: Approve the token for the bridge. Then click the button again to send the swap.'
            : 'Sign the transaction to execute the cross-chain swap.'}
        </p>
      )}
      {status === 'user_transfer_pending' &&
        !txConfirmed &&
        depositAction &&
        !canSignRangoTx &&
        sourceChainId === 0 && (
        <BtcDepositCard depositAction={depositAction} />
      )}
      {status === 'user_transfer_pending' &&
        !txConfirmed &&
        depositAction &&
        !canSignRangoTx &&
        sourceChainId !== 0 &&
        !(sourceChainId === SOLANA_CHAIN_ID && symbiosisSolana?.instructions) && (
        <>
          <p className="text-gray-300 text-xs mt-2 break-all">
            Send {depositAction.amount} {depositAction.token?.symbol || ''} to: {toRawEthereumAddress(depositAction.to_address) || depositAction.to_address}
          </p>
          {depositAction.expiry && (
            <ThorchainExpiryBadge expiryUnix={depositAction.expiry} />
          )}
          <p className="text-gray-400 text-xs mt-1">
            Status updates every few seconds. If your transaction failed in your wallet, try sending again with the button below.
          </p>
        </>
      )}
      {status === 'user_transfer_pending' && isEvmSource && (
        <div className="mt-2 space-y-2">
          {!txConfirmed ? (
            <>
              <button
                type="button"
                onClick={handleSendDeposit}
                disabled={isSwitchPending || isSendPendingAny || !canSendInApp}
                className="w-full py-2 px-3 rounded-lg bg-[#3CF902]/20 border border-[#3CF902]/50 text-[#3CF902] text-sm font-medium hover:bg-[#3CF902]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {needsSwitch
                  ? `Switch to ${sourceChain?.chainName || 'source chain'}`
                  : !canSendInApp
                  ? 'Preparing transaction...'
                  : canSignRangoTx
                  ? (!approvalTxDone && ((rangoTx?.approveTo && rangoTx?.approveData) || (isERC20Token(tokenIn) && amountIn && parseFloat(amountIn) > 0))
                    ? `Approve ${(tokenIn?.symbol || 'token').trim()}`
                    : (amountIn != null && amountIn !== '' ? `Send ${amountIn} ${(tokenIn?.symbol || 'ETH').trim()}` : 'Send ETH'))
                  : `Send ${depositAction?.amount ?? ''} ${depositAction?.token?.symbol ?? ''}`.trim() || 'Send'}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="block w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Transaction sent? Start new swap
              </button>
              {!canSendInApp && swapId && onRefetchDeposit && (
                <button
                  type="button"
                  onClick={onRefetchDeposit}
                  className="block w-full text-sm text-[#3CF902]/80 hover:text-[#3CF902] transition-colors mt-1"
                >
                  Load transaction
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="block w-full text-sm text-[#3CF902] hover:underline"
            >
              Start new swap
            </button>
          )}
        </div>
      )}
      {status === 'user_transfer_pending' && sourceChainId === SOLANA_CHAIN_ID && symbiosisSolana?.instructions && (
        <div className="mt-2 space-y-2">
          {!txConfirmed ? (
            <>
              <p className="text-gray-300 text-xs">
                Use Phantom or Solflare on Solana. The connected wallet must match the Solana sender address you entered when starting the swap.
              </p>
              <button
                type="button"
                onClick={handleSignSymbiosisSolana}
                disabled={solanaBusy}
                className="w-full py-2 px-3 rounded-lg bg-[#3CF902]/20 border border-[#3CF902]/50 text-[#3CF902] text-sm font-medium hover:bg-[#3CF902]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {solanaBusy ? 'Signing…' : 'Sign & send (Solana)'}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="block w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Transaction sent? Start new swap
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="block w-full text-sm text-[#3CF902] hover:underline"
            >
              Start new swap
            </button>
          )}
        </div>
      )}
      {isSuccess || isFailed ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 block text-sm text-[#3CF902] hover:underline"
        >
          {isSuccess ? 'Swap again' : 'Dismiss'}
        </button>
      ) : null}
    </div>
  );
}
