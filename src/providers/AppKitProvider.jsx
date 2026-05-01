import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import {
  arbitrum,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
  avalanche,
  solana,
} from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { http, fallback } from 'wagmi';

const queryClient = new QueryClient();
// Reown project ID. In Reown Dashboard you must add Allowed Origins (e.g. https://el-mango-dapp.vercel.app)
// or you get 403 and WebSocket 3000 (Unauthorized: invalid key).
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;
if (!projectId) {
  throw new Error(
    'VITE_REOWN_PROJECT_ID is not set. ' +
    'Get a project ID at https://cloud.reown.com and add it to your .env file.'
  );
}

const metadata = {
  name: 'MangoSwap',
  description: 'MangoSwap - Cross-Chain Swap',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003',
  icons: ['https://mangodefi.wtf/static/media/mango.d01e53f401b1e8ed51a3.png'],
};

// All networks supported by the app. Base is default; solana appended last so the
// EVM chains stay at the top of the "Choose Network" list.
// Tron is intentionally excluded: it is NOT EVM and has no AppKit adapter installed.
// Tron wallet connections are handled via the TronLink browser extension (useTronWallet hook).
const evmChains = [base, mainnet, arbitrum, optimism, polygon, bsc, avalanche];
const networks = [...evmChains, solana];

// Known wallet IDs from Reown WalletGuide so the "All Wallets" list is never empty
// even when the Explorer API fails or projectId is misconfigured.
const FEATURED_WALLET_IDS = [
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
  '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
  '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Common wallet
];

// Fallback custom wallets so names/logos always show if Explorer metadata fails
const CUSTOM_WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    homepage: 'https://metamask.io',
    image_url: 'https://avatars.githubusercontent.com/u/11744586?s=200&v=4',
    mobile_link: 'https://metamask.app.link/dapp/',
    desktop_link: 'https://metamask.io',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    homepage: 'https://trustwallet.com',
    image_url: 'https://trustwallet.com/assets/images/media/assets/TWT.png',
    mobile_link: 'https://link.trustwallet.com/open_url?coin_id=60&url=',
    desktop_link: 'https://trustwallet.com',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    homepage: 'https://www.coinbase.com/wallet',
    image_url: 'https://www.coinbase.com/favicon.ico',
    mobile_link: 'https://go.cb-w.com/',
    desktop_link: 'https://www.coinbase.com/wallet',
  },
];

// Per-chain fallback transports. Multiple public RPCs + Alchemy (via VITE_ALCHEMY_KEY)
// prevent rate-limit hangs in Telegram WebView where a single RPC is quickly throttled.
function buildTransports() {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;
  const alchemy = (path) => alchemyKey ? http(`${path}/${alchemyKey}`) : null;

  const make = (alchemyPath, ...publicUrls) => {
    const sources = [
      alchemy(alchemyPath),
      ...publicUrls.map((u) => http(u)),
    ].filter(Boolean);
    return fallback(sources, { rank: false });
  };

  return {
    [base.id]:    make('https://base-mainnet.g.alchemy.com/v2', 'https://mainnet.base.org', 'https://base.llamarpc.com'),
    [mainnet.id]: make('https://eth-mainnet.g.alchemy.com/v2', 'https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'),
    [arbitrum.id]:make('https://arb-mainnet.g.alchemy.com/v2', 'https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'),
    [optimism.id]:make('https://opt-mainnet.g.alchemy.com/v2', 'https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'),
    [polygon.id]: make('https://polygon-mainnet.g.alchemy.com/v2', 'https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'),
    [bsc.id]:     make('https://bnb-mainnet.g.alchemy.com/v2', 'https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'),
    [avalanche.id]:make('https://avax-mainnet.g.alchemy.com/v2', 'https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'),
  };
}

// Lazy singleton — deferred until first render so all vendor modules are fully
// initialized before WagmiAdapter / createAppKit access their exports.
// Running these at module-scope causes TDZ crashes on Vercel due to Rollup chunk ordering.
let _wagmiAdapter = null;

function getAdapter() {
  if (_wagmiAdapter) return _wagmiAdapter;

  _wagmiAdapter = new WagmiAdapter({
    networks: evmChains,   // Wagmi only manages EVM chains; Solana is handled by SolanaAdapter
    projectId,
    ssr: false,
    transports: buildTransports(),
  });

  const solanaAdapter = new SolanaAdapter();

  createAppKit({
    adapters: [_wagmiAdapter, solanaAdapter],
    networks,
    defaultNetwork: base,
    projectId,
    metadata,
    // Hide the full wallet list so users can't choose WalletConnect.
    allWallets: 'HIDE',
    featuredWalletIds: FEATURED_WALLET_IDS,
    customWallets: CUSTOM_WALLETS,
    enableWallets: true,
    // Disable analytics to prevent pulse.walletconnect.org telemetry pings
    // which are blocked by Telegram's WebView CSP and generate console noise.
    features: { analytics: false },
  });

  return _wagmiAdapter;
}

export function AppKitProvider({ children }) {
  const adapter = getAdapter();
  return (
    <WagmiProvider config={adapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
