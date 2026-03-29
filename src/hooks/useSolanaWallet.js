import { useAppKitAccount, useAppKit } from '@reown/appkit/react';

/**
 * Provides Solana wallet connection state from the Reown AppKit Solana adapter.
 *
 * Usage:
 *   const { solanaAddress, isConnected, connect } = useSolanaWallet();
 *
 * - `solanaAddress` — the connected Solana public key (base58 string), or ''
 * - `isConnected`   — true when a Solana wallet is actively connected
 * - `connect`       — opens the AppKit modal filtered to the Solana network
 */
export function useSolanaWallet() {
  const { address, isConnected, caipAddress } = useAppKitAccount({ namespace: 'solana' });
  const { open } = useAppKit();

  // caipAddress looks like "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:B62..."; extract the public key
  const solanaAddress = (caipAddress?.split(':')[2] || address || '');

  function connect() {
    open({ view: 'Connect', namespace: 'solana' });
  }

  function disconnect() {
    // Switching view to 'Account' lets the user disconnect from the modal
    open({ view: 'Account', namespace: 'solana' });
  }

  return {
    solanaAddress: isConnected ? solanaAddress : '',
    isConnected: Boolean(isConnected && solanaAddress),
    connect,
    disconnect,
  };
}
