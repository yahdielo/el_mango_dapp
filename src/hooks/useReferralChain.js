import { useState, useEffect, useCallback } from 'react';
import { getReferralChain } from '../services/referralApi';

export function useReferralChain(address) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChain = useCallback(async () => {
    if (!address) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getReferralChain(address, { allChains: true });
      setData(res);
    } catch (err) {
      setError(err?.message || 'Failed to load referral');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchChain();
  }, [fetchChain]);

  return { data, loading, error, refetch: fetchChain };
}
