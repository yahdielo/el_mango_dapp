import { useState, useEffect, useCallback } from 'react';
import { getWhitelistStatus } from '../services/whitelistApi';

/**
 * @param {string|null|undefined} address
 * @param {number|null|undefined} chainId
 * @returns {{ data: { tier, isWhitelisted, tierLevel }|null, loading: boolean, error: string|null, refetch: function }}
 */
export function useWhitelist(address, chainId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!address) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getWhitelistStatus(address, chainId ?? undefined);
      setData({
        tier: res.tier || 'None',
        isWhitelisted: res.isWhitelisted === true,
        tierLevel: res.tierLevel ?? 0,
      });
    } catch (err) {
      setError(err?.message || 'Failed to load whitelist status');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { data, loading, error, refetch: fetchStatus };
}
