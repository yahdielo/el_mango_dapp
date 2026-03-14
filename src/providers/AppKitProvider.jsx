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
  tron,
} from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

const queryClient = new QueryClient();
// Reown project ID. In Reown Dashboard you must add Allowed Origins (e.g. https://el-mango-dapp.vercel.app)
// or you get 403 and WebSocket 3000 (Unauthorized: invalid key).
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'd1e4867bd0b1fdc19e40af935262591e';

const metadata = {
  name: 'MangoSwap',
  description: 'MangoSwap - Cross-Chain Swap',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003',
  icons: ['https://mangodefi.wtf/static/media/mango.d01e53f401b1e8ed51a3.png'],
};

// Chains that match our chains.json (EVM + Tron). Only these appear in "Choose Network"
// and are supported in the app. Order: Base first (default), then rest.
const chains = [
  base,
  mainnet,
  arbitrum,
  optimism,
  polygon,
  bsc,
  avalanche,
  tron,
];

const networks = chains;

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
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    homepage: 'https://walletconnect.com',
    image_url: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg',
    mobile_link: 'https://walletconnect.com',
    desktop_link: 'https://walletconnect.com',
  },
];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: base,
  projectId,
  metadata,
  allWallets: 'SHOW',
  featuredWalletIds: FEATURED_WALLET_IDS,
  customWallets: CUSTOM_WALLETS,
  enableWallets: true,
  features: { analytics: false },
});

export function AppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
