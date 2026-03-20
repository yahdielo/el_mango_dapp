import { useState, useMemo, useEffect } from 'react';
import mangoTokenImage from '../assets/mango-token.jpg';
import { getTrustWalletLogoUrl } from '../utils/tokenLogoUrl';

/** Fallback logo URLs (e.g. CoinGecko) when primary (Trust Wallet) fails with connection reset */
const FALLBACK_LOGO_BY_SYMBOL = {
  MANGO: mangoTokenImage,
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/USDC.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png',
  WETH: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
};

/** CoinMarketCap id map for symbols frequently returned in Ethereum token modal. */
const CMC_ID_BY_SYMBOL = {
  ENA: 30171, PERP: 6950, POWER: 39042, TANSSI: 37297, RLUSD: 34387, PAXG: 4705,
  MNTX: 36317, XCN: 18679, UNIO: 32984, TREE: 37495, GEAR: 16360, IMT: 36285,
  FET: 3773, CTA: 31185, POL: 28321, SOL: 5426, EMP: 25446, KITE: 38828, RARE: 11294,
  BIO: 34812, SUPER: 8290, ELP: 37487, WTAO: 23528, USDC: 3408, ATTRA: 39086,
  CXT: 32526, SUDO: 21733, MKR: 1518, TRAC: 2467, USDS: 17285, SPX: 28081,
  APEX: 19843, USR: 32873, ADS: 1883, SNX: 2586, MORPHO: 34104, VSN: 37322,
  QNT: 3155, NPC: 27960, IMX: 10603, ALMANAK: 39088, ATH: 30083, UNI: 7083,
  SOPH: 32087, GOG: 10630, AAVE: 7278, ANIME: 35319, FUEL: 24087, LRC: 1934,
  GODS: 10631, WEETH: 28695, ENS: 13855, BBTC: 32237, TON: 11419, ETH: 1027,
  XAUT: 5176, SYRUP: 33824, MUSD: 38167, USDE: 29470, WSTETH: 12409, TBTC: 26133,
  SPK: 36569, WBTC: 3717, TEL: 2394, BEAM: 28298, OCEAN: 3911, PYUSD: 27772,
  LBTC: 33652, RNDR: 5690, AEVO: 29676, WETH: 2396, API3: 7737, ONDO: 21159,
  DAI: 4943, EIGEN: 30494, USD1: 36148, MOG: 27659, SOLVBTC: 33312, GHO: 23508,
  USDT: 825, SHFL: 29960, MNT: 27075, SKY: 33038, LINK: 1975, STRK: 22691,
  CRV: 6538, LDO: 8000, USDF: 35721, EURC: 20641, FOOM: 27023, ASTR: 12885,
  OBOL: 36278, XCL: 38597, ZCHF: 31379, USDD: 19891, PEPE: 24478, BIFI: 7311,
  COW: 19269, BOLD: 38407, SHIB: 5994,
};

function getCmcLogoBySymbol(symbol) {
  if (!symbol) return null;
  const id = CMC_ID_BY_SYMBOL[String(symbol).toUpperCase()];
  if (!id) return null;
  return {
    local: `/assets/cmc/tokens/${id}.png`,
    remote: `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`,
  };
}

/**
 * Renders token logo with fallback: primary logoURI -> fallback URL (if symbol known) -> letter.
 * MANGO uses bundled mango-token.jpg so it loads on Vercel and all deployments.
 */
export default function TokenLogo({
  token,
  chainId,
  className = '',
  letterClassName = 'text-white font-bold text-sm',
}) {
  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => {
    setSrcIndex(0);
  }, [token?.symbol, token?.address, chainId]);

  const primary = token?.logoURI;
  // If `logoURI` is missing, attempt deterministic TrustWallet asset path.
  // This is synchronous (URL construction only); the browser will handle 404 via onError.
  const hasTrustWalletAddress =
    token?.address && typeof token.address === 'string' && token.address.length > 0 && token.address !== '0x0000000000000000000000000000000000000000';

  const trustWalletFallback =
    typeof chainId === 'number' && hasTrustWalletAddress ? getTrustWalletLogoUrl(chainId, token.address) : null;

  const fallback = token?.symbol ? FALLBACK_LOGO_BY_SYMBOL[token.symbol] : null;
  const cmcFallback = getCmcLogoBySymbol(token?.symbol);
  const urls = useMemo(
    () => [primary, trustWalletFallback, fallback, cmcFallback?.local, cmcFallback?.remote].filter(Boolean),
    [primary, trustWalletFallback, fallback, cmcFallback]
  );
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
