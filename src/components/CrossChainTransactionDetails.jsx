// MangoSwap charges 3% via the MangoFeeRelay contract on EVM source chains.
// For non-EVM sources (Solana, Bitcoin, Tron) fees are collected by the bridge provider.
const MANGO_FEE_BPS = 300; // 3%

export default function CrossChainTransactionDetails({
  amountIn,
  amountOut,
  sourceChain,
  destChain,
  estimated,
  gasCostFormatted,
  bridgeLabel = 'Auto',
  tokenInSymbol,
  isEvmSource = true,
}) {
  if (!amountIn || parseFloat(amountIn) <= 0) return null;

  const amountInNum = parseFloat(amountIn);
  const amountOutNum = amountOut ? parseFloat(amountOut) : 0;

  // Rate shown after MangoSwap fee — the actual bridge exchange rate
  const rate = amountInNum > 0 && amountOutNum > 0
    ? (amountOutNum / amountInNum).toFixed(4)
    : '—';

  // MangoSwap fee (3% on EVM source chains via relay, 0% for non-EVM)
  const mangoFeeAmt = isEvmSource ? ((amountInNum * MANGO_FEE_BPS) / 10000).toFixed(4) : null;
  const mangoFeeLabel = isEvmSource
    ? `${(MANGO_FEE_BPS / 100).toFixed(1)}% MangoSwap fee`
    : null;

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
        {mangoFeeAmt && (
          <div className="flex justify-between text-gray-400">
            <span>{mangoFeeLabel}</span>
            <span className="text-amber-400">
              -{mangoFeeAmt} {tokenInSymbol || ''}
            </span>
          </div>
        )}
        <div className="flex justify-between text-gray-400">
          <span>Bridge</span>
          <span className="text-[#3CF902]">{bridgeLabel}</span>
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
