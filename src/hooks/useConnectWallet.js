import { useCallback, useMemo } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

/**
 * Connect without opening Reown modal when possible to avoid "Illegal invocation"
 * (modal touches provider.connected in timers and breaks in WebView/Chrome).
 * Use injected connector first everywhere; open modal only for account menu.
 */
export function useConnectWallet() {
  const { address } = useAccount();
  const { open } = useAppKit();
  const { connectAsync, connectors, isPending } = useConnect();

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
    if (injectedConnector) {
      connectAsync({ connector: injectedConnector }).catch(() => {});
    } else {
      open();
    }
  }, [address, injectedConnector, connectAsync, open]);

  return { handleConnect, isConnecting: isPending };
}
