import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import SwapFooter from '../components/SwapFooter';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import {
  getAdminReferralStats,
  getAdminReferralDepth,
  getAdminSyncHealth,
} from '../services/adminApi';

// ─── constants ───────────────────────────────────────────────────────────────

const CHAIN_NAMES = {
  1: 'Ethereum',
  8453: 'Base',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  43114: 'Avalanche',
  56: 'BSC',
};

const FEE_BUCKETS = [
  { key: 'token_referral', label: 'Referral Payouts', color: '#3CF902' },
  { key: 'treasury',       label: 'Treasury',         color: '#60a5fa' },
  { key: 'mango_purchase', label: 'MANGO Buy Queue',  color: '#f59e0b' },
  { key: 'team_fee',       label: 'Team Fee',         color: '#a78bfa' },
];

const AUTO_REFRESH_MS = 30_000;

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtUsd(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${Number(n).toFixed(2)}`;
}

function fmtAge(ms) {
  if (ms < 0) return 'never';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function chainName(id) {
  return CHAIN_NAMES[id] ?? `Chain ${id}`;
}

function addrShort(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      {title && <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-[#3CF902]/30 border-t-[#3CF902] rounded-full animate-spin" />
    </div>
  );
}

function ErrorMsg({ msg }) {
  return <p className="text-red-400 text-sm py-2">{msg}</p>;
}

// ── Fee bucket card ──────────────────────────────────────────────────────────
function BucketCard({ bucket, totals }) {
  const data = totals?.[bucket.key];
  const pending = data?.pending_usd ?? 0;
  const rewarded = data?.rewarded_usd ?? 0;
  const failed = data?.failed_usd ?? 0;
  const total = pending + rewarded + failed;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bucket.color }} />
        <span className="text-white text-sm font-medium">{bucket.label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Pending</span>
          <span className="text-white font-mono">{fmtUsd(pending)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Rewarded</span>
          <span className="text-white font-mono">{fmtUsd(rewarded)}</span>
        </div>
        {failed > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-red-400/80">Failed</span>
            <span className="text-red-400 font-mono">{fmtUsd(failed)}</span>
          </div>
        )}
      </div>
      {/* Pending share bar */}
      <div className="mt-3">
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pendingPct}%`, background: bucket.color }}
          />
        </div>
        <p className="text-white/30 text-[10px] mt-1">{pendingPct}% pending of {fmtUsd(total)} total</p>
      </div>
    </Card>
  );
}

// ── Depth saturation card ────────────────────────────────────────────────────
function DepthCard({ depth }) {
  const summary = depth?.networkDepth?.summary;
  const saturation = depth?.swapSaturation ?? [];
  const levelDist = depth?.levelDistribution ?? [];
  const pct = summary?.fullyDepth5Pct ?? 0;
  const avg = summary?.avgMaxDepth ?? 0;
  const total5 = summary?.fullyDepth5Count ?? 0;
  const totalR = summary?.totalReferrers ?? 0;

  return (
    <Card title="Referral Network Depth">
      {/* Saturation progress */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-1">
          <span className="text-white text-sm">5-level saturation</span>
          <span className="text-[#3CF902] text-xl font-bold font-mono">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#3CF902] transition-all duration-700"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="text-white/30 text-[10px] mt-1">
          {total5} / {totalR} referrers have ≥5 levels · avg depth {avg.toFixed(2)}
        </p>
      </div>

      {/* Level distribution mini-bars */}
      <div className="space-y-1">
        {levelDist.map((row) => {
          const maxRows = Math.max(...levelDist.map((r) => r.rows), 1);
          const barW = Math.round((row.rows / maxRows) * 100);
          return (
            <div key={row.level} className="flex items-center gap-2">
              <span className="text-white/40 text-[10px] w-10 shrink-0">L{row.level}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#3CF902]/70" style={{ width: `${barW}%` }} />
              </div>
              <span className="text-white/50 text-[10px] w-12 text-right font-mono">{fmtUsd(row.totalUsd)}</span>
            </div>
          );
        })}
      </div>

      {/* Swap saturation breakdown */}
      <div className="mt-4 grid grid-cols-5 gap-1">
        {saturation.map((s) => (
          <div key={s.maxLevel} className="text-center">
            <div
              className="h-8 rounded flex items-end justify-center overflow-hidden bg-white/5"
              title={`${s.swapCount} swaps reached level ${s.maxLevel}`}
            >
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${s.pct}%`,
                  background: `rgba(60,249,2,${0.3 + (s.maxLevel / 5) * 0.7})`,
                }}
              />
            </div>
            <span className="text-white/30 text-[9px]">L{s.maxLevel}</span>
            <span className="block text-white/50 text-[9px]">{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Sync health card ─────────────────────────────────────────────────────────
function SyncHealthCard({ health }) {
  const chains = health?.chains ?? [];
  const healthy = health?.healthy ?? null;

  return (
    <Card title="Event Monitor Sync Health">
      {healthy === null ? (
        <p className="text-white/30 text-sm">No data</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${healthy ? 'bg-[#3CF902]' : 'bg-amber-400'}`} />
            <span className={`text-sm font-medium ${healthy ? 'text-[#3CF902]' : 'text-amber-400'}`}>
              {healthy ? 'All chains healthy' : `${health.staleChains?.length ?? 0} chain(s) stale`}
            </span>
          </div>
          <div className="space-y-2">
            {chains.length === 0 && (
              <p className="text-white/30 text-xs">No chains tracked yet (monitor may be stopped).</p>
            )}
            {chains.map((c) => (
              <div key={c.chainId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.stale ? 'bg-amber-400' : 'bg-[#3CF902]'}`}
                  />
                  <span className="text-white text-xs">{chainName(c.chainId)}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono ${c.stale ? 'text-amber-400' : 'text-white/50'}`}>
                    {fmtAge(c.ageMs)}
                  </span>
                  {c.blocksBehind != null && (
                    <span className="text-white/30 text-[10px] ml-2">{c.blocksBehind} blk behind</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

// ── Recent activity feed ─────────────────────────────────────────────────────
function RecentActivity({ rows }) {
  if (!rows?.length) return <p className="text-white/30 text-xs py-2">No recent activity.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/30 border-b border-white/5">
            <th className="text-left py-2 pr-3 font-medium">Type</th>
            <th className="text-left py-2 pr-3 font-medium">Chain</th>
            <th className="text-left py-2 pr-3 font-medium">Token</th>
            <th className="text-right py-2 pr-3 font-medium">USD</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="py-2 pr-3 font-medium text-white/80">{r.feeType?.replace('_', ' ')}</td>
              <td className="py-2 pr-3 text-white/50">{chainName(r.sourceChainId)}</td>
              <td className="py-2 pr-3 text-white/50">{r.tokenInSymbol ?? '—'}</td>
              <td className="py-2 pr-3 text-right font-mono text-white">
                {r.feeAmountUsd != null ? fmtUsd(r.feeAmountUsd) : '—'}
              </td>
              <td className="py-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    r.status === 'rewarded'
                      ? 'bg-[#3CF902]/10 text-[#3CF902]'
                      : r.status === 'failed'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-white/5 text-white/40'
                  }`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Top referrers table ──────────────────────────────────────────────────────
function TopReferrers({ rows }) {
  if (!rows?.length) return <p className="text-white/30 text-xs py-2">No referrer data yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/30 border-b border-white/5">
            <th className="text-left py-2 pr-3 font-medium">#</th>
            <th className="text-left py-2 pr-3 font-medium">Referrer</th>
            <th className="text-right py-2 pr-3 font-medium">Max depth</th>
            <th className="text-right py-2 font-medium">Downline</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.referrerAddress} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="py-2 pr-3 text-white/30">{i + 1}</td>
              <td className="py-2 pr-3 font-mono text-white/70">{addrShort(r.referrerAddress)}</td>
              <td className="py-2 pr-3 text-right">
                <span className="inline-flex items-center gap-1">
                  <span className="text-white font-medium">{r.maxDepth}</span>
                  <span className="text-white/30">/ 5</span>
                </span>
              </td>
              <td className="py-2 text-right text-white/60">{r.totalDownline}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { address } = useAccount();
  const { open } = useAppKit();
  const navigate = useNavigate();

  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('mango_admin_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const [stats, setStats]     = useState(null);
  const [depth, setDepth]     = useState(null);
  const [health, setHealth]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const intervalRef = useRef(null);

  // ── data loading ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async (key) => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, h] = await Promise.all([
        getAdminReferralStats(key),
        getAdminReferralDepth(key),
        getAdminSyncHealth(key),
      ]);
      setStats(s);
      setDepth(d);
      setHealth(h);
      setLastRefresh(new Date());
      setAuthenticated(true);
    } catch (e) {
      setError(e?.message || 'Failed to load admin data');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh once authenticated
  useEffect(() => {
    if (!authenticated || !apiKey) return;
    intervalRef.current = setInterval(() => loadAll(apiKey), AUTO_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [authenticated, apiKey, loadAll]);

  // Try stored key on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('mango_admin_key');
    if (stored) {
      setApiKey(stored);
      loadAll(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = useCallback(
    (e) => {
      e.preventDefault();
      const key = keyInput.trim();
      if (!key) return;
      sessionStorage.setItem('mango_admin_key', key);
      setApiKey(key);
      loadAll(key);
    },
    [keyInput, loadAll],
  );

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('mango_admin_key');
    setApiKey('');
    setAuthenticated(false);
    setStats(null);
    setDepth(null);
    setHealth(null);
    clearInterval(intervalRef.current);
  }, []);

  // ── MANGO purchase pending total ───────────────────────────────────────────
  const mangoPending = stats?.totals?.mango_purchase?.pending_usd ?? null;

  // ── login screen ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
        <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
          <SwapHeader address={address} onConnect={open} />
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-white text-[28px] font-medium">Admin Dashboard</h1>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#3CF902] text-sm font-medium hover:underline"
            >
              ← Swap
            </button>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-1">API key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="x-api-key value"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3CF902]/50"
              />
            </div>
            {error && <ErrorMsg msg={error} />}
            {loading && <Spinner />}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-[#3CF902] text-black font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? 'Loading…' : 'View dashboard'}
            </button>
          </form>
          <SwapFooter />
        </div>
      </div>
    );
  }

  // ── dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-4xl flex flex-col px-5 pt-[80px] pb-12">
        <SwapHeader address={address} onConnect={open} />

        {/* Page title row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-white text-[28px] font-medium leading-tight">Admin Dashboard</h1>
            {lastRefresh && (
              <p className="text-white/30 text-xs mt-0.5">
                Updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30 s
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadAll(apiKey)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white/70 text-xs hover:border-[#3CF902]/50 hover:text-[#3CF902] transition-colors disabled:opacity-40"
            >
              {loading ? 'Refreshing…' : '↺ Refresh'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-white/30 text-xs hover:text-red-400 hover:border-red-400/30 transition-colors"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#3CF902] text-sm font-medium hover:underline"
            >
              ← Swap
            </button>
          </div>
        </div>

        {error && <ErrorMsg msg={error} />}

        {/* ── MANGO Buy Queue alert banner ─────────────────────────────────── */}
        {mangoPending != null && mangoPending > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <span className="text-amber-400 text-lg">⚠</span>
            <div>
              <p className="text-amber-300 text-sm font-medium">
                MANGO Buy Queue: {fmtUsd(mangoPending)} pending
              </p>
              <p className="text-amber-400/60 text-xs mt-0.5">
                These fees have been collected but not yet converted to MANGO.
                Run the mango-purchase job or execute the swap manually.
              </p>
            </div>
          </div>
        )}

        {/* ── Fee bucket cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {FEE_BUCKETS.map((b) => (
            <BucketCard key={b.key} bucket={b} totals={stats?.totals} />
          ))}
        </div>

        {/* ── Depth + Sync health row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {depth ? <DepthCard depth={depth} /> : <Card title="Referral Network Depth"><Spinner /></Card>}
          {health ? <SyncHealthCard health={health} /> : <Card title="Event Monitor Sync Health"><Spinner /></Card>}
        </div>

        {/* ── Recent activity ───────────────────────────────────────────────── */}
        <Card title="Recent Activity (last 20)" className="mb-4">
          {stats ? (
            <RecentActivity rows={stats.recentActivity} />
          ) : (
            <Spinner />
          )}
        </Card>

        {/* ── Top referrers ─────────────────────────────────────────────────── */}
        <Card title="Top Referrers by Depth">
          {depth ? (
            <TopReferrers rows={depth.topReferrersByDepth} />
          ) : (
            <Spinner />
          )}
        </Card>

        <SwapFooter />
      </div>
    </div>
  );
}
