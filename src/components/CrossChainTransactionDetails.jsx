export default function CrossChainTransactionDetails({ amountIn, amountOut, sourceChain, destChain, estimated, gasCostFormatted }) {
  if (!amountIn || parseFloat(amountIn) <= 0) return null;

  const rate = amountIn && amountOut && parseFloat(amountIn) > 0 && parseFloat(amountOut) > 0
    ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)
    : '—';

  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#1a1a1a] border border-[#3CF902]/30">
      <h3 className="text-white text-sm font-medium mb-3">Transaction Details</h3>
      <div className="space-y-2 text-sm">
        {sourceChain && destChain && (
          <div className="flex justify-between text-gray-400">
            <span>Route</span>
            <span className="text-white">{sourceChain.chainName} → {destChain.chainName}</span>
          </div>
        )}
        {rate !== '—' && (
          <div className="flex justify-between text-gray-400">
            <span>Rate {estimated && <span className="text-[#3CF902]/80 text-xs">(Est.)</span>}</span>
            <span className="text-white">1 ≈ {rate}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-400">
          <span>Bridge</span>
          <span className="text-[#3CF902]">LayerSwap</span>
        </div>
        {gasCostFormatted && (
          <div className="flex justify-between text-gray-400">
            <span>Estimated gas (source)</span>
            <span className="text-white">{gasCostFormatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}
