export default function SwapTransactionDetails({
  amountIn,
  amountOut,
  tokenIn,
  tokenOut,
  slippage,
  gasCostFormatted,
  route,
  estimated,
  routerFeePct,
  l1ReferralPct,
  referrer,
  quoteAge,
}) {
  if (!amountIn || parseFloat(amountIn) <= 0) return null;

  const rate =
    amountIn && amountOut && parseFloat(amountIn) > 0 && parseFloat(amountOut) > 0
      ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)
      : '—';

  const minReceived = (() => {
    if (!amountOut || parseFloat(amountOut) <= 0) return null;
    const slip = slippage != null ? Number(slippage) : 0.5;
    const min = parseFloat(amountOut) * (1 - slip / 100);
    return `${min.toFixed(6).replace(/\.?0+$/, '')} ${tokenOut?.symbol ?? ''}`;
  })();

  const feeLabel = routerFeePct != null ? `${Number(routerFeePct).toFixed(1)}%` : '3.0%';
  const shortRef = referrer
    ? `${String(referrer).slice(0, 6)}…${String(referrer).slice(-4)}`
    : null;

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
        {minReceived && (
          <div className="flex justify-between">
            <span className="text-gray-400">Minimum received</span>
            <span className="text-[#3CF902] font-semibold">{minReceived}</span>
          </div>
        )}

        {/* ── Fee breakdown ──────────────────────────────────────────────────── */}
        <div className="pt-1 border-t border-white/10" />
        <div className="flex justify-between">
          <span className="text-gray-400">Protocol fee</span>
          <span className="text-white">{feeLabel} <span className="text-gray-500 text-xs">(included in rate)</span></span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 pl-2">↳ Token referral</span>
          <span className="text-gray-400">1% → referral chain</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 pl-2">↳ MANGO rewards</span>
          <span className="text-gray-400">1% → converted to MANGO</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 pl-2">↳ Treasury</span>
          <span className="text-gray-400">1% → dev treasury</span>
        </div>
        {shortRef ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 pl-2">↳ Your referrer (L1)</span>
            <span className="text-[#3CF902]">
              {shortRef} gets {l1ReferralPct != null ? `~${Number(l1ReferralPct).toFixed(2)}%` : '~0.40%'}
            </span>
          </div>
        ) : (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 pl-2">↳ No referrer</span>
            <span className="text-gray-500">full 1% to treasury</span>
          </div>
        )}
        <div className="pt-1 border-t border-white/10" />

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
        {quoteAge != null && quoteAge > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Quote updated</span>
            <span className={quoteAge >= 12 ? 'text-yellow-400' : 'text-gray-500'}>
              {quoteAge}s ago {quoteAge >= 12 ? '↻' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
