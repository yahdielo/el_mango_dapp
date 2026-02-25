const CHAIN_COLORS = {
  1: '#627EEA',
  10: '#FF0420',
  56: '#F3BA2F',
  137: '#8247E5',
  8453: '#0052FF',
  42161: '#28A0F0',
  43114: '#E84142',
  728126428: '#FF0019',
  501111: '#9945FF',
  0: '#F7931A',
  101: '#4DA2FF',
  144: '#23292F',
};

export default function ChainSelectorButton({ chain, onClick }) {
  const chainId = chain ? parseInt(chain.chainId) : null;
  const color = chainId != null ? CHAIN_COLORS[chainId] || '#999' : '#999';
  const name = chain?.chainName || 'Select Chain';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full h-10 px-2 pr-3 bg-[#222] border border-[#3CF902]/40 hover:border-[#3CF902] transition-colors focus:outline-none"
    >
      {chain?.img ? (
        <img
          src={chain.img}
          alt={name}
          className="w-8 h-8 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.nextSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${chain?.img ? 'hidden' : ''}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-white font-bold text-sm">{name?.charAt(0) || '?'}</span>
      </div>
      <span className="text-white text-sm font-medium max-w-[80px] truncate">{name}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70 flex-shrink-0">
        <path d="M2 3L5 6L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
