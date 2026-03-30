import { useState, useEffect, useCallback } from 'react';

/**
 * Provides Tron wallet connection state via the TronLink browser extension.
 *
 * Usage:
 *   const { tronAddress, isConnected, connect, disconnect } = useTronWallet();
 *
 * - `tronAddress`  — connected Tron address (T..., 34 chars), or ''
 * - `isConnected`  — true when TronLink is connected and has a default address
 * - `isAvailable`  — true when TronLink extension is detected in the browser
 * - `connect`      — calls tron_requestAccounts to open the TronLink popup
 * - `disconnect`   — clears local state (TronLink has no programmatic disconnect)
 */
export function useTronWallet() {
  const [tronAddress, setTronAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const readAddress = useCallback(() => {
    // TronLink injects tronLink.tronWeb (preferred) or window.tronWeb
    const tw = window.tronLink?.tronWeb || window.tronWeb;
    const addr = tw?.defaultAddress?.base58;
    if (addr && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) {
      setTronAddress(addr);
      setIsConnected(true);
    } else {
      setTronAddress('');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    const hasTronLink = !!(window.tronLink || window.tronWeb);
    setIsAvailable(hasTronLink);
    if (hasTronLink) readAddress();

    // TronLink fires a message event when the account changes
    const handleMessage = (e) => {
      const action = e?.data?.message?.action;
      if (action === 'setAccount' || action === 'setNode' || action === 'disconnect') {
        readAddress();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [readAddress]);

  const connect = useCallback(async () => {
    if (!window.tronLink) return;
    try {
      const res = await window.tronLink.request({ method: 'tron_requestAccounts' });
      // res === 200 or an object with code === 200 means approved
      if (res === 200 || res?.code === 200) {
        readAddress();
      }
    } catch {
      // user rejected or TronLink not installed
    }
  }, [readAddress]);

  const disconnect = useCallback(() => {
    setTronAddress('');
    setIsConnected(false);
  }, []);

  return { tronAddress, isConnected, isAvailable, connect, disconnect };
}
