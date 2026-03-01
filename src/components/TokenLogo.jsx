import { useState, useMemo } from 'react';
import mangoTokenImage from '../assets/mango-token.jpg';

/** Fallback logo URLs (e.g. CoinGecko) when primary (Trust Wallet) fails with connection reset */
const FALLBACK_LOGO_BY_SYMBOL = {
  MANGO: mangoTokenImage,
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/USDC.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png',
  WETH: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
};

/**
 * Renders token logo with fallback: primary logoURI -> fallback URL (if symbol known) -> letter.
 * MANGO uses bundled mango-token.jpg so it loads on Vercel and all deployments.
 */
export default function TokenLogo({ token, className = '', letterClassName = 'text-white font-bold text-sm' }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const primary = token?.logoURI;
  const fallback = token?.symbol ? FALLBACK_LOGO_BY_SYMBOL[token.symbol] : null;
  const urls = useMemo(() => [primary, fallback].filter(Boolean), [primary, fallback]);
  const currentSrc = urls[srcIndex];
  const showLetter = !currentSrc || srcIndex >= urls.length;

  const handleError = () => {
    if (srcIndex + 1 < urls.length) setSrcIndex((i) => i + 1);
    else setSrcIndex(urls.length);
  };

  const letter = token?.symbol?.[0] || '?';

  return (
    <>
      {currentSrc && !showLetter && (
        <img
          src={currentSrc}
          alt={token?.symbol ?? ''}
          className={className || 'w-full h-full object-cover'}
          loading="eager"
          decoding="async"
          onError={handleError}
        />
      )}
      <span className={showLetter ? letterClassName : 'hidden'}>{letter}</span>
    </>
  );
}
