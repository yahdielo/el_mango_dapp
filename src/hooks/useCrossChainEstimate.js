import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { getCrossChainEstimate } from '../services/crossChainEstimateApi';

/**
 * Cross-chain estimate hook for backend bridge providers (e.g. Rango).
 * Computes min/max in human units and flags when the amount is out of range.
 */
export function useCrossChainEstimate({
  enabled,
  sourceChainId,
  destChainId,
  tokenIn,
  tokenOut,
  amountIn,
  recipient,
  /** Bitcoin source: Rango requires the BTC sender (bc1…) on GET /swap/estimate */
  userAddress,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minAmount, setMinAmount] = useState(null);
  const [maxAmount, setMaxAmount] = useState(null);
  const [amountTooLow, setAmountTooLow] = useState(false);
  const [amountTooHigh, setAmountTooHigh] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const decimals =
        tokenIn?.decimals != null && tokenIn.decimals !== ''
          ? Number(tokenIn.decimals)
          : Number(sourceChainId) === 0
            ? 8
            : 18;

      if (
        !enabled ||
        !sourceChainId ||
        !destChainId ||
        sourceChainId === destChainId ||
        !Number.isFinite(decimals) ||
        decimals < 0 ||
        !tokenOut ||
        !amountIn ||
        parseFloat(amountIn) <= 0
      ) {
        if (!cancelled) {
          setLoading(false);
          setError(null);
          setMinAmount(null);
          setMaxAmount(null);
          setAmountTooLow(false);
          setAmountTooHigh(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setAmountTooLow(false);
        setAmountTooHigh(false);

        let amountWei;
        try {
          amountWei = parseUnits(String(amountIn), decimals);
        } catch {
          throw new Error('Invalid amount');
        }

        const data = await getCrossChainEstimate({
          sourceChainId,
          destChainId,
          tokenIn,
          tokenOut,
          // Pass human-readable amount (e.g. "0.0002") so the backend's normalizeAmount
          // converts it correctly. Previously passed satoshis/wei which caused double-conversion.
          amountIn: String(amountIn),
          amountInWei: amountWei.toString(),
          recipient,
          userAddress,
        });

        const backendError = data?.error || null;
        const rawMin = data?.minAmount ?? data?.route?.minAmount ?? null;
        const rawMax = data?.maxAmount ?? data?.route?.maxAmount ?? null;

        let minHuman = null;
        let maxHuman = null;
        let tooLow = false;
        let tooHigh = false;

        if (rawMin) {
          try {
            const minWei = BigInt(rawMin);
            minHuman = formatUnits(minWei, decimals);
            if (amountWei < minWei) tooLow = true;
          } catch {
            // ignore parse issues
          }
        }

        if (rawMax) {
          try {
            const maxWei = BigInt(rawMax);
            maxHuman = formatUnits(maxWei, decimals);
            if (amountWei > maxWei) tooHigh = true;
          } catch {
            // ignore parse issues
          }
        }

        if (!cancelled) {
          setMinAmount(minHuman);
          setMaxAmount(maxHuman);
          setAmountTooLow(tooLow);
          setAmountTooHigh(tooHigh);
          setError(backendError);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to get cross-chain estimate');
          setMinAmount(null);
          setMaxAmount(null);
          setAmountTooLow(false);
          setAmountTooHigh(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, sourceChainId, destChainId, tokenIn?.decimals, tokenIn, tokenOut, amountIn, recipient, userAddress]);

  return {
    loading,
    error,
    minAmount,
    maxAmount,
    amountTooLow,
    amountTooHigh,
  };
}

