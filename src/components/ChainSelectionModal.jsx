import { useState, useMemo, useEffect, useRef } from 'react';
import { getAllChains } from '../utils/chainConfig';

const FIXED_CHAIN_ICON_BY_ID = {
  34443: '/assets/mode.png?v=3',
  167000: '/assets/taiko.png?v=3',
  480: '/assets/worldchain.png?v=3',
  48900: '/assets/zircuit-inverted-icon.svg?v=3',
};

export default function ChainSelectionModal({ show, onHide, onSelect, title = 'Select Chain', selectedChainId, chains: chainsProp }) {
  const [search, setSearch] = useState('');
  const allChains = useMemo(() => chainsProp ?? getAllChains(), [chainsProp]);
  const filtered = useMemo(() => {
    if (!search) return allChains;
    const s = search.toLowerCase();
    return allChains.filter((c) => c.chainName?.toLowerCase().includes(s) || String(c.chainId).includes(s));
  }, [allChains, search]);

  const closeButtonRef = useRef(null);

  const handleSelect = (chain) => {
    onSelect(chain);
    setSearch('');
    onHide();
  };

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto" onClick={onHide}>
      <div
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-[402px] max-h-[85vh] overflow-hidden border border-[#3CF902]/50 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chain-modal-title"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 id="chain-modal-title" className="text-white text-xl font-medium">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onHide}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-[#3CF902] rounded-lg"
            aria-label="Close chain selection"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Search chains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#111] text-white border border-gray-700 focus:border-[#3CF902] focus:outline-none"
          />
        </div>
        <div className="overflow-y-auto max-h-[50vh] p-4 grid grid-cols-2 gap-3">
          {filtered.map((chain) => {
            const id = parseInt(chain.chainId);
            const isSelected = selectedChainId === id;
            const resolvedImg = FIXED_CHAIN_ICON_BY_ID[id] || chain.img;
            return (
              <button
                key={chain.chainId}
                type="button"
                onClick={() => handleSelect(chain)}
                className={`flex flex-col items-center gap-2 p-4 min-h-[80px] rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[#3CF902] ${
                  isSelected ? 'border-[#3CF902] bg-[#3CF902]/10' : 'border-gray-700 bg-[#222] hover:border-gray-600'
                }`}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-[#3CF902]/30">
                  {resolvedImg ? (
                    <img
                      src={resolvedImg}
                      alt={chain.chainName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={`text-white font-bold ${resolvedImg ? 'hidden' : ''}`}>{(chain.chainName || 'C')[0]}</span>
                </div>
                <span className="text-white text-sm font-medium text-center truncate w-full">{chain.chainName}</span>
                {isSelected && <span className="text-[#3CF902] text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
