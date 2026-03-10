import { useEffect, useState } from 'react';
import { getRangoSupportMatrix } from '../services/crossChainSwapApi';

const BRIDGE_PROVIDER = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

/**
 * Load Rango support matrix (chains + tokens) from backend and expose helpers.
 * When bridge provider is not Rango, this returns empty data.
 */
export function useRangoSupportMatrix() {
  const [chains, setChains] = useState([]);
  const [tokensByChain, setTokensByChain] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (BRIDGE_PROVIDER !== 'rango') {
      setChains([]);
      setTokensByChain({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRangoSupportMatrix()
      .then((data) => {
        if (cancelled) return;
        setChains(Array.isArray(data?.chains) ? data.chains : []);
        setTokensByChain(data?.tokensByChain || {});
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load Rango support');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isChainEnabled = (chainId) => {
    return chains.some((c) => c.chainId === Number(chainId) && c.enabled);
  };

  const getTokensForRangoChain = (chainId) => {
    return tokensByChain[String(chainId)] || [];
  };

  return {
    chains,
    tokensByChain,
    loading,
    error,
    isChainEnabled,
    getTokensForRangoChain,
  };
}

