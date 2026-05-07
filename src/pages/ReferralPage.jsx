import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import SwapFooter from '../components/SwapFooter';
import { useReferralChain } from '../hooks/useReferralChain';
import { useReferralTree, useReferralPerformance, useReferralInsights, useTopReferrers } from '../hooks/useReferralAnalytics';
import { syncReferral } from '../services/referralApi';
import { LAYERSWAP_CHAIN_IDS } from '../services/bridgeApi';
import { getAllChains, ZERO_ADDRESS } from '../utils/chainConfig';
import { getStoredReferrer, setStoredReferrer, isValidReferrerAddress } from '../utils/referrerStorage';
import { useAccountReferrer } from '../hooks/useAccountReferrer';
import { getReferralClaimNonce, buildReferralClaimMessage, claimAccountReferrer, getCrossChainReferralStats } from '../services/referralAccountApi';
import { getWalletLinkNonce, buildWalletLinkMessage, linkWallet, getLinkedWallets } from '../services/walletLinkApi';

function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ReferralSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-white font-medium text-sm mb-2">{title}</h3>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-gray-300 text-sm">
        {children}
      </div>
    </div>
  );
}

function TreeNode({ node, depth = 0 }) {
  if (!node) return null;
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="ml-4 border-l border-white/20 pl-3 py-1">
      <span className="text-[#3CF902] font-mono text-xs">{formatAddress(node.address)}</span>
      {node.referralCount > 0 && (
        <span className="text-gray-500 text-xs ml-2">({node.referralCount} referrals)</span>
      )}
      {hasChildren && node.children.map((child, i) => (
        <TreeNode key={child.address || i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ReferralPage() {
  const { address } = useAccount();
  const { open } = useAppKit();
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState(null);
  const [copyDone, setCopyDone] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [manualStatus, setManualStatus] = useState(null);
  const { signMessageAsync } = useSignMessage();

  const { referrer: backendReferrer, refresh: refreshBackendReferrer } = useAccountReferrer(address);

  const { data: chainData, loading: chainLoading, error: chainError, refetch: refetchChain } = useReferralChain(address);
  const { data: treeData, loading: treeLoading, error: treeError } = useReferralTree(address);
  const { data: perfData, loading: perfLoading, error: perfError } = useReferralPerformance(address);
  const { data: insightsData, loading: insightsLoading } = useReferralInsights(address);
  const { data: topReferrers, loading: topLoading } = useTopReferrers(10);
  const [crossChainStats, setCrossChainStats] = useState(null);
  const [crossChainStatsLoading, setCrossChainStatsLoading] = useState(false);

  // ── Wallet linking (non-EVM addresses) ───────────────────────────────────
  const CHAIN_TYPES = [
    { type: 'solana',  label: 'Solana',  placeholder: 'Base58 address (e.g. 5HnF...)' },
    { type: 'tron',    label: 'Tron',    placeholder: 'Starts with T (e.g. TK9...)' },
    { type: 'bitcoin', label: 'Bitcoin', placeholder: '1..., 3..., or bc1...' },
    { type: 'xrp',     label: 'XRP',     placeholder: 'Starts with r (e.g. rN7...)' },
    { type: 'sui',     label: 'Sui',     placeholder: '0x + 64 hex chars' },
  ];
  const [linkedWallets, setLinkedWallets] = useState(null);
  const [linkInputs, setLinkInputs] = useState({});    // { solana: '...', tron: '...', ... }
  const [linkStatus, setLinkStatus] = useState({});    // { solana: 'linking' | 'linked' | 'error:...' }

  useEffect(() => {
    if (!address) { setLinkedWallets(null); return; }
    getLinkedWallets(address).then(setLinkedWallets).catch(() => null);
  }, [address]);

  const handleLinkWallet = useCallback(async (chainType) => {
    if (!address) return;
    const foreignAddress = (linkInputs[chainType] || '').trim();
    if (!foreignAddress) return;
    setLinkStatus(s => ({ ...s, [chainType]: 'linking' }));
    try {
      const { nonce } = await getWalletLinkNonce(address);
      const message = buildWalletLinkMessage({ chainType, foreignAddress, evmAddress: address.toLowerCase(), nonce });
      const signature = await signMessageAsync({ message });
      await linkWallet({ evmAddress: address.toLowerCase(), foreignAddress, chainType, signature, nonce });
      setLinkStatus(s => ({ ...s, [chainType]: 'linked' }));
      setLinkedWallets(prev => ({ ...(prev || {}), [chainType]: foreignAddress }));
      setLinkInputs(s => ({ ...s, [chainType]: '' }));
      setTimeout(() => setLinkStatus(s => ({ ...s, [chainType]: null })), 3000);
    } catch (err) {
      setLinkStatus(s => ({ ...s, [chainType]: `error: ${err?.message ?? 'failed'}` }));
      setTimeout(() => setLinkStatus(s => ({ ...s, [chainType]: null })), 5000);
    }
  }, [address, linkInputs, signMessageAsync]);
  // ── End wallet linking ───────────────────────────────────────────────────

  useEffect(() => {
    if (!address) { setCrossChainStats(null); return; }
    setCrossChainStatsLoading(true);
    getCrossChainReferralStats(address)
      .then((data) => setCrossChainStats(data))
      .catch(() => setCrossChainStats(null))
      .finally(() => setCrossChainStatsLoading(false));
  }, [address]);

  const raw = chainData?.data ?? chainData;
  const primaryReferrer = raw?.primaryReferrer ?? raw?.referral?.referrer ?? null;
  const referralsList = raw?.referrals ?? [];
  const storedReferrer = useMemo(() => (address ? getStoredReferrer(address) : null), [address]);

  /**
   * Prefer server / on-chain so the Referral tab matches Swap (same referrer on desktop + mobile).
   * Local storage alone is unreliable on a new device or fresh browser profile.
   */
  const effectiveMyReferrer = useMemo(() => {
    const nz = (a) =>
      typeof a === 'string' &&
      /^0x[a-fA-F0-9]{40}$/i.test(a) &&
      a.toLowerCase() !== ZERO_ADDRESS
        ? a.toLowerCase()
        : null;

    const fromBackend = nz(backendReferrer);
    const fromChain = nz(primaryReferrer);
    const fromStored = nz(storedReferrer);
    return fromBackend ?? fromChain ?? fromStored ?? null;
  }, [backendReferrer, primaryReferrer, storedReferrer]);

  const referrerSourceNote = useMemo(() => {
    if (!effectiveMyReferrer) return '';
    const e = effectiveMyReferrer;
    if (backendReferrer && backendReferrer.toLowerCase() === e) {
      return 'Synced from your MangoSwap account — visible on desktop, phone, and any browser where you connect this wallet.';
    }
    if (primaryReferrer && typeof primaryReferrer === 'string' && primaryReferrer.toLowerCase() === e) {
      return 'Registered on-chain — we show the same referrer anywhere you load this wallet.';
    }
    return 'Saved only in this browser. Open your referral link again or swap once with attribution so MangoSwap saves your referrer to your account (then it follows you everywhere).';
  }, [effectiveMyReferrer, backendReferrer, primaryReferrer]);

  /** Copy server/on-chain referrer into local storage so Swap + URL capture stay aligned on this device. */
  useEffect(() => {
    if (!address || !effectiveMyReferrer) return;
    if (getStoredReferrer(address) === ZERO_ADDRESS) {
      setStoredReferrer(address, effectiveMyReferrer);
    }
  }, [address, effectiveMyReferrer]);

  const referralLink = typeof window !== 'undefined' && address
    ? `${window.location.origin}/?ref=${address}`
    : '';

  useEffect(() => {
    if (!address) {
      setManualRef('');
      return;
    }
    const ref = effectiveMyReferrer ?? (storedReferrer !== ZERO_ADDRESS ? storedReferrer : '');
    setManualRef(ref || '');
  }, [address, effectiveMyReferrer, storedReferrer]);

  const handleCopyLink = useCallback(() => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }, [referralLink]);

  const handleSyncToChains = useCallback(async () => {
    if (!address || !primaryReferrer) return;
    setSyncStatus('Syncing...');
    const chains = (getAllChains() || []).filter((c) => LAYERSWAP_CHAIN_IDS.includes(parseInt(c.chainId, 10)));
    const sourceChainId = referralsList[0]?.chainId ?? 8453;
    let done = 0;
    let failed = 0;
    for (const chain of chains) {
      const destChainId = parseInt(chain.chainId, 10);
      if (destChainId === sourceChainId) continue;
      try {
        await syncReferral({
          userAddress: address,
          referrerAddress: primaryReferrer,
          sourceChainId,
          destChainId,
        });
        done++;
      } catch {
        failed++;
      }
    }
    setSyncStatus(done > 0 ? `Synced to ${done} chain(s)` + (failed ? `, ${failed} failed` : '') : 'Sync failed');
    refetchChain();
    setTimeout(() => setSyncStatus(null), 4000);
  }, [address, primaryReferrer, referralsList, refetchChain]);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
        <SwapHeader address={address} onConnect={open} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-[32px] font-medium">Referral</h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[#3CF902] text-sm font-medium hover:underline"
          >
            ← Swap
          </button>
        </div>

        {!address ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-sm">
            Connect your wallet to see your referral info and share your link.
          </div>
        ) : (
          <>
            <ReferralSection title="My referrer">
              {effectiveMyReferrer ? (
                <div>
                  <p className="text-white font-mono text-xs break-all">{effectiveMyReferrer}</p>
                  <p className="text-gray-500 text-[11px] mt-2 leading-snug">{referrerSourceNote}</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 text-xs mb-2">
                    Set once by visiting a referral link <span className="font-mono">?ref=0x...</span>, by swapping with attribution, or by entering an address below. Once set, it is permanent and will show here on mobile too.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      placeholder="0xReferrerAddress"
                      className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-white text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!address) return;
                        const v = (manualRef || '').trim();
                        if (!isValidReferrerAddress(v) || v.toLowerCase() === address.toLowerCase()) {
                          setManualStatus('Invalid referrer address');
                          setTimeout(() => setManualStatus(null), 2500);
                          return;
                        }
                        const set = setStoredReferrer(address, v);
                        if (set === '0x0000000000000000000000000000000000000000') {
                          setManualStatus('Could not save — referrer may already be locked.');
                          setTimeout(() => setManualStatus(null), 3000);
                          return;
                        }
                        setManualStatus('Saving (sign message)...');
                        try {
                          const { nonce } = await getReferralClaimNonce(address);
                          const msg = buildReferralClaimMessage({ userAddress: address, referrerAddress: v, nonce });
                          const signature = await signMessageAsync({ message: msg });
                          await claimAccountReferrer({
                            userAddress: address,
                            referrerAddress: v,
                            nonce,
                            signature,
                            source: 'manual',
                          });
                          setManualStatus('Saved and locked permanently.');
                          refreshBackendReferrer?.();
                        } catch (e) {
                          setManualStatus(e?.message ? `Saved locally. Backend sync failed: ${e.message}` : 'Saved locally. Backend sync failed.');
                        } finally {
                          setTimeout(() => setManualStatus(null), 3500);
                        }
                      }}
                      className="shrink-0 px-3 py-2 rounded-lg bg-[#3CF902] text-black font-medium text-sm hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                  {manualStatus && <p className="text-gray-400 text-xs mt-2">{manualStatus}</p>}
                </div>
              )}
            </ReferralSection>



            <ReferralSection title="My referral link">
              <p className="text-gray-400 text-xs mb-2">Share this link so others can use you as referrer when they swap.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-white text-xs font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 px-3 py-2 rounded-lg bg-[#3CF902] text-black font-medium text-sm hover:opacity-90"
                >
                  {copyDone ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </ReferralSection>

            {primaryReferrer && referralsList.length > 0 && (
              <ReferralSection title="Sync to other chains">
                <p className="text-gray-400 text-xs mb-2">Copy your referral to all supported chains.</p>
                <button
                  type="button"
                  onClick={handleSyncToChains}
                  disabled={!!syncStatus && syncStatus !== 'Syncing...'}
                  className="px-4 py-2 rounded-lg bg-[#3CF902] text-black font-medium text-sm disabled:opacity-50"
                >
                  {syncStatus || 'Sync referral to all chains'}
                </button>
              </ReferralSection>
            )}

            <ReferralSection title="Referral tree">
              {treeLoading && <p className="text-gray-500">Loading...</p>}
              {treeError && <p className="text-red-400">{treeError}</p>}
              {!treeLoading && !treeError && treeData ? (
                <div className="font-mono text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#3CF902]">{formatAddress(treeData.address)}</span>
                    {treeData.referralCount > 0 && <span className="text-gray-500">({treeData.referralCount} direct)</span>}
                  </div>
                  <TreeNode node={treeData} />
                </div>
              ) : !treeLoading && !treeError && (
                <p className="text-gray-500">No referral tree yet.</p>
              )}
            </ReferralSection>

            <ReferralSection title="Performance">
              {perfLoading && <p className="text-gray-500">Loading...</p>}
              {perfError && <p className="text-red-400">{perfError}</p>}
              {!perfLoading && !perfError && perfData && (
                <ul className="space-y-1 text-xs">
                  <li>Total referrals: <span className="text-[#3CF902]">{perfData.totalReferrals ?? 0}</span></li>
                  <li>Active: {perfData.activeReferrals ?? 0}</li>
                  <li>Total rewards: {perfData.totalRewards ?? '0'}</li>
                  <li>24h rewards: {perfData.rewards24h ?? '0'}</li>
                  <li>Conversion: {(perfData.conversionRate ?? 0) * 100}%</li>
                </ul>
              )}
              {!perfLoading && !perfError && !perfData && <p className="text-gray-500">No metrics yet.</p>}
            </ReferralSection>

            <ReferralSection title="Cross-chain earnings (3% fee)">
              {crossChainStatsLoading && <p className="text-gray-500 text-xs">Loading...</p>}
              {!crossChainStatsLoading && crossChainStats ? (
                <ul className="space-y-1 text-xs">
                  <li className="flex justify-between">
                    <span className="text-gray-400">Attributed swaps</span>
                    <span className="text-[#3CF902]">{crossChainStats.totalSwaps ?? 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Total fee volume (USD)</span>
                    <span className="text-[#3CF902]">${(crossChainStats.totalFeeUsd ?? 0).toFixed(4)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Last 24h</span>
                    <span>${(crossChainStats.fee24h ?? 0).toFixed(4)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Last 7d</span>
                    <span>${(crossChainStats.fee7d ?? 0).toFixed(4)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Pending rewards</span>
                    <span className="text-amber-400">${(crossChainStats.pendingFeeUsd ?? 0).toFixed(4)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Rewarded</span>
                    <span>${(crossChainStats.rewardedFeeUsd ?? 0).toFixed(4)}</span>
                  </li>
                </ul>
              ) : !crossChainStatsLoading && (
                <p className="text-gray-500 text-xs">No cross-chain referral activity yet. Share your link for others to swap cross-chain.</p>
              )}
            </ReferralSection>

            {insightsData.length > 0 && (
              <ReferralSection title="Insights">
                {insightsLoading ? <p className="text-gray-500">Loading...</p> : (
                  <ul className="space-y-2 text-xs">
                    {insightsData.slice(0, 5).map((insight, i) => (
                      <li key={i}>
                        <span className="text-[#3CF902]">{insight.title}</span>: {insight.description}
                      </li>
                    ))}
                  </ul>
                )}
              </ReferralSection>
            )}

            <ReferralSection title="Top referrers">
              {topLoading && <p className="text-gray-500">Loading...</p>}
              {!topLoading && topReferrers.length > 0 && (
                <ul className="space-y-2 text-xs">
                  {topReferrers.map((r, i) => (
                    <li key={r.address || i} className="flex justify-between">
                      <span className="font-mono">{formatAddress(r.address)}</span>
                      <span className="text-[#3CF902]">{r.totalReferrals ?? 0} referrals</span>
                    </li>
                  ))}
                </ul>
              )}
              {!topLoading && topReferrers.length === 0 && <p className="text-gray-500">No data yet.</p>}
            </ReferralSection>

            {/* ── Link non-EVM wallets ─────────────────────────────────── */}
            <ReferralSection title="Link non-EVM wallets">
              <p className="text-gray-400 text-xs mb-3">
                Link your Solana, Tron, Bitcoin, XRP, or Sui address so swaps originating
                from those wallets can track your referral earnings. Sign with your connected
                EVM wallet to prove ownership.
              </p>
              <div className="space-y-3">
                {CHAIN_TYPES.map(({ type, label, placeholder }) => {
                  const current = linkedWallets?.[type];
                  const input = linkInputs[type] || '';
                  const status = linkStatus[type];
                  const isLinking = status === 'linking';
                  const isLinked = status === 'linked';
                  const isError = status?.startsWith('error');
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300 font-medium">{label}</span>
                        {current && (
                          <span className="text-[10px] font-mono text-[#3CF902]">
                            {current.slice(0, 8)}…{current.slice(-4)} ✓
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={input}
                          onChange={e => setLinkInputs(s => ({ ...s, [type]: e.target.value }))}
                          placeholder={current ? `Update: ${placeholder}` : placeholder}
                          className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-white text-xs font-mono border border-gray-700 focus:outline-none focus:border-[#3CF902]"
                          disabled={isLinking}
                        />
                        <button
                          type="button"
                          disabled={!input.trim() || isLinking}
                          onClick={() => handleLinkWallet(type)}
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-[#3CF902] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5aff20] transition-colors whitespace-nowrap"
                        >
                          {isLinking ? '…' : 'Link'}
                        </button>
                      </div>
                      {isLinked && (
                        <p className="text-[#3CF902] text-[10px] mt-1">✓ Linked successfully</p>
                      )}
                      {isError && (
                        <p className="text-red-400 text-[10px] mt-1">{status.replace('error: ', '')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ReferralSection>
          </>
        )}

        <SwapFooter />
      </div>
    </div>
  );
}
