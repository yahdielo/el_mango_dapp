import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'react-router-dom';
import {
  isValidReferrerAddress,
  setStoredReferrer,
  getStoredReferrer,
  setPendingReferrer,
  getPendingReferrer,
  clearPendingReferrer,
} from '../utils/referrerStorage';

const ZERO = '0x0000000000000000000000000000000000000000';

/**
 * Captures `?ref=0x...` on ANY route and persists it for the connected wallet.
 *
 * Flow:
 *  1. URL param → pending storage (works before wallet connect).
 *  2. On wallet connect: copy pending → per-wallet localStorage (set-once) so swaps can use it.
 *
 * No signature prompt on connect. Backend `account_referrals` is filled on first attributed
 * swap (API) or when the user explicitly claims on the Referral page.
 */
export default function ReferralUrlCapture() {
  const { address } = useAccount();
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref');

  useEffect(() => {
    const v = (urlRef || '').trim();
    if (!isValidReferrerAddress(v)) return;
    setPendingReferrer(v);
  }, [urlRef]);

  useEffect(() => {
    if (!address) return;

    const pending = getPendingReferrer();
    if (!isValidReferrerAddress(pending)) return;
    if (pending.toLowerCase() === address.toLowerCase()) {
      clearPendingReferrer();
      return;
    }

    if (getStoredReferrer(address) !== ZERO) {
      clearPendingReferrer();
      return;
    }

    setStoredReferrer(address, pending);
    clearPendingReferrer();
  }, [address]);

  return null;
}
