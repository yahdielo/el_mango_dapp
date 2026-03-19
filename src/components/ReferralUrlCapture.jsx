import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'react-router-dom';
import {
  isValidReferrerAddress,
  setStoredReferrer,
  setPendingReferrer,
  getPendingReferrer,
  clearPendingReferrer,
} from '../utils/referrerStorage';

/**
 * Captures `?ref=0x...` on ANY route and persists it for the connected wallet.
 * If the wallet isn't connected yet, it stores a pending referrer and applies it after connect.
 */
export default function ReferralUrlCapture() {
  const { address } = useAccount();
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref');

  // Store pending ref as soon as we see it (works even before wallet connect).
  useEffect(() => {
    const v = (urlRef || '').trim();
    if (!isValidReferrerAddress(v)) return;
    setPendingReferrer(v);
  }, [urlRef]);

  // When wallet connects, apply pending referrer to this wallet, then clear.
  useEffect(() => {
    if (!address) return;
    const pending = getPendingReferrer();
    if (!isValidReferrerAddress(pending)) return;
    if (pending.toLowerCase() === address.toLowerCase()) {
      clearPendingReferrer();
      return;
    }
    setStoredReferrer(address, pending);
    clearPendingReferrer();
  }, [address]);

  return null;
}

