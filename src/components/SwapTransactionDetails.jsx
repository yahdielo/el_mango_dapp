export default function SwapTransactionDetails({
  amountIn,
  amountOut,
  tokenIn,
  tokenOut,
  slippage,
  gasCostFormatted,
  route,
  estimated,
}) {
  if (!amountIn || parseFloat(amountIn) <= 0) return null;

  const rate =
    amountIn && amountOut && parseFloat(amountIn) > 0 && parseFloat(amountOut) > 0
      ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)
      : '—';

  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#1a1a1a] border border-[#3CF902]/30">
      <h3 className="text-white text-sm font-medium mb-3">Transaction Details</h3>
      <div className="space-y-2 text-sm">
        {route && (
          <div className="flex justify-between text-gray-400">
            <span>Route</span>
            <span className="text-white">{route}</span>
          </div>
        )}
        {rate !== '—' && (
          <div className="flex justify-between text-gray-400">
            <span>Rate {estimated && <span className="text-[#3CF902]/80 text-xs">(Est.)</span>}</span>
            <span className="text-white">
              1 {tokenIn?.symbol ?? ''} ≈ {rate} {tokenOut?.symbol ?? ''}
            </span>
          </div>
        )}
        <div className="flex justify-between text-gray-400">
          <span>Slippage tolerance</span>
          <span className="text-white">{slippage != null ? `${slippage}%` : '—'}</span>
        </div>
        {gasCostFormatted && (
          <div className="flex justify-between text-gray-400">
            <span>Estimated gas</span>
            <span className="text-white">{gasCostFormatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}
