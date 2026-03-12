import { useEffect, useState } from 'react';
import { getBridgeMeta, isCrossChainViaBackendAvailable } from '../services/crossChainSwapApi';

export function useBridgeMeta() {
  const [chains, setChains] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isCrossChainViaBackendAvailable()) return;
      setLoading(true);
      setError(null);
      try {
        const meta = await getBridgeMeta();
        if (cancelled) return;
        setChains(Array.isArray(meta?.chains) ? meta.chains : []);
        setTokens(Array.isArray(meta?.tokens) ? meta.tokens : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load bridge metadata');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { chains, tokens, loading, error };
}

