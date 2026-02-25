import { useEffect } from 'react';

/**
 * Initialize Telegram Web App when running inside Telegram.
 * - Calls ready() to signal app is loaded
 * - Expands to full viewport
 * - Applies theme colors to body
 */
export function useTelegramWebApp() {
  useEffect(() => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.themeParams?.bg_color) {
        document.body.style.backgroundColor = tg.themeParams.bg_color;
      }
      if (tg.themeParams?.text_color) {
        document.body.style.color = tg.themeParams.text_color;
      }
    }
  }, []);
}

/**
 * Get Telegram WebApp instance (or null if not in Telegram)
 */
export function getTelegramWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}
