import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import SwapFooter from '../components/SwapFooter';
import { useReferralChain } from '../hooks/useReferralChain';
import { useReferralTree, useReferralPerformance, useReferralInsights, useTopReferrers } from '../hooks/useReferralAnalytics';
import { syncReferral } from '../services/referralApi';
import { LAYERSWAP_CHAIN_IDS } from '../services/bridgeApi';
import { getAllChains } from '../utils/chainConfig';

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

  const { data: chainData, loading: chainLoading, error: chainError, refetch: refetchChain } = useReferralChain(address);
  const { data: treeData, loading: treeLoading, error: treeError } = useReferralTree(address);
  const { data: perfData, loading: perfLoading, error: perfError } = useReferralPerformance(address);
  const { data: insightsData, loading: insightsLoading } = useReferralInsights(address);
  const { data: topReferrers, loading: topLoading } = useTopReferrers(10);

  const raw = chainData?.data ?? chainData;
  const primaryReferrer = raw?.primaryReferrer ?? raw?.referral?.referrer ?? null;
  const referralsList = raw?.referrals ?? [];
  const referralLink = typeof window !== 'undefined' && address
    ? `${window.location.origin}/?ref=${address}`
    : '';

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
              {chainLoading && <p className="text-gray-500">Loading...</p>}
              {chainError && <p className="text-red-400">{chainError}</p>}
              {!chainLoading && !chainError && (
                primaryReferrer
                  ? <p>Your referrer: <span className="font-mono text-[#3CF902]">{formatAddress(primaryReferrer)}</span></p>
                  : <p>No referrer set. Use someone’s referral link to set one.</p>
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
          </>
        )}

        <SwapFooter />
      </div>
    </div>
  );
}
