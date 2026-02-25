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
  fantom,
  zksync,
  tron,
} from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

const queryClient = new QueryClient();
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'd1e4867bd0b1fdc19e40af935262591e';

const metadata = {
  name: 'MangoSwap',
  description: 'MangoSwap - Cross-Chain Swap',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003',
  icons: ['https://mangodefi.wtf/static/media/mango.d01e53f401b1e8ed51a3.png'],
};

const networks = [
  mainnet,
  optimism,
  bsc,
  polygon,
  base,
  arbitrum,
  avalanche,
  fantom,
  zksync,
  tron,
];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
});

export function AppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
