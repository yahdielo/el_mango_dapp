import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import { getSwapHistory } from '../services/historyApi';
import { getChain, getExplorerUrl } from '../utils/chainConfig';

const PAGE_SIZE = 20;

const STATUS_STYLE = {
  completed:  { dot: 'bg-[#3CF902]',   label: 'Completed',  text: 'text-[#3CF902]' },
  failed:     { dot: 'bg-red-500',      label: 'Failed',     text: 'text-red-400' },
  pending:    { dot: 'bg-yellow-400',   label: 'Pending',    text: 'text-yellow-300' },
  processing: { dot: 'bg-blue-400',     label: 'Processing', text: 'text-blue-300' },
};

function statusStyle(raw) {
  const key = (raw || '').toLowerCase().replace(/[^a-z]/g, '');
  return STATUS_STYLE[key] || STATUS_STYLE.pending;
}

function chainLabel(chainId) {
  const chain = getChain(chainId);
  return chain?.nativeCurrency?.name?.replace(' Mainnet', '') || chain?.name || `Chain ${chainId}`;
}

function shortHash(h) {
  if (!h) return '—';
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function formatAmount(raw) {
  if (!raw) return '—';
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  return n < 0.000001 ? n.toExponential(3) : n.toPrecision(6).replace(/\.?0+$/, '');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function TxLink({ chainId, txHash }) {
  const url = getExplorerUrl(chainId, txHash);
  if (!url || !txHash) return <span className="text-gray-500">—</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="text-[#3CF902] hover:underline font-mono text-xs">
      {shortHash(txHash)}
    </a>
  );
}

function SwapRow({ swap }) {
  const s = statusStyle(swap.status);
  const isCrossChain = swap.source_chain_id !== swap.dest_chain_id;
  const srcChain = chainLabel(swap.source_chain_id);
  const dstChain = chainLabel(swap.dest_chain_id);

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${s.dot}`} />
          <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
          {swap.bridge_provider && (
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
              {swap.bridge_provider}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{formatDate(swap.created_at)}</span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <span className="text-white font-semibold">
          {formatAmount(swap.amount_in)}&nbsp;<span className="text-gray-400 text-xs">{swap.token_in?.toUpperCase?.() || ''}</span>
        </span>
        <span className="text-gray-500 mx-1">→</span>
        <span className="text-white font-semibold">
          {swap.amount_out ? formatAmount(swap.amount_out) : '?'}&nbsp;<span className="text-gray-400 text-xs">{swap.token_out?.toUpperCase?.() || ''}</span>
        </span>
        {isCrossChain && (
          <span className="text-gray-500 text-xs ml-2">
            {srcChain} → {dstChain}
          </span>
        )}
        {!isCrossChain && (
          <span className="text-gray-500 text-xs ml-2">{srcChain}</span>
        )}
      </div>

      {/* Tx links */}
      <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
        {swap.source_tx_hash && (
          <span>Source: <TxLink chainId={swap.source_chain_id} txHash={swap.source_tx_hash} /></span>
        )}
        {swap.dest_tx_hash && swap.dest_chain_id !== swap.source_chain_id && (
          <span>Dest: <TxLink chainId={swap.dest_chain_id} txHash={swap.dest_tx_hash} /></span>
        )}
        {swap.completed_at && (
          <span className="text-gray-600">Completed {formatDate(swap.completed_at)}</span>
        )}
      </div>

      {swap.error_message && (
        <p className="text-red-400 text-xs bg-red-900/20 rounded px-2 py-1 mt-1">{swap.error_message}</p>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [swaps, setSwaps] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (addr, off) => {
    if (!addr) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSwapHistory(addr, { limit: PAGE_SIZE, offset: off });
      setSwaps(data.swaps || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setOffset(0);
      load(address, 0);
    } else {
      setSwaps([]);
      setTotal(0);
    }
  }, [address, isConnected, load]);

  const goPage = (newOffset) => {
    setOffset(newOffset);
    load(address, newOffset);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center px-4 pt-8 pb-24">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">← Swap</Link>
          <h1 className="text-xl font-bold text-white">Swap History</h1>
        </div>

        {!isConnected && (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-2 text-lg">Connect your wallet</p>
            <p className="text-sm">Your swap history will appear here once connected.</p>
          </div>
        )}

        {isConnected && loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        )}

        {isConnected && !loading && error && (
          <div className="text-center py-12 text-red-400">
            <p>{error}</p>
            <button onClick={() => load(address, offset)}
              className="mt-4 text-sm text-[#3CF902] hover:underline">
              Try again
            </button>
          </div>
        )}

        {isConnected && !loading && !error && swaps.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">No swaps yet</p>
            <p className="text-sm">Your completed swaps will appear here.</p>
            <Link to="/" className="mt-4 inline-block text-[#3CF902] hover:underline text-sm">
              Make your first swap →
            </Link>
          </div>
        )}

        {isConnected && !loading && !error && swaps.length > 0 && (
          <>
            <p className="text-gray-500 text-xs mb-3">{total} total swap{total !== 1 ? 's' : ''}</p>
            <div className="flex flex-col gap-3">
              {swaps.map((s) => <SwapRow key={s.id} swap={s} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  disabled={offset === 0}
                  onClick={() => goPage(Math.max(0, offset - PAGE_SIZE))}
                  className="px-4 py-2 rounded-lg bg-white/10 text-sm disabled:opacity-30 hover:bg-white/20"
                >
                  ← Prev
                </button>
                <span className="text-gray-400 text-sm">{currentPage} / {totalPages}</span>
                <button
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => goPage(offset + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-sm disabled:opacity-30 hover:bg-white/20"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
