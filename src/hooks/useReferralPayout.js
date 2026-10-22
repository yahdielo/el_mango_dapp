import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { checkReferralPayout } from '../utils/referralPayout';

/**
 * Whether a referrer will actually be paid on this chain's router.
 * @returns {{ status: 'idle' | 'checking' | 'active' | 'inactive', reason: string | null }}
 */
export function useReferralPayout({ chainId, routerAddress, referrer }) {
  const publicClient = usePublicClient({ chainId });
  const [state, setState] = useState({ status: 'idle', reason: null });

  useEffect(() => {
    if (!referrer || !routerAddress || !publicClient) {
      setState({ status: 'idle', reason: null });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'checking', reason: null });
    checkReferralPayout({ publicClient, chainId, routerAddress }).then((r) => {
      if (!cancelled) setState({ status: r.active ? 'active' : 'inactive', reason: r.reason });
    });
    return () => {
      cancelled = true;
    };
  }, [publicClient, chainId, routerAddress, referrer]);

  return state;
}
