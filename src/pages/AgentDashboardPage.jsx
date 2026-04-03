import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import SwapHeader from '../components/SwapHeader';
import SwapFooter from '../components/SwapFooter';
import { getCredits, listSessions, createSession, revokeSession } from '../services/agentApi';

const API_KEY_STORAGE = 'mango_agent_api_key';
const API_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || 'https://api.mangoswap.io').replace(/\/$/, '');

const CHAIN_NAMES = {
  1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum',
  10: 'Optimism', 137: 'Polygon', 56: 'BSC', 43114: 'Avalanche',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      {title && (
        <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="w-5 h-5 border-2 border-[#3CF902]/30 border-t-[#3CF902] rounded-full animate-spin" />
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 mb-4">
      <span className="text-red-400 text-sm">⚠</span>
      <p className="text-red-400 text-sm">{msg}</p>
    </div>
  );
}

function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`px-3 py-1.5 rounded-lg border border-white/20 text-white/60 text-xs hover:border-[#3CF902]/50 hover:text-[#3CF902] transition-colors ${className}`}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

function StatusDot({ status }) {
  const color =
    status === 'active' ? 'bg-[#3CF902]' :
    status === 'revoked' ? 'bg-red-500' : 'bg-amber-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`} />;
}

function CodeBlock({ children, className = '' }) {
  return (
    <pre className={`rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[#3CF902] text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed ${className}`}>
      {children}
    </pre>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview',     icon: '◈' },
  { id: 'sessions',  label: 'Session Keys', icon: '⚿' },
  { id: 'mcp',       label: 'MCP / SDK',    icon: '⟳' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentDashboardPage() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { open } = useAppKit();

  const [apiKey, setApiKey]         = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [keyInput, setKeyInput]     = useState('');
  const [credits, setCredits]       = useState(null);
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [tab, setTab]               = useState('overview');

  // Session create form
  const [newSession, setNewSession] = useState({
    walletAddress: address || '', tokenAddress: 'ETH',
    maxAmount: '0.1', expiresIn: 86400, chainId: 8453,
  });
  const [sessionCreating, setSessionCreating] = useState(false);
  const [createdSession, setCreatedSession]   = useState(null);
  const [revokingId, setRevokingId]           = useState(null);

  const load = useCallback(async (key) => {
    if (!key) return;
    setLoading(true); setError('');
    try {
      const [cred, sess] = await Promise.allSettled([getCredits(key), listSessions(key)]);
      if (cred.status === 'fulfilled') setCredits(cred.value);
      if (sess.status === 'fulfilled') setSessions(sess.value?.sessions ?? sess.value ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (apiKey) load(apiKey); }, [apiKey, load]);

  // Prefill wallet address from connected wallet
  useEffect(() => {
    if (address) setNewSession(s => ({ ...s, walletAddress: s.walletAddress || address }));
  }, [address]);

  const handleLogin = (e) => {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(API_KEY_STORAGE, k);
    setApiKey(k); setKeyInput('');
  };

  const handleLogout = () => {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey(''); setCredits(null); setSessions([]); setCreatedSession(null);
  };

  const handleCreateSession = async () => {
    setSessionCreating(true); setError('');
    try {
      const result = await createSession(apiKey, newSession);
      setCreatedSession(result);
      await load(apiKey);
    } catch (e) { setError(e.message); }
    finally { setSessionCreating(false); }
  };

  const handleRevoke = async (sessionId) => {
    if (!confirm('Revoke this session key? This cannot be undone.')) return;
    setRevokingId(sessionId);
    try { await revokeSession(apiKey, sessionId); await load(apiKey); }
    catch (e) { setError(e.message); }
    finally { setRevokingId(null); }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');

  const mcpConfig = JSON.stringify({
    mcpServers: {
      mangoswap: {
        command: 'npx', args: ['-y', '@mangoswap/mcp-server'],
        env: { MANGO_API_URL: API_BASE, MANGO_API_KEY: apiKey || 'your-api-key' },
      },
    },
  }, null, 2);

  // ── Login screen ─────────────────────────────────────────────────────────

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
        <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
          <SwapHeader address={address} onConnect={open} />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white text-[28px] font-medium leading-tight">Agent Dashboard</h1>
              <p className="text-white/40 text-sm mt-1">Manage session keys, credits & MCP config</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/cross-chain')}
              className="text-[#3CF902] text-sm font-medium hover:underline shrink-0"
            >
              ← Swap
            </button>
          </div>

          {/* Robot icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-full border border-[#3CF902]/30 bg-[#3CF902]/5 flex items-center justify-center">
              <span className="text-4xl">🤖</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-1.5">API Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="Enter your MangoSwap API key…"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#3CF902]/50"
              />
            </div>
            {error && <ErrorMsg msg={error} />}
            {loading && <Spinner />}
            <button
              type="submit"
              disabled={loading || !keyInput.trim()}
              className="w-full px-4 py-3 rounded-xl bg-[#3CF902] text-black font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {loading ? 'Connecting…' : 'Open Dashboard'}
            </button>
            <p className="text-white/30 text-xs text-center">
              No API key?{' '}
              <a href="mailto:dev@mangoswap.io" className="text-[#3CF902]/70 hover:text-[#3CF902]">
                Contact us
              </a>{' '}
              or use anonymous access (rate-limited).
            </p>
          </form>

          <SwapFooter />
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-4xl flex flex-col px-5 pt-[80px] pb-12">
        <SwapHeader address={address} onConnect={open} />

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-white text-[28px] font-medium leading-tight">🤖 Agent Dashboard</h1>
            <p className="text-white/30 text-xs mt-1">
              Key: <span className="text-[#3CF902]/60 font-mono">{apiKey.slice(0, 8)}{'•'.repeat(8)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => load(apiKey)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white/60 text-xs hover:border-[#3CF902]/50 hover:text-[#3CF902] transition-colors disabled:opacity-40"
            >
              {loading ? '↺ Loading…' : '↺ Refresh'}
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
              onClick={() => navigate('/cross-chain')}
              className="text-[#3CF902] text-sm font-medium hover:underline"
            >
              ← Swap
            </button>
          </div>
        </div>

        {error && <ErrorMsg msg={error} />}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.03] border border-white/10 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#3CF902] text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Card>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Credits</p>
                {loading ? <Spinner /> : (
                  <div>
                    <p className="text-[#3CF902] text-2xl font-semibold">
                      ${credits?.balance?.toFixed(4) ?? '—'}
                    </p>
                    <p className="text-white/30 text-xs mt-1">{credits?.currency ?? 'USD'}</p>
                    {credits?.lowBalanceAlert && (
                      <p className="text-amber-400 text-xs mt-1">⚠ Low balance</p>
                    )}
                  </div>
                )}
              </Card>

              <Card>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Active Sessions</p>
                <p className="text-white text-2xl font-semibold">{activeSessions.length}</p>
                <p className="text-white/30 text-xs mt-1">of {sessions.length} total</p>
              </Card>

              <Card>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">API Endpoint</p>
                <p className="text-[#3CF902] text-xs font-mono break-all leading-relaxed">
                  {API_BASE.replace('https://', '')}
                </p>
              </Card>

              <Card>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Quick Links</p>
                <div className="flex flex-col gap-1.5">
                  <a href="/cross-chain" className="text-[#3CF902] text-xs hover:underline">↗ Cross-Chain Swap</a>
                  <a href={`${API_BASE}/api/docs`} target="_blank" rel="noreferrer" className="text-[#3CF902] text-xs hover:underline">↗ API Docs</a>
                  <a href="https://github.com/0tabris/mangoswap" target="_blank" rel="noreferrer" className="text-[#3CF902] text-xs hover:underline">↗ GitHub</a>
                </div>
              </Card>
            </div>

            {/* API Key card */}
            <Card title="API Key" className="mb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <code className="text-[#3CF902] font-mono text-sm">
                  {apiKey.slice(0, 10)}{'•'.repeat(Math.max(0, apiKey.length - 10))}
                </code>
                <CopyButton text={apiKey} label="Copy Key" />
              </div>
            </Card>

            {/* Session key summary */}
            {activeSessions.length > 0 && (
              <Card title="Active Session Keys" className="mb-4">
                <div className="flex flex-col gap-2">
                  {activeSessions.slice(0, 3).map(s => (
                    <div key={s.sessionId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={s.status} />
                        <span className="text-white/60 text-xs font-mono">{s.sessionId?.slice(0, 12)}…</span>
                      </div>
                      <span className="text-white/40 text-xs">{CHAIN_NAMES[s.chainId] ?? s.chainId} · {s.maxAmount}</span>
                    </div>
                  ))}
                  {activeSessions.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setTab('sessions')}
                      className="text-[#3CF902] text-xs hover:underline text-left mt-1"
                    >
                      + {activeSessions.length - 3} more → View all
                    </button>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── Sessions Tab ─────────────────────────────────────────────────── */}
        {tab === 'sessions' && (
          <>
            {/* Create form */}
            <Card title="Create Session Key" className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Wallet Address</label>
                  <input
                    type="text"
                    value={newSession.walletAddress}
                    onChange={e => setNewSession(s => ({ ...s, walletAddress: e.target.value }))}
                    placeholder="0x…"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#3CF902]/50"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Chain</label>
                  <select
                    value={newSession.chainId}
                    onChange={e => setNewSession(s => ({ ...s, chainId: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-white/20 bg-[#111111] px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3CF902]/50"
                  >
                    {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Max Amount</label>
                  <input
                    type="number"
                    value={newSession.maxAmount}
                    onChange={e => setNewSession(s => ({ ...s, maxAmount: e.target.value }))}
                    placeholder="0.1"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#3CF902]/50"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Expires In (seconds)</label>
                  <input
                    type="number"
                    value={newSession.expiresIn}
                    onChange={e => setNewSession(s => ({ ...s, expiresIn: Number(e.target.value) }))}
                    placeholder="86400"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#3CF902]/50"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateSession}
                disabled={sessionCreating || !newSession.walletAddress}
                className="px-5 py-2.5 rounded-xl bg-[#3CF902] text-black font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {sessionCreating ? 'Creating…' : 'Create Session Key'}
              </button>
            </Card>

            {/* Created session JWT */}
            {createdSession && (
              <div className="rounded-xl border border-[#3CF902]/30 bg-[#3CF902]/5 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#3CF902] shrink-0" />
                  <h3 className="text-[#3CF902] text-sm font-semibold">Session Created — Save your JWT</h3>
                </div>
                <p className="text-white/40 text-xs mb-2">This token won't be shown again.</p>
                <CodeBlock className="mb-3 text-[10px]">{createdSession.jwt}</CodeBlock>
                <div className="flex items-center gap-2 flex-wrap">
                  <CopyButton text={createdSession.jwt} label="Copy JWT" />
                  <span className="text-white/30 text-xs">ID: {createdSession.sessionId}</span>
                  <span className="text-white/30 text-xs">
                    Expires {new Date(createdSession.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Session list */}
            <Card title={`Session Keys (${sessions.length})`}>
              {sessions.length === 0 ? (
                <p className="text-white/30 text-sm py-4 text-center">No session keys yet. Create one above.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/30 text-left border-b border-white/5">
                        {['ID', 'Wallet', 'Chain', 'Max Amt', 'Expires', 'Status', ''].map(h => (
                          <th key={h} className="pb-2 pr-3 font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.sessionId} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 pr-3 font-mono text-white/60">{s.sessionId?.slice(0, 8)}…</td>
                          <td className="py-2.5 pr-3 font-mono text-white/60">{s.walletAddress?.slice(0, 8)}…</td>
                          <td className="py-2.5 pr-3 text-white/60">{CHAIN_NAMES[s.chainId] ?? s.chainId}</td>
                          <td className="py-2.5 pr-3 text-white/60">{s.maxAmount}</td>
                          <td className="py-2.5 pr-3 text-white/40">
                            {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={s.status} />
                              <span className={s.status === 'active' ? 'text-[#3CF902]' : 'text-white/30'}>
                                {s.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            {s.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleRevoke(s.sessionId)}
                                disabled={revokingId === s.sessionId}
                                className="px-2 py-1 rounded-lg border border-red-500/20 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-40"
                              >
                                {revokingId === s.sessionId ? '…' : 'Revoke'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── MCP / SDK Tab ─────────────────────────────────────────────────── */}
        {tab === 'mcp' && (
          <>
            {/* Claude Desktop */}
            <Card title="Claude Desktop — MCP Server" className="mb-4">
              <p className="text-white/40 text-xs mb-3">
                Add to <code className="text-[#3CF902]/70">claude_desktop_config.json</code> and restart Claude.
              </p>
              <CodeBlock className="mb-3">{mcpConfig}</CodeBlock>
              <div className="flex gap-2">
                <CopyButton text={mcpConfig} label="Copy Config" />
                <a
                  href="https://github.com/0tabris/mangoswap/tree/main/mangoswap/packages/mcp-server"
                  target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-white/20 text-white/50 text-xs hover:border-[#3CF902]/50 hover:text-[#3CF902] transition-colors"
                >
                  ↗ Docs
                </a>
              </div>
            </Card>

            {/* CLI */}
            <Card title="CLI — mango-agent" className="mb-4">
              <p className="text-white/40 text-xs mb-3">Run swaps from the terminal or CI pipelines.</p>
              <CodeBlock className="mb-2">npm install -g @mangoswap/agent-cli</CodeBlock>
              <CodeBlock className="mb-3">
{`export MANGO_API_KEY=${apiKey}

# Quote
mango-agent quote --from ETH:8453 --to ETH:1 --amount 0.01

# Swap
mango-agent swap --from ETH:8453 --to ETH:1 --amount 0.01 \\
  --recipient 0xYourAddress

# Status
mango-agent status --id <swapId>`}
              </CodeBlock>
              <CopyButton text={`npm install -g @mangoswap/agent-cli`} label="Copy Install" />
            </Card>

            {/* TypeScript SDK */}
            <Card title="TypeScript / JavaScript SDK" className="mb-4">
              <CodeBlock className="mb-2">npm install @mangoswap/sdk</CodeBlock>
              <CodeBlock className="mb-3">
{`import { MangoSwapSDK } from '@mangoswap/sdk';

const mango = new MangoSwapSDK({ apiKey: '${apiKey}' });

const quote = await mango.getQuote({
  sourceChainId: 8453, destChainId: 1,
  tokenIn: 'ETH', tokenOut: 'ETH', amountIn: '0.01',
});

const swap = await mango.createSwap({ ...params });
const result = await mango.waitForCompletion(swap.swapId);`}
              </CodeBlock>
              <CopyButton text="npm install @mangoswap/sdk" label="Copy Install" />
            </Card>

            {/* Python */}
            <Card title="Python (REST API)" className="mb-4">
              <CodeBlock className="mb-3">
{`import requests, time

HEADERS = {"x-api-key": "${apiKey}", "Content-Type": "application/json"}
BASE = "${API_BASE}"

swap = requests.post(f"{BASE}/api/v1/swap/cross-chain", headers=HEADERS, json={
    "sourceChainId": 8453, "destChainId": 1,
    "tokenIn": "ETH", "tokenOut": "ETH", "amountIn": "0.01",
    "recipient": "0xRecipient", "userAddress": "0xSender",
}).json()

print(f"Send ETH to: {swap['depositAddress']}")

# Poll until done
while True:
    s = requests.get(f"{BASE}/api/v1/swap/{swap['swapId']}/status",
                     headers=HEADERS).json()
    if s["status"] in ("completed", "failed", "expired"):
        break
    time.sleep(10)`}
              </CodeBlock>
              <CopyButton
                text={`import requests, time\n\nHEADERS = {"x-api-key": "${apiKey}", "Content-Type": "application/json"}`}
                label="Copy Python"
              />
            </Card>

            {/* Embeddable Widget */}
            <Card title="Embeddable Swap Widget">
              <p className="text-white/40 text-xs mb-3">
                Drop a swap UI into any webpage — no React required.
              </p>
              <CodeBlock className="mb-3">
{`<script src="https://cdn.mangoswap.io/widget.js"></script>
<mango-swap
  api-key="${apiKey}"
  from-chain="8453"
  to-chain="1"
  theme="dark">
</mango-swap>`}
              </CodeBlock>
              <CopyButton
                text={`<script src="https://cdn.mangoswap.io/widget.js"></script>\n<mango-swap api-key="${apiKey}" from-chain="8453" to-chain="1" theme="dark"></mango-swap>`}
                label="Copy HTML"
              />
            </Card>
          </>
        )}

        <SwapFooter />
      </div>
    </div>
  );
}
