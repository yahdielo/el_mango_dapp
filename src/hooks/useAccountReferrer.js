import { useEffect, useState, useCallback } from 'react';
import { getAccountReferrer, isReferralAccountApiAvailable } from '../services/referralAccountApi';

const ZERO = '0x0000000000000000000000000000000000000000';

/**
 * Fetch backend-stored account referrer mapping.
 * Returns ZERO if none or if API not available.
 */
export function useAccountReferrer(userAddress) {
  const [referrer, setReferrer] = useState(ZERO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isReferralAccountApiAvailable() || !userAddress) {
      setReferrer(ZERO);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAccountReferrer(userAddress);
      const r = data?.referrer;
      setReferrer(typeof r === 'string' && r.startsWith('0x') ? r : ZERO);
    } catch (e) {
      setError(e?.message || 'Failed to load referrer');
      setReferrer(ZERO);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { referrer, loading, error, refresh };
}

