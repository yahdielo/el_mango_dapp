import { useState, useEffect, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { ERC20_ABI } from '../config/abis';
import { getTokenLogoUrl } from '../utils/tokenLogoUrl';
import TokenLogo from './TokenLogo';

const ETH_ALLOWED_BRIDGE_SYMBOLS = new Set(['ETH', 'USDC', 'USDT', 'DAI']);

function TokenRow({ token, address, chainId, onSelect }) {
  const { formattedBalance, isLoading, error } = useTokenBalance({
    address,
    token,
    chainId,
  });
  const balanceDisplay = isLoading ? '—' : error ? '0' : formattedBalance;

  return (
    <button
      type="button"
      onClick={() => onSelect(token)}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] rounded-xl hover:bg-[#222] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-inset"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-[#3CF902]">
          <TokenLogo token={token} chainId={chainId} letterClassName="text-black font-bold text-sm" />
        </div>
        <div>
          <div className="text-white font-medium">{token.symbol}</div>
          <div className="text-gray-500 text-sm">{token.name}</div>
        </div>
      </div>
      <div className="text-gray-400 text-sm font-medium flex-shrink-0">
        {balanceDisplay}
      </div>
    </button>
  );
}

export default function TokenSelectModal({ show, onHide, tokens, onSelect, address, chainId }) {
  const [search, setSearch] = useState('');
  const [customTokens, setCustomTokens] = useState([]);
  const [addAddress, setAddAddress] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const closeButtonRef = useRef(null);
  const publicClient = usePublicClient({ chainId });

  // If user switches chain, custom tokens added on the previous chain should not carry over.
  // Otherwise, the modal can show lots of unrelated tokens.
  useEffect(() => {
    setCustomTokens([]);
    setSearch('');
    setAddAddress('');
    setAddError('');
  }, [chainId]);

  const allTokensRaw = [...tokens, ...customTokens];
  // Hard UI guardrail: on Ethereum cross-chain modal, show only bridge-focused assets.
  // This prevents stale upstream token sources from rendering unrelated symbols.
  const allTokens = Number(chainId) === 1
    ? allTokensRaw.filter((t) => ETH_ALLOWED_BRIDGE_SYMBOLS.has(String(t?.symbol || '').toUpperCase()))
    : allTokensRaw;
  const filtered = allTokens.filter((t) =>
    (t.symbol && t.symbol.toLowerCase().includes(search.toLowerCase())) ||
    (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
    (t.address && t.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddByAddress = async () => {
    const raw = addAddress.trim();
    setAddError('');
    if (!raw) return;
    if (!isAddress(raw)) {
      setAddError('Invalid contract address');
      return;
    }
    const addr = raw.toLowerCase();
    const exists = allTokens.some((t) => (t.address || '').toLowerCase() === addr);
    if (exists) {
      setAddError('Token already in list');
      return;
    }
    if (!publicClient || !chainId) {
      setAddError('Network not available');
      return;
    }
    setAddLoading(true);
    try {
      const [symbol, name, decimals] = await Promise.all([
        publicClient.readContract({ address: raw, abi: ERC20_ABI, functionName: 'symbol' }),
        publicClient.readContract({ address: raw, abi: ERC20_ABI, functionName: 'name' }),
        publicClient.readContract({ address: raw, abi: ERC20_ABI, functionName: 'decimals' }),
      ]);
      let logoURI = null;
      try {
        logoURI = await getTokenLogoUrl(chainId, raw);
      } catch {
        // keep logoURI null; TokenLogo will show first letter
      }
      const token = {
        address: raw,
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown',
        decimals: Number(decimals ?? 18),
        chainId,
        ...(logoURI && { logoURI }),
      };
      setCustomTokens((prev) => [...prev, token]);
      setAddAddress('');
      setSearch('');
    } catch (err) {
      setAddError(err?.message?.includes('contract') ? 'Contract not found or not a token' : 'Failed to load token');
    } finally {
      setAddLoading(false);
    }
  };

  useEffect(() => {
    if (!show) {
      setAddError('');
      return;
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onHide}
      role="presentation"
    >
      <div
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-[402px] max-h-[85vh] overflow-hidden border border-[#3CF902]/50 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-modal-title"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 id="token-modal-title" className="text-white text-xl font-medium">Select Token</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onHide}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-[#3CF902] rounded-lg"
            aria-label="Close token selection"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token..."
            className="w-full px-4 py-3 rounded-xl bg-[#111] text-white border border-gray-700 focus:border-[#3CF902] focus:outline-none mb-4"
          />
          <div className="mb-4">
            <div className="text-gray-400 text-sm mb-2">Add by contract address</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={addAddress}
                onChange={(e) => { setAddAddress(e.target.value); setAddError(''); }}
                placeholder="0x..."
                className="flex-1 px-4 py-2 rounded-xl bg-[#111] text-white border border-gray-700 focus:border-[#3CF902] focus:outline-none text-sm"
                disabled={addLoading}
              />
              <button
                type="button"
                onClick={handleAddByAddress}
                disabled={addLoading || !addAddress.trim()}
                className="px-4 py-2 rounded-xl bg-[#3CF902] text-black font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addLoading ? '…' : 'Add'}
              </button>
            </div>
            {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
          </div>
        </div>
        <div className="overflow-y-auto max-h-[50vh] p-4 overscroll-contain">
          {filtered.map((token) => (
            <TokenRow
              key={`${token.symbol}-${token.address}`}
              token={token}
              address={address}
              chainId={chainId}
              onSelect={onSelect}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-500 text-center py-8">No tokens found</div>
          )}
        </div>
      </div>
    </div>
  );
}
