import { useCallback } from 'react';
import { useChainId, useSwitchChain, useSendTransaction, useWriteContract } from 'wagmi';
import { parseEther, parseUnits, isAddress } from 'viem';
import { ERC20_ABI } from '../config/abis';

const EVM_CHAIN_IDS = [1, 8453, 42161, 10, 137, 43114, 56];
const NATIVE_SYMBOLS = ['ETH', 'AVAX', 'MATIC', 'BNB'];

/** Normalize CAIP address (eip155:8453:0x...) to raw 0x... for sendTransaction */
function toRawEthereumAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  const s = addr.trim();
  const caipMatch = s.match(/^eip155:\d+:((0x[a-fA-F0-9]{40}))$/);
  if (caipMatch) return caipMatch[1];
  return s;
}

function isValidDepositAction(action) {
  if (!action?.to_address || !action?.amount) return false;
  const raw = toRawEthereumAddress(action.to_address);
  return isAddress(raw) && parseFloat(String(action.amount)) > 0;
}

export default function CrossChainSwapStatusBanner({
  status,
  swapId,
  depositActions,
  rangoTx,
  sourceChainId,
  sourceChain,
  tokenIn,
  onDismiss,
}) {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const { sendTransaction, isPending: isSendPending } = useSendTransaction();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

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
    label = rangoTx ? 'Sign transaction to bridge' : 'Waiting for deposit';
  } else if (status === 'ls_transfer_pending') {
    label = 'Bridging...';
  }

  const depositAction = depositActions?.[0];
  const needsSwitch = sourceChainId != null && chainId !== sourceChainId;
  const isNativeDeposit = NATIVE_SYMBOLS.includes((depositAction?.token?.symbol || '').toUpperCase());
  const isEvmSource = sourceChainId != null && EVM_CHAIN_IDS.includes(Number(sourceChainId));

  const canSignRangoTx =
    status === 'user_transfer_pending' &&
    rangoTx &&
    (rangoTx.txTo || rangoTx.txData) &&
    (!rangoTx.txTo || isAddress(rangoTx.txTo)) &&
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

  // Note: Auto-trigger disabled to avoid "data is missing" viem errors; user clicks button to send.

  const handleSendDeposit = useCallback(async () => {
    try {
      if (needsSwitch && sourceChainId != null) {
        await switchChain?.({ chainId: Number(sourceChainId) });
        return;
      }
      if (canSignRangoTx && rangoTx?.txTo) {
        const value = rangoTx.value ? BigInt(rangoTx.value) : 0n;
        sendTransaction({
          to: rangoTx.txTo,
          data: rangoTx.txData ? (rangoTx.txData.startsWith('0x') ? rangoTx.txData : `0x${rangoTx.txData}`) : undefined,
          value,
          gas: rangoTx.gasLimit ? BigInt(rangoTx.gasLimit) : undefined,
        });
        return;
      }
      if (!isValidDepositAction(depositAction)) return;
      const rawToAddress = toRawEthereumAddress(depositAction.to_address);
      if (canSendNative) {
        const value = parseEther(String(depositAction.amount));
        sendTransaction({
          to: rawToAddress,
          value,
        });
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
      }
    } catch (err) {
      // Catch viem/RPC "data is missing" and similar errors; wagmi surfaces them via mutation
      console.warn('Deposit/send failed:', err?.message || err);
    }
  }, [depositAction, needsSwitch, sourceChainId, switchChain, sendTransaction, canSignRangoTx, rangoTx, canSendNative, canSendErc20, tokenIn, writeContractAsync]);

  return (
    <div className={`mb-4 p-4 rounded-xl border ${bgClass}`}>
      <p className={`text-sm font-medium ${textClass}`}>{label}</p>
      {swapId && (
        <p className="text-gray-400 text-xs mt-1 truncate">ID: {swapId}</p>
      )}
      {status === 'user_transfer_pending' && canSignRangoTx && (
        <p className="text-gray-300 text-xs mt-2">Sign the transaction to execute the cross-chain swap.</p>
      )}
      {status === 'user_transfer_pending' && depositAction && !canSignRangoTx && (
        <p className="text-gray-300 text-xs mt-2 break-all">
          Send {depositAction.amount} {depositAction.token?.symbol || ''} to: {toRawEthereumAddress(depositAction.to_address) || depositAction.to_address}
        </p>
      )}
      {canSendInApp && (
        <button
          type="button"
          onClick={handleSendDeposit}
          disabled={isSwitchPending || isSendPendingAny}
          className="mt-2 w-full py-2 px-3 rounded-lg bg-[#3CF902]/20 border border-[#3CF902]/50 text-[#3CF902] text-sm font-medium hover:bg-[#3CF902]/30 disabled:opacity-50"
        >
          {needsSwitch
            ? `Switch to ${sourceChain?.chainName || 'source chain'}`
            : canSignRangoTx
            ? 'Sign transaction'
            : `Send ${depositAction?.amount ?? ''} ${depositAction?.token?.symbol ?? ''}`}
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
