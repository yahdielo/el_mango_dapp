/**
 * Resolve mangoServices base URL for browser requests.
 *
 * Problem:
 * - When we call `https://api.mangoswap.io/api/...` directly from the browser,
 *   that API sometimes doesn't send permissive CORS headers -> the browser blocks the request.
 *
 * Solution (for Vercel deployments):
 * - Proxy through the same origin (`/api/...`) and let `vercel.json` forward to `https://api.mangoswap.io`.
 * - We treat `api.mangoswap.io` as "proxy target" only when the app itself is served from mangoswap.io.
 */

function isProxyTargetApiOrigin(rawBase) {
  const base = String(rawBase || '').replace(/\/$/, '').toLowerCase();
  return base === 'https://api.mangoswap.io' || base === 'http://api.mangoswap.io';
}

function isRunningOnMangoOrigin() {
  if (typeof window === 'undefined') return false;
  const host = window.location.host.toLowerCase();
  return host === 'test.mangoswap.io' || host.endsWith('.mangoswap.io') || host.includes('mangoswap.io');
}

/**
 * @param {string} rawBase - from VITE_MANGO_SERVICES_URL
 * @returns {string} resolved base URL. May be '' to indicate same-origin proxy (`/api/...`).
 */
export function resolveMangoServicesBaseUrl(rawBase) {
  const normalized = String(rawBase || '').replace(/\/$/, '');
  if (!normalized) return '';
  if (isRunningOnMangoOrigin() && isProxyTargetApiOrigin(normalized)) {
    return '';
  }
  return normalized;
}

