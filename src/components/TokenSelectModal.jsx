import { useState, useEffect, useRef } from 'react';
import { useTokenBalance } from '../hooks/useTokenBalance';

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
          {token.logoURI ? (
            <img
              src={token.logoURI}
              alt={token.symbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`text-black font-bold text-sm ${token.logoURI ? 'hidden' : ''}`}>{token.symbol?.[0] || '?'}</span>
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
  const closeButtonRef = useRef(null);

  const filtered = tokens.filter((t) =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onHide();
      }
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
