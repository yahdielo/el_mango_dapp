import { useCallback, useEffect, useRef, useState } from 'react';
import { useChainId, useSwitchChain, useSendTransaction, useWriteContract } from 'wagmi';
import { parseEther, parseUnits, isAddress } from 'viem';
import { ERC20_ABI } from '../config/abis';
import { notifySourceTxHash } from '../services/crossChainSwapApi';

const EVM_CHAIN_IDS = [1, 8453, 42161, 10, 137, 43114, 56];
const NATIVE_SYMBOLS = ['ETH', 'AVAX', 'MATIC', 'BNB'];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

export default function CrossChainSwapStatusBanner({
  status,
  swapId,
  depositActions,
  rangoTx,
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

  // Reset txConfirmed and approval when swap changes or status leaves user_transfer_pending
  useEffect(() => {
    if (!swapId || status !== 'user_transfer_pending') {
      setTxConfirmed(false);
      setApprovalTxDone(false);
    }
  }, [swapId, status]);

  if (!status) return null;

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
      if (rangoTx) {
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

  // If user needs to manually send a deposit, make the banner label explicit.
  if (status === 'user_transfer_pending' && depositAction && !canSignRangoTx) {
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
        const tx = await sendTransactionAsync({
          to: rawToAddress,
          value,
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
      if (canSendErc20 && tokenIn?.address) {
        const decimals = tokenIn.decimals ?? 18;
        const amountWei = parseUnits(String(depositAction.amount), decimals);
        await writeContractAsync({
          address: tokenIn.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [rawToAddress, amountWei],
          chainId: Number(sourceChainId),
        });
        setTxConfirmed(true);
      }
    } catch (err) {
      console.warn('Deposit/send failed:', err?.message || err);
    }
  }, [depositAction, needsSwitch, sourceChainId, switchChain, sendTransactionAsync, canSignRangoTx, rangoTx, approvalTxDone, canSendNative, canSendErc20, tokenIn, amountIn, writeContractAsync, swapId, onDismiss]);

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
            : `Powered by ${provider === 'layerswap' ? 'LayerSwap' : provider === 'rango' ? 'Rango' : provider === 'lifi' ? 'LiFi' : provider}`}
        </p>
      )}
      {status === 'user_transfer_pending' && !txConfirmed && canSignRangoTx && (
        <p className="text-gray-300 text-xs mt-2">
          {!approvalTxDone && ((rangoTx?.approveTo && rangoTx?.approveData) || (isERC20Token(tokenIn) && amountIn && parseFloat(amountIn) > 0))
            ? 'Step 1: Approve the token for the bridge. Then click the button again to send the swap.'
            : 'Sign the transaction to execute the cross-chain swap.'}
        </p>
      )}
      {status === 'user_transfer_pending' && !txConfirmed && depositAction && !canSignRangoTx && (
        <>
          <p className="text-gray-300 text-xs mt-2 break-all">
            Send {depositAction.amount} {depositAction.token?.symbol || ''} to: {toRawEthereumAddress(depositAction.to_address) || depositAction.to_address}
          </p>
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
