import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SwapHeader from '../components/SwapHeader';
import SwapFooter from '../components/SwapFooter';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { batchAddWhitelist } from '../services/whitelistApi';

const TIERS = ['Standard', 'VIP', 'Premium'];
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function parseLines(text) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[\s,]+/);
      const address = parts[0];
      const tier = parts[1] && TIERS.includes(parts[1]) ? parts[1] : 'Standard';
      return { address, tier };
    })
    .filter((u) => ADDRESS_REGEX.test(u.address));
}

export default function WhitelistAdminPage() {
  const { address } = useAccount();
  const { open } = useAppKit();
  const navigate = useNavigate();
  const [textarea, setTextarea] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const users = parseLines(textarea);
    if (!users.length) {
      setError('Enter at least one valid address (and optional tier: Standard, VIP, Premium).');
      setResult(null);
      return;
    }
    if (!adminKey.trim()) {
      setError('Admin key is required.');
      setResult(null);
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await batchAddWhitelist(users, adminKey.trim());
      setResult(res);
    } catch (err) {
      setError(err?.message || 'Batch add failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [textarea, adminKey]);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center" style={{ fontFamily: "'Afacad', sans-serif" }}>
      <div className="w-full max-w-[402px] flex flex-col px-5 pt-[80px] pb-8 min-h-screen">
        <SwapHeader address={address} onConnect={open} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-[32px] font-medium">Whitelist Admin</h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[#3CF902] text-sm font-medium hover:underline"
          >
            ← Swap
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Add addresses to the whitelist. One per line: <code className="text-[#3CF902]">0x... VIP</code> or <code className="text-[#3CF902]">0x... Premium</code>. Default tier is Standard.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-white text-sm font-medium mb-1">Admin key (x-admin-key)</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Required for batch-add"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-gray-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-1">Addresses (and optional tier)</label>
            <textarea
              value={textarea}
              onChange={(e) => setTextarea(e.target.value)}
              placeholder="0x1234...abcd VIP&#10;0x5678...wxyz Premium"
              rows={6}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-gray-500 text-sm font-mono resize-y"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {result && (
            <div className="rounded-xl border border-[#3CF902]/30 bg-[#3CF902]/10 p-3 text-sm text-[#3CF902]">
              Added: {result.added}, Failed: {result.failed}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#3CF902] text-black font-medium text-sm disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Batch add'}
          </button>
        </form>

        <SwapFooter />
      </div>
    </div>
  );
}
