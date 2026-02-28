/**
 * MANGO token logo that always displays (no network or path dependency).
 * Inline SVG as data URL so it works in Telegram WebView, strict CSP, and any deploy path.
 */
const MANGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
  '<defs><linearGradient id="mb" x1="0%" y1="0%" x2="0%" y2="100%">' +
  '<stop offset="0%" stop-color="#FFE135"/><stop offset="50%" stop-color="#FF8C00"/><stop offset="100%" stop-color="#E63900"/>' +
  '</linearGradient></defs>' +
  '<ellipse cx="32" cy="34" rx="26" ry="28" fill="none" stroke="#3CF902" stroke-width="5"/>' +
  '<path d="M32 8 C18 8 8 20 8 34 C8 48 18 58 32 58 C46 58 56 48 56 34 C56 20 46 8 32 8 Z" fill="url(#mb)" stroke="#1a1a1a" stroke-width="2.5"/>' +
  '<path d="M32 6 L32 2 M30 4 L34 4" stroke="#8B4513" stroke-width="1.5" stroke-linecap="round"/>' +
  '<path d="M34 8 Q44 14 42 22 Q40 18 34 12 Z" fill="#228B22" stroke="#1a1a1a" stroke-width="1"/>' +
  '<rect x="30" y="20" width="4" height="20" rx="1" fill="#1a1a1a"/></svg>';

export const MANGO_LOGO_DATA_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MANGO_SVG);
