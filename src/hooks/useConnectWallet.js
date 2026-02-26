import { useCallback, useMemo } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { getTelegramWebApp } from './useTelegramWebApp';

/**
 * In Telegram WebView the Reown modal can throw "Illegal invocation" when
 * accessing provider.connected in timers. Use injected connector directly
 * (no modal) for connect; use open() when already connected (account menu).
 */
export function useConnectWallet() {
  const { address } = useAccount();
  const { open } = useAppKit();
  const { connectAsync, connectors, isPending } = useConnect();
  const isWebView = Boolean(getTelegramWebApp());

  const injectedConnector = useMemo(
    () =>
      connectors.find(
        (c) =>
          c.type === 'injected' ||
          c.id === 'injected' ||
          (c.name && c.name.toLowerCase().includes('metamask'))
      ),
    [connectors]
  );

  const handleConnect = useCallback(() => {
    if (address) {
      open();
      return;
    }
    if (isWebView && injectedConnector) {
      connectAsync({ connector: injectedConnector }).catch(() => {});
    } else {
      open();
    }
  }, [address, isWebView, injectedConnector, connectAsync, open]);

  return { handleConnect, isConnecting: isPending };
}
