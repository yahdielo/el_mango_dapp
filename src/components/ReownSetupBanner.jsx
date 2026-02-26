import { useState, useEffect } from 'react';

const REOWN_CONFIG_URL = 'https://api.web3modal.org/appkit/v1/config';
const STORAGE_KEY = 'reown-403-banner-dismissed';

export default function ReownSetupBanner() {
  const [show, setShow] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'd1e4867bd0b1fdc19e40af935262591e';
    const url = `${REOWN_CONFIG_URL}?projectId=${projectId}&st=appkit&sv=react-wagmi-1.7.15`;

    fetch(url)
      .then((res) => {
        if (res.status === 403) {
          setOrigin(window.location.origin);
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  if (!show || !origin) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 text-black px-3 py-2 text-center text-sm shadow"
    >
      <span>
        WalletConnect blocked. In{' '}
        <a
          href="https://cloud.reown.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          Reown Dashboard
        </a>
        , add this URL to Project Domains: <code className="bg-black/10 px-1 rounded">{origin}</code>
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="ml-2 underline font-medium hover:no-underline"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
