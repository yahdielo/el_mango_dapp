import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { 
    arbitrum, 
    base, 
    bsc, 
    tron,
    polygon,
    optimism,
    avalanche,
    mainnet // Ethereum
} from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
//import { bsc } from 'viem/chains';

const queryClient = new QueryClient();

// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || 'd1e4867bd0b1fdc19e40af935262591e';

// 2. Create a metadata object - optional
// URL must match the current origin (localhost for dev, production URL for prod)
// For localhost, we need to use http://localhost (without port) or the exact origin
const getMetadataUrl = () => {
    // Use environment variable if set
    if (process.env.REACT_APP_REOWN_METADATA_URL) {
        return process.env.REACT_APP_REOWN_METADATA_URL;
    }
    // Auto-detect based on current origin
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        // For localhost, return the exact origin (including port if present)
        // Reown needs the exact origin to match
        return origin;
    }
    // Default to localhost for development
    return 'http://localhost';
};

const metadata = {
    name: 'mango',
    description: 'mango defi',
    url: getMetadataUrl(), // origin must match your domain & subdomain
    icons: [
        process.env.REACT_APP_REOWN_ICON_URL || 
        (typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : 'https://mangodefi.wtf/static/media/mango.d01e53f401b1e8ed51a3.png')
    ],
};

// 3. Set the networks - All 7 EVM chains + Tron
const networks = [
    base,      // Base (Chain ID: 8453)
    bsc,       // BSC (Chain ID: 56)
    tron,      // Tron (non-EVM but supported)
    arbitrum,  // Arbitrum (Chain ID: 42161)
    polygon,   // Polygon (Chain ID: 137) - NEW
    optimism,  // Optimism (Chain ID: 10) - NEW
    avalanche, // Avalanche (Chain ID: 43114) - NEW
    mainnet    // Ethereum (Chain ID: 1) - NEW
];

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
    networks,
    projectId,
    ssr: true,
});

// 5. Create modal with error handling for subscription restore
createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
        analytics: true, // Optional - defaults to your Cloud configuration
    },
    // Suppress subscription restore warnings in development
    enableAnalytics: process.env.NODE_ENV === 'production',
});

export function AppKitProvider({ children }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
