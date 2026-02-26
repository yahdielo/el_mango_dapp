import TokenLogo from './TokenLogo';

export default function SwapCard({ label, token, amount, onAmountChange, onTokenClick, onMaxClick, readOnly, disabled, usdValue }) {
  const TokenIcon = () => (
    <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center overflow-hidden bg-[#8247E5]">
      <TokenLogo token={token} letterClassName="text-white font-bold" />
    </div>
  );

  const fallbackUsd = amount && token?.symbol === 'WETH' ? (parseFloat(amount) * 3500).toFixed(2) : amount && token?.symbol === 'USDC' ? amount : amount ? (parseFloat(amount) * 1).toFixed(2) : '0';
  const displayUsd = usdValue != null && usdValue !== '' ? String(usdValue) : fallbackUsd;

  const isReceive = label === 'You Receive';

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
            <filter id="payShadow" x="-2%" y="-2%" width="104%" height="118%">
              <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="black" floodOpacity="0.25" />
            </filter>
          )}
          <linearGradient id={isReceive ? 'receiveGrad' : 'payGrad'} x1="180.5" y1="0" x2="180.5" y2={isReceive ? '158' : '153'} gradientUnits="userSpaceOnUse">
            <stop stopColor="#3CF902" />
            <stop offset="1" stopColor="#FFF306" />
          </linearGradient>
        </defs>
        {isReceive ? (
          <path
            d="M33 0.5H328C345.949 0.5 360.5 15.0507 360.5 33V121.226C360.5 140.562 343.75 155.67 324.487 153.902C286.021 150.371 224.927 145.51 180 145.5C135.208 145.49 74.7501 150.327 36.5586 153.862C17.2808 155.646 0.500185 140.532 0.5 121.18V33C0.5 15.0507 15.0507 0.5 33 0.5Z"
            fill="white"
            stroke="url(#receiveGrad)"
          />
        ) : (
          <>
            <path
              d="M0 36.0357C0 16.6671 16.567 1.43112 35.8808 2.8874C75.0541 5.84109 138.171 10 183 10C227.207 10 287.176 5.95566 324.981 3.01098C344.344 1.50277 361 16.7602 361 36.1817V120C361 138.225 346.225 153 328 153H33C14.7746 153 0 138.225 0 120V36.0357Z"
              fill="white"
              filter="url(#payShadow)"
            />
            <path
              d="M0.5 36.0361C0.5 16.9612 16.8167 1.95141 35.8428 3.38574C75.0157 6.33941 138.15 10.5 183 10.5C227.228 10.5 287.215 6.45447 325.02 3.50977C344.095 2.02395 360.5 17.0546 360.5 36.1816V120C360.5 137.949 345.949 152.5 328 152.5H33C15.0507 152.5 0.5 137.949 0.5 120V36.0361Z"
              stroke="url(#payGrad)"
              fill="none"
            />
          </>
        )}
      </svg>

      <div className="absolute" style={{ top: '17.6%', left: '6.4%' }}>
        <span className="text-[#555555] text-[18px] font-medium leading-none">{label}</span>
      </div>

      {!readOnly && !disabled && onMaxClick && (
        <div className="absolute flex items-center" style={{ top: '19.6%', right: '4.7%' }}>
          <button
            type="button"
            onClick={onMaxClick}
            className="flex items-center justify-center rounded-[17px] bg-black h-[17px] px-3 focus:outline-none"
            aria-label="Use maximum balance"
          >
            <span className="text-white text-[13px] font-medium leading-none">Max</span>
          </button>
        </div>
      )}

      <div className="absolute flex items-center gap-[10px]" style={{ top: '39.9%', left: '5.5%' }}>
        <button
          type="button"
          onClick={disabled ? undefined : onTokenClick}
          disabled={disabled}
          className={`flex items-center gap-[10px] min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-white rounded-lg ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          aria-label={`Select token. Current: ${token?.symbol || 'Select'}`}
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
            <div className="text-black text-[32px] font-medium leading-none">{amount || '0'}</div>
            <div className="text-black text-[14px] font-medium mt-1">=${displayUsd} USD</div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={amount}
              onChange={onAmountChange}
              placeholder="0"
              readOnly={disabled}
              disabled={disabled}
              className={`text-black text-[32px] font-medium leading-none bg-transparent border-none outline-none w-32 text-right placeholder:text-gray-400 ${disabled ? 'cursor-not-allowed' : ''}`}
            />
            <div className="text-black text-[14px] font-medium mt-1">=${displayUsd} USD</div>
          </>
        )}
      </div>
    </div>
  );
}
