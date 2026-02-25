export default function CrossChainSwapStatusBanner({ status, swapId, depositActions, onDismiss }) {
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
      {status === 'user_transfer_pending' && (
        <a
          href="https://www.layerswap.io/app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-[#3CF902] hover:underline"
        >
          Complete on LayerSwap →
        </a>
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
