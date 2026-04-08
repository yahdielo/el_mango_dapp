import { useEffect, useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSearchParams } from 'react-router-dom';
import {
  isValidReferrerAddress,
  setStoredReferrer,
  getStoredReferrer,
  setPendingReferrer,
  getPendingReferrer,
  clearPendingReferrer,
} from '../utils/referrerStorage';
import {
  getAccountReferrer,
  getReferralClaimNonce,
  buildReferralClaimMessage,
  claimAccountReferrer,
  isAccountReferralBackendAvailable,
} from '../services/accountReferralApi';

const ZERO = '0x0000000000000000000000000000000000000000';

/**
 * Captures `?ref=0x...` on ANY route and persists it for the connected wallet.
 *
 * Flow:
 *  1. URL param → localStorage (works before wallet connect).
 *  2. On wallet connect + pending referrer:
 *     a. Save to per-wallet localStorage so all swaps can use it immediately.
 *     b. If backend is configured AND user has no DB referrer yet, show a
 *        small sign-to-register banner.  Signing calls POST /referral/claim
 *        so the referrer is persisted in account_referrals for all future
 *        cross-chain swaps (even without the URL param).
 *  3. The banner is dismissible — skipping it only loses the DB persistence;
 *     the localStorage referrer continues to work for EVM swaps.
 */
export default function ReferralUrlCapture() {
  const { address } = useAccount();
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref');
  const { signMessageAsync } = useSignMessage();

  // null = not shown | 'prompt' = awaiting user action | 'signing' | 'done' | 'error'
  const [bannerState, setBannerState] = useState(null);
  const [pendingRef, setPendingRefState] = useState(null);

  // ── Step 1: capture URL ref → localStorage (pending) ──────────────────────
  useEffect(() => {
    const v = (urlRef || '').trim();
    if (!isValidReferrerAddress(v)) return;
    setPendingReferrer(v);
  }, [urlRef]);

  // ── Step 2: on wallet connect — apply pending ref and maybe prompt ─────────
  useEffect(() => {
    if (!address) return;

    const pending = getPendingReferrer();
    if (!isValidReferrerAddress(pending)) return;
    if (pending.toLowerCase() === address.toLowerCase()) {
      clearPendingReferrer();
      return;
    }

    // If this wallet already has a locked referrer, discard the pending one silently.
    const alreadyLocked = getStoredReferrer(address);
    if (alreadyLocked !== ZERO) {
      clearPendingReferrer();
      return;
    }

    // Save to per-wallet localStorage immediately so swaps can use it.
    setStoredReferrer(address, pending);
    clearPendingReferrer();

    // If backend isn't configured, localStorage is all we can do.
    if (!isAccountReferralBackendAvailable()) return;

    // Check if this user already has a referrer in the DB.
    getAccountReferrer(address)
      .then((data) => {
        const existing = data?.referrer;
        if (existing && existing !== ZERO) return; // already registered — nothing to do
        // Offer to sign and persist.
        setPendingRefState(pending);
        setBannerState('prompt');
      })
      .catch(() => {
        // If the lookup fails, still save locally — just skip the banner.
      });
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 3: sign + claim ───────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (!address || !pendingRef) return;
    setBannerState('signing');
    try {
      const { nonce } = await getReferralClaimNonce(address);
      const message = buildReferralClaimMessage({
        userAddress: address,
        referrerAddress: pendingRef,
        nonce,
      });
      const signature = await signMessageAsync({ message });
      await claimAccountReferrer({
        userAddress: address,
        referrerAddress: pendingRef,
        nonce,
        signature,
        source: 'url',
      });
      setBannerState('done');
      setTimeout(() => setBannerState(null), 3000);
    } catch {
      setBannerState('error');
      setTimeout(() => setBannerState(null), 4000);
    }
  }, [address, pendingRef, signMessageAsync]);

  const handleDismiss = useCallback(() => {
    setBannerState(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!bannerState) return null;

  const shortRef = pendingRef
    ? `${pendingRef.slice(0, 6)}…${pendingRef.slice(-4)}`
    : '';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(60,249,2,0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {bannerState === 'prompt' && (
            <>
              <p style={{ margin: 0, color: '#e5e7eb', fontSize: '13px', lineHeight: '1.4' }}>
                You were referred by{' '}
                <span style={{ fontFamily: 'monospace', color: '#3CF902' }}>{shortRef}</span>.
              </p>
              <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '11px' }}>
                Sign to register so all your future swaps are attributed.
              </p>
            </>
          )}
          {bannerState === 'signing' && (
            <p style={{ margin: 0, color: '#e5e7eb', fontSize: '13px' }}>
              Sign in your wallet to register…
            </p>
          )}
          {bannerState === 'done' && (
            <p style={{ margin: 0, color: '#3CF902', fontSize: '13px' }}>
              ✓ Referrer registered successfully.
            </p>
          )}
          {bannerState === 'error' && (
            <p style={{ margin: 0, color: '#f87171', fontSize: '13px' }}>
              Registration failed — your referrer is saved locally and will apply to swaps.
            </p>
          )}
        </div>

        {bannerState === 'prompt' && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={handleRegister}
              style={{
                background: '#3CF902',
                color: '#111',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Sign
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                color: '#6b7280',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
