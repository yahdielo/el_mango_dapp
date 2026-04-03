import { useState, useEffect, useCallback } from 'react';
import { getCredits, listSessions, createSession, revokeSession } from '../services/agentApi';

const API_KEY_STORAGE = 'mango_agent_api_key';
const API_BASE = (import.meta.env.VITE_MANGO_SERVICES_URL || 'https://api.mangoswap.io').replace(/\/$/, '');

const CHAIN_NAMES = {
  1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum',
  10: 'Optimism', 137: 'Polygon', 56: 'BSC', 43114: 'Avalanche',
};

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} style={styles.copyBtn}>
      {copied ? '✅ Copied' : label}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const color = status === 'active' ? '#22c55e' : status === 'revoked' ? '#ef4444' : '#f59e0b';
  return (
    <span style={{ ...styles.badge, background: color + '22', color }}>
      {status}
    </span>
  );
}

export default function AgentDashboardPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [credits, setCredits] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  // Session create form
  const [newSession, setNewSession] = useState({
    walletAddress: '', tokenAddress: 'ETH', maxAmount: '0.1',
    expiresIn: 86400, chainId: 8453,
  });
  const [sessionCreating, setSessionCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);

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

  const saveApiKey = () => {
    const k = apiKeyInput.trim();
    if (!k) return;
    localStorage.setItem(API_KEY_STORAGE, k);
    setApiKey(k); setApiKeyInput('');
  };

  const handleCreateSession = async () => {
    setSessionCreating(true); setError('');
    try {
      const result = await createSession(apiKey, newSession);
      setCreatedSession(result);
      await load(apiKey);
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionCreating(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Revoke this session key?')) return;
    try {
      await revokeSession(apiKey, sessionId);
      await load(apiKey);
    } catch (e) {
      setError(e.message);
    }
  };

  const mcpConfig = JSON.stringify({
    mcpServers: {
      mangoswap: {
        command: 'npx',
        args: ['-y', '@mangoswap/mcp-server'],
        env: { MANGO_API_URL: API_BASE, MANGO_API_KEY: apiKey || 'your-api-key-here' },
      },
    },
  }, null, 2);

  if (!apiKey) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🤖</div>
            <h1 style={styles.pageTitle}>Agent Dashboard</h1>
            <p style={styles.subtitle}>
              Manage session keys, API credits, and MCP server configuration for AI agent integrations.
            </p>
          </div>
          <Card title="Enter Your API Key">
            <input
              style={styles.input}
              type="text"
              placeholder="Paste your MangoSwap API key..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveApiKey()}
            />
            <button style={styles.primaryBtn} onClick={saveApiKey}>Connect</button>
            <p style={styles.hint}>
              No API key? Contact <a href="mailto:dev@mangoswap.io" style={styles.link}>dev@mangoswap.io</a> or
              use the public key (rate limited): <code style={styles.code}>anonymous</code>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>🤖 Agent Dashboard</h1>
            <p style={styles.subtitle}>AI agent integration management</p>
          </div>
          <button style={styles.secondaryBtn} onClick={() => {
            localStorage.removeItem(API_KEY_STORAGE); setApiKey('');
          }}>
            Disconnect
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Tabs */}
        <div style={styles.tabs}>
          {['overview', 'sessions', 'mcp-setup'].map(t => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {{ overview: '📊 Overview', sessions: '🔑 Session Keys', 'mcp-setup': '⚙️ MCP Setup' }[t]}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={styles.grid2}>
            <Card title="API Key">
              <div style={styles.keyDisplay}>
                <code style={styles.code}>{apiKey.slice(0, 8)}{'•'.repeat(Math.max(0, apiKey.length - 8))}</code>
                <CopyButton text={apiKey} />
              </div>
            </Card>

            <Card title="API Credits">
              {loading ? (
                <p style={styles.subtext}>Loading…</p>
              ) : credits ? (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
                    ${credits.balance?.toFixed(4) ?? '—'}
                  </div>
                  <p style={styles.subtext}>{credits.currency ?? 'USD'}</p>
                  {credits.lowBalanceAlert && (
                    <div style={styles.warningBox}>⚠️ Low balance — top up soon</div>
                  )}
                </div>
              ) : (
                <p style={styles.subtext}>—</p>
              )}
            </Card>

            <Card title="Active Sessions">
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
                {sessions.filter(s => s.status === 'active').length}
              </div>
              <p style={styles.subtext}>of {sessions.length} total</p>
            </Card>

            <Card title="Quick Links">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="/cross-chain" style={styles.link}>↗ Cross-Chain Swap</a>
                <a href={`${API_BASE}/api/docs`} target="_blank" rel="noreferrer" style={styles.link}>↗ API Docs</a>
                <a href="https://github.com/mangoswap" target="_blank" rel="noreferrer" style={styles.link}>↗ GitHub</a>
              </div>
            </Card>
          </div>
        )}

        {/* Sessions tab */}
        {tab === 'sessions' && (
          <div>
            <Card title="Create Session Key">
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Wallet Address</label>
                  <input style={styles.input} placeholder="0x..."
                    value={newSession.walletAddress}
                    onChange={e => setNewSession(s => ({ ...s, walletAddress: e.target.value }))} />
                </div>
                <div>
                  <label style={styles.label}>Chain</label>
                  <select style={styles.select}
                    value={newSession.chainId}
                    onChange={e => setNewSession(s => ({ ...s, chainId: Number(e.target.value) }))}>
                    {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Max Amount</label>
                  <input style={styles.input} type="number" placeholder="0.1"
                    value={newSession.maxAmount}
                    onChange={e => setNewSession(s => ({ ...s, maxAmount: e.target.value }))} />
                </div>
                <div>
                  <label style={styles.label}>Expires In (seconds)</label>
                  <input style={styles.input} type="number" placeholder="86400"
                    value={newSession.expiresIn}
                    onChange={e => setNewSession(s => ({ ...s, expiresIn: Number(e.target.value) }))} />
                </div>
              </div>
              <button style={styles.primaryBtn} onClick={handleCreateSession} disabled={sessionCreating}>
                {sessionCreating ? 'Creating…' : 'Create Session Key'}
              </button>
            </Card>

            {createdSession && (
              <Card title="✅ Session Created">
                <p style={styles.subtext}>Save this JWT — it won't be shown again.</p>
                <div style={styles.keyDisplay}>
                  <code style={{ ...styles.code, fontSize: 11, wordBreak: 'break-all' }}>
                    {createdSession.jwt?.slice(0, 60)}…
                  </code>
                  <CopyButton text={createdSession.jwt} label="Copy JWT" />
                </div>
                <p style={styles.subtext}>Session ID: {createdSession.sessionId}</p>
                <p style={styles.subtext}>Expires: {new Date(createdSession.expiresAt).toLocaleString()}</p>
              </Card>
            )}

            <Card title={`Session Keys (${sessions.length})`}>
              {sessions.length === 0 ? (
                <p style={styles.subtext}>No session keys yet. Create one above.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['ID', 'Wallet', 'Chain', 'Max Amount', 'Expires', 'Status', ''].map(h => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.sessionId}>
                          <td style={styles.td}><code style={styles.code}>{s.sessionId?.slice(0, 8)}…</code></td>
                          <td style={styles.td}><code style={styles.code}>{s.walletAddress?.slice(0, 10)}…</code></td>
                          <td style={styles.td}>{CHAIN_NAMES[s.chainId] ?? s.chainId}</td>
                          <td style={styles.td}>{s.maxAmount}</td>
                          <td style={styles.td}>{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '—'}</td>
                          <td style={styles.td}><StatusBadge status={s.status} /></td>
                          <td style={styles.td}>
                            {s.status === 'active' && (
                              <button style={styles.dangerBtn} onClick={() => handleRevokeSession(s.sessionId)}>
                                Revoke
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
          </div>
        )}

        {/* MCP Setup tab */}
        {tab === 'mcp-setup' && (
          <div>
            <Card title="Claude Desktop Setup">
              <p style={styles.subtext}>
                Add to your <code style={styles.code}>claude_desktop_config.json</code>:
              </p>
              <div style={styles.codeBlock}>
                <pre style={{ margin: 0, overflow: 'auto' }}>{mcpConfig}</pre>
              </div>
              <CopyButton text={mcpConfig} label="Copy Config" />
            </Card>

            <Card title="Install CLI">
              <p style={styles.subtext}>Run cross-chain swaps from the terminal or CI pipelines:</p>
              <div style={styles.codeBlock}>
                <code>npm install -g @mangoswap/agent-cli</code>
              </div>
              <CopyButton text="npm install -g @mangoswap/agent-cli" label="Copy" />
              <div style={{ marginTop: 16, ...styles.codeBlock }}>
                <code>{'mango-agent quote --from ETH:8453 --to ETH:1 --amount 0.01'}</code>
              </div>
            </Card>

            <Card title="Python SDK">
              <p style={styles.subtext}>Call MangoSwap from Python agents:</p>
              <div style={styles.codeBlock}>
                <pre style={{ margin: 0 }}>{`import requests

headers = {"x-api-key": "${apiKey}"}
resp = requests.post(
    "${API_BASE}/api/v1/swap/cross-chain",
    headers=headers,
    json={
        "sourceChainId": 8453,
        "destChainId": 1,
        "tokenIn": "ETH",
        "tokenOut": "ETH",
        "amountIn": "0.01",
        "recipient": "0xYourAddress",
        "userAddress": "0xYourAddress",
    }
)
print(resp.json())`}
                </pre>
              </div>
              <CopyButton text={`import requests\n\nheaders = {"x-api-key": "${apiKey}"}\nresp = requests.post("${API_BASE}/api/v1/swap/cross-chain", headers=headers, json={"sourceChainId": 8453, "destChainId": 1, "tokenIn": "ETH", "tokenOut": "ETH", "amountIn": "0.01", "recipient": "0xYourAddress", "userAddress": "0xYourAddress"})\nprint(resp.json())`} label="Copy Python" />
            </Card>

            <Card title="Embed Widget in Any Site">
              <p style={styles.subtext}>Drop the swap widget into any HTML page:</p>
              <div style={styles.codeBlock}>
                <pre style={{ margin: 0 }}>{`<script src="https://cdn.mangoswap.io/widget.js"></script>
<mango-swap
  api-key="${apiKey}"
  from-chain="8453"
  to-chain="1"
  theme="dark">
</mango-swap>`}
                </pre>
              </div>
              <CopyButton text={`<script src="https://cdn.mangoswap.io/widget.js"></script>\n<mango-swap api-key="${apiKey}" from-chain="8453" to-chain="1" theme="dark"></mango-swap>`} label="Copy HTML" />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  container: { maxWidth: 900, margin: '0 auto', padding: '40px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' },
  subtitle: { color: '#94a3b8', margin: 0, fontSize: 14 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px', marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, background: '#1e293b', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  tabActive: { background: '#334155', color: '#f1f5f9' },
  keyDisplay: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none', marginBottom: 8, boxSizing: 'border-box' },
  select: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none', marginBottom: 8 },
  label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 500 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 },
  primaryBtn: { background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  secondaryBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 },
  dangerBtn: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  copyBtn: { background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 },
  code: { background: '#0f172a', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: '#22d3ee' },
  codeBlock: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0', marginBottom: 8, overflowX: 'auto' },
  link: { color: '#22d3ee', textDecoration: 'none', fontSize: 14 },
  subtext: { color: '#94a3b8', fontSize: 13, margin: '4px 0' },
  hint: { color: '#64748b', fontSize: 12, marginTop: 8 },
  errorBox: { background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 16px', color: '#fca5a5', marginBottom: 16, fontSize: 14 },
  warningBox: { background: '#f59e0b22', border: '1px solid #f59e0b', borderRadius: 6, padding: '6px 12px', color: '#fcd34d', fontSize: 12, marginTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', color: '#64748b', fontWeight: 500, padding: '6px 8px', borderBottom: '1px solid #334155', fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '10px 8px', borderBottom: '1px solid #1e293b', color: '#cbd5e1', verticalAlign: 'middle' },
};
