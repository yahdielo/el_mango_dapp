import { useState, useEffect, useRef, useCallback } from 'react';
import { getQuote } from '../services/quoteApi';

const DEBOUNCE_MS = 300;
/** Auto-refresh interval — keeps the minAmountOut fresh so volatile assets
 *  like AVAX don't revert with "Slippage exceeded" after the user spends
 *  30–60 s reading the transaction details on mobile. */
const REFRESH_INTERVAL_MS = 15_000;

/**
 * @param {{ chainId: number, tokenIn: object, tokenOut: object, amountIn: string, skip?: boolean }}
 * @returns {{ amountOut: string, loading: boolean, error: string|null, estimated?: boolean, priceIn?: number, priceOut?: number, routerFeePct?: number, l1ReferralPct?: number, quoteAge: number }}
 */
export function useQuote({ chainId, tokenIn, tokenOut, amountIn, skip }) {
  const [amountOut, setAmountOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimated, setEstimated] = useState(false);
  const [priceIn, setPriceIn] = useState(0);
  const [priceOut, setPriceOut] = useState(0);
  const [routerFeePct, setRouterFeePct] = useState(3);
  const [l1ReferralPct, setL1ReferralPct] = useState(0.4);
  /** Seconds since last successful quote fetch (for stale-quote UI indicators). */
  const [quoteAge, setQuoteAge] = useState(0);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const ageIntervalRef = useRef(null);
  const lastQuoteTimeRef = useRef(null);

  const fetchQuote = useCallback(async (amt, id, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await getQuote({ chainId, tokenIn, tokenOut, amountIn: amt });
      if (id === requestIdRef.current && result != null && typeof result === 'object') {
        setAmountOut(result.amountOut ?? '');
        setEstimated(result.estimated ?? false);
        setPriceIn(result.priceIn ?? 0);
        setPriceOut(result.priceOut ?? 0);
        setRouterFeePct(result.routerFeePct ?? 3);
        setL1ReferralPct(result.l1ReferralPct ?? 0.4);
        lastQuoteTimeRef.current = Date.now();
        setQuoteAge(0);
      }
    } catch (err) {
      if (id === requestIdRef.current && !silent) {
        setError(err?.message || 'Quote failed');
        setAmountOut('');
      }
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, [chainId, tokenIn, tokenOut]);

  useEffect(() => {
    const amt = amountIn?.trim?.() ?? '';

    // Clear any running timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (ageIntervalRef.current) clearInterval(ageIntervalRef.current);
    lastQuoteTimeRef.current = null;
    setQuoteAge(0);

    if (skip || !amt || parseFloat(amt) <= 0 || !tokenIn?.symbol || !tokenOut?.symbol || !chainId) {
      setAmountOut('');
      setLoading(false);
      setError(null);
      setPriceIn(0);
      setPriceOut(0);
      setRouterFeePct(3);
      setL1ReferralPct(0.4);
      return;
    }

    const id = ++requestIdRef.current;

    // Initial debounced fetch
    timeoutRef.current = setTimeout(() => {
      fetchQuote(amt, id, false);
    }, DEBOUNCE_MS);

    // Periodic silent refresh so the quote stays fresh while the user is on the
    // confirmation screen. Prevents "Slippage exceeded" reverts on mobile.
    refreshIntervalRef.current = setInterval(() => {
      // Only refresh if the component is still showing the same pair/amount
      const currentId = ++requestIdRef.current;
      fetchQuote(amt, currentId, true);
    }, REFRESH_INTERVAL_MS);

    // Age counter — increments every second so the parent can show "Quote updated Xs ago"
    ageIntervalRef.current = setInterval(() => {
      if (lastQuoteTimeRef.current) {
        setQuoteAge(Math.floor((Date.now() - lastQuoteTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (ageIntervalRef.current) clearInterval(ageIntervalRef.current);
    };
  }, [chainId, tokenIn, tokenOut, amountIn, skip, fetchQuote]);

  return { amountOut, loading, error, estimated, priceIn, priceOut, routerFeePct, l1ReferralPct, quoteAge };
}
