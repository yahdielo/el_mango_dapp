import TokenLogo from './TokenLogo';

const CHAIN_COLORS = {
  1: '#627EEA', 10: '#FF0420', 56: '#F3BA2F', 137: '#8247E5', 8453: '#0052FF',
  42161: '#28A0F0', 43114: '#E84142', 728126428: '#FF0019', 501111: '#9945FF',
  0: '#F7931A', 101: '#4DA2FF', 144: '#23292F',
};

export default function CrossChainSwapCard({
  label,
  chain,
  token,
  amount,
  usdValue,
  onChainClick,
  onTokenClick,
  onAmountChange,
  readOnly,
  onMaxClick,
}) {
  const TokenIcon = () => (
    <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center overflow-hidden bg-[#8247E5]">
      <TokenLogo token={token} letterClassName="text-white font-bold" />
    </div>
  );

  const ChainIcon = () => {
    if (!chain) {
      return (
        <div className="w-[36px] h-[36px] rounded-full bg-[#999] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">?</span>
        </div>
      );
    }
    const chainId = parseInt(chain.chainId);
    const color = CHAIN_COLORS[chainId] || '#999';
    if (chain.img) {
      return (
        <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: color }}>
          <img
            src={chain.img}
            alt={chain.chainName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.nextSibling?.classList.remove('hidden');
            }}
          />
          <span className="text-white font-bold text-xs hidden">{(chain.chainName || '?')[0]}</span>
        </div>
      );
    }
    return (
      <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
        <span className="text-white font-bold text-xs">{(chain.chainName || '?')[0]}</span>
      </div>
    );
  };

  const isReceive = label === 'You Receive';
  const usd = usdValue != null && usdValue > 0 ? Number(usdValue).toFixed(2) : '0';

  return (
    <div className="relative" style={{ aspectRatio: isReceive ? '361/158' : '361/153' }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={isReceive ? '0 0 361 158' : '0 0 361 153'}
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          {!isReceive && (
            <filter id="ccPayShadow" x="-2%" y="-2%" width="104%" height="118%">
              <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="black" floodOpacity="0.25" />
            </filter>
          )}
          <linearGradient id={isReceive ? 'ccReceiveGrad' : 'ccPayGrad'} x1="180.5" y1="0" x2="180.5" y2={isReceive ? '158' : '153'} gradientUnits="userSpaceOnUse">
            <stop stopColor="#3CF902" />
            <stop offset="1" stopColor="#FFF306" />
          </linearGradient>
        </defs>
        {isReceive ? (
          <path
            d="M33 0.5H328C345.949 0.5 360.5 15.0507 360.5 33V121.226C360.5 140.562 343.75 155.67 324.487 153.902C286.021 150.371 224.927 145.51 180 145.5C135.208 145.49 74.7501 150.327 36.5586 153.862C17.2808 155.646 0.500185 140.532 0.5 121.18V33C0.5 15.0507 15.0507 0.5 33 0.5Z"
            fill="white"
            stroke="url(#ccReceiveGrad)"
          />
        ) : (
          <>
            <path
              d="M0 36.0357C0 16.6671 16.567 1.43112 35.8808 2.8874C75.0541 5.84109 138.171 10 183 10C227.207 10 287.176 5.95566 324.981 3.01098C344.344 1.50277 361 16.7602 361 36.1817V120C361 138.225 346.225 153 328 153H33C14.7746 153 0 138.225 0 120V36.0357Z"
              fill="white"
              filter="url(#ccPayShadow)"
            />
            <path
              d="M0.5 36.0361C0.5 16.9612 16.8167 1.95141 35.8428 3.38574C75.0157 6.33941 138.15 10.5 183 10.5C227.228 10.5 287.215 6.45447 325.02 3.50977C344.095 2.02395 360.5 17.0546 360.5 36.1816V120C360.5 137.949 345.949 152.5 328 152.5H33C15.0507 152.5 0.5 137.949 0.5 120V36.0361Z"
              stroke="url(#ccPayGrad)"
              fill="none"
            />
          </>
        )}
      </svg>

      <div className="absolute" style={{ top: '17.6%', left: '6.4%' }}>
        <span className="text-[#555555] text-[18px] font-medium leading-none">{label}</span>
      </div>

      {!readOnly && onMaxClick && (
        <div className="absolute flex items-center" style={{ top: '19.6%', right: '4.7%' }}>
          <button
            type="button"
            onClick={onMaxClick}
            className="flex items-center justify-center rounded-[17px] bg-black h-[17px] px-3 focus:outline-none"
          >
            <span className="text-white text-[13px] font-medium leading-none">Max</span>
          </button>
        </div>
      )}

      {/* Chain + Token row - same layout as Swap */}
      <div className="absolute flex items-center gap-[10px]" style={{ top: '39.9%', left: '5.5%' }}>
        {onChainClick && (
          <button type="button" onClick={onChainClick} className="flex items-center gap-[8px] focus:outline-none min-w-0">
            <ChainIcon />
            <span className="text-black text-[18px] font-medium truncate max-w-[80px]">{chain?.chainName || 'Select'}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70">
              <path d="M2 3L5 6L8 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onTokenClick}
          className="flex items-center gap-[10px] focus:outline-none"
        >
          <TokenIcon />
          <span className="text-black text-[18px] font-medium">{token?.symbol || 'Select'}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70">
            <path d="M2 3L5 6L8 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="absolute text-right" style={{ top: '43.8%', right: '6.9%' }}>
        {readOnly ? (
          <>
            <div className="text-black text-[20px] font-medium leading-none">{amount || '0'}</div>
            <div className="text-black text-[14px] font-medium mt-1">=${usd} USD</div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v) || v === '') onAmountChange?.(v);
              }}
              placeholder="0"
              className="text-black text-[20px] font-medium leading-none bg-transparent border-none outline-none w-32 text-right placeholder:text-gray-400"
            />
            <div className="text-black text-[14px] font-medium mt-1">=${usd} USD</div>
          </>
        )}
      </div>
    </div>
  );
}
