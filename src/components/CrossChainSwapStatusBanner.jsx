import { useCallback, useEffect, useRef } from 'react';
import { useChainId, useSwitchChain, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';

export default function CrossChainSwapStatusBanner({
  status,
  swapId,
  depositActions,
  sourceChainId,
  sourceChain,
  onDismiss,
}) {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const { sendTransaction, isPending: isSendPending } = useSendTransaction();
  const hasTriggeredSwitch = useRef(false);
  const hasTriggeredSend = useRef(false);

  if (!status) return null;

  const isPending =
    status === 'user_transfer_pending' || status === 'ls_transfer_pending';
  const isSuccess = status === 'completed';
  const isFailed = ['failed', 'expired', 'refunded', 'refund_pending'].includes(status);

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
    label = 'Waiting for deposit';
  } else if (status === 'ls_transfer_pending') {
    label = 'Bridging...';
  }

  const depositAction = depositActions?.[0];
  const needsSwitch = sourceChainId != null && chainId !== sourceChainId;
  const nativeSymbols = ['ETH', 'AVAX', 'MATIC', 'BNB'];
  const isNativeDeposit = nativeSymbols.includes((depositAction?.token?.symbol || '').toUpperCase());
  const canSendNative =
    status === 'user_transfer_pending' &&
    depositAction?.to_address &&
    depositAction?.amount &&
    isNativeDeposit &&
    sourceChainId != null &&
    [1, 8453, 42161, 10, 137, 43114, 56].includes(Number(sourceChainId));

  // Auto-trigger deposit when swipe completes: switch chain if needed, then send
  useEffect(() => {
    if (!canSendNative || !depositAction?.to_address || !depositAction?.amount) return;
    if (needsSwitch) {
      if (!hasTriggeredSwitch.current && switchChain) {
        hasTriggeredSwitch.current = true;
        switchChain({ chainId: Number(sourceChainId) });
      }
      return;
    }
    if (!hasTriggeredSend.current) {
      hasTriggeredSend.current = true;
      const value = parseEther(String(depositAction.amount));
      sendTransaction({
        to: depositAction.to_address,
        value,
      });
    }
  }, [canSendNative, needsSwitch, depositAction, sourceChainId, chainId, switchChain, sendTransaction]);

  const handleSendDeposit = useCallback(() => {
    if (!depositAction?.to_address || !depositAction?.amount) return;
    if (needsSwitch && sourceChainId != null) {
      switchChain?.({ chainId: Number(sourceChainId) });
      return;
    }
    const value = parseEther(String(depositAction.amount));
    sendTransaction({
      to: depositAction.to_address,
      value,
    });
  }, [depositAction, needsSwitch, sourceChainId, switchChain, sendTransaction]);

  return (
    <div className={`mb-4 p-4 rounded-xl border ${bgClass}`}>
      <p className={`text-sm font-medium ${textClass}`}>{label}</p>
      {swapId && (
        <p className="text-gray-400 text-xs mt-1 truncate">ID: {swapId}</p>
      )}
      {status === 'user_transfer_pending' && depositAction && (
        <p className="text-gray-300 text-xs mt-2 break-all">
          Send {depositAction.amount} {depositAction.token?.symbol || ''} to: {depositAction.to_address}
        </p>
      )}
      {canSendNative && (
        <button
          type="button"
          onClick={handleSendDeposit}
          disabled={isSwitchPending || isSendPending}
          className="mt-2 w-full py-2 px-3 rounded-lg bg-[#3CF902]/20 border border-[#3CF902]/50 text-[#3CF902] text-sm font-medium hover:bg-[#3CF902]/30 disabled:opacity-50"
        >
          {needsSwitch
            ? `Switch to ${sourceChain?.chainName || 'source chain'}`
            : `Send ${depositAction.amount} ${depositAction.token?.symbol || ''}`}
        </button>
      )}
      {isSuccess || isFailed ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 block text-sm text-[#3CF902] hover:underline"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
